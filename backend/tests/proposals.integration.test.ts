import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/db';
import { env } from '../src/config/env';

let server: Server;
let base: string;
let ownerId: number;
let senderId: number;
let otherId: number;
let gigId: number;
let pendingId: number;
let ids: number[] = [];
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const userIds: number[] = [];
const token = (id: number) => jwt.sign({ id, sub: String(id), role: 'demandeur' }, env.jwtSecret);
async function request(path = '', userId?: number, method = 'GET') {
  const response = await fetch(`${base}/api/proposals${path}`, {
    method, headers: userId ? { Authorization: `Bearer ${token(userId)}` } : {}, signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() as any };
}

describe('Mes propositions : API et persistance PostgreSQL', () => {
  before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const name of ['Owner', 'Sender', 'Other']) {
      const { rows } = await pool.query(
        `INSERT INTO utilisateur (nom, prenom, email, motdepasse, roleutilisateur)
         VALUES ('Test', $1, $2, 'not-a-login-hash', 'demandeur') RETURNING idutilisateur AS id`,
        [name, `${name}-${suffix}@example.com`]
      );
      userIds.push(rows[0].id);
    }
    [ownerId, senderId, otherId] = userIds;
    const gig = await pool.query(
      `INSERT INTO gig (titre, description, budget, datepublication, statusgig, idutilisateur)
       VALUES ('Cours de mathématiques niveau Form 4', 'Un besoin pour les tests.', 650, NOW(), 'VALIDE', $1)
       RETURNING idgig AS id`, [ownerId]
    );
    gigId = gig.rows[0].id;
    for (const status of ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'RETIREE']) {
      const { rows } = await pool.query(
        `INSERT INTO reponse (contenu, prixpropose, datereponse, statusreponse, idutilisateur, idgig)
         VALUES ('Disponible mercredi après 16 h', 650, NOW(), $1, $2, $3) RETURNING idreponse AS id`,
        [status, senderId, gigId]
      );
      ids.push(rows[0].id);
    }
    pendingId = ids[0];
  });
  after(async () => {
    if (userIds.length) await pool.query('DELETE FROM utilisateur WHERE idutilisateur = ANY($1::int[])', [userIds]);
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    await pool.end();
  });

  it('exige une authentification sur toutes les routes', async () => {
    for (const [path, method] of [['', 'GET'], [`/${pendingId}/need`, 'GET'], [`/${pendingId}/profile`, 'GET'], [`/${pendingId}/withdraw`, 'PATCH']]) {
      assert.equal((await request(path, undefined, method)).status, 401);
    }
  });
  it('liste uniquement les propositions envoyées par le compte connecté et les quatre statuts', async () => {
    const { status, body } = await request('', senderId);
    assert.equal(status, 200);
    assert.equal(body.proposals.length, 4);
    assert.deepEqual(new Set(body.proposals.map((p: any) => p.status)), new Set(['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'RETIREE']));
    const proposal = body.proposals.find((p: any) => p.id === pendingId);
    assert.equal(proposal.title, 'Cours de mathématiques niveau Form 4');
    assert.equal(Number(proposal.amount), 650);
    assert.ok(proposal.sentAt);
    assert.equal(proposal.ownerFirstName, 'Owner');
    assert.deepEqual((await request('', otherId)).body.proposals, []);
    assert.deepEqual((await request('', ownerId)).body.proposals, []);
  });
  it('consulte le besoin lié et un profil sans exposer de données privées', async () => {
    const need = await request(`/${pendingId}/need`, senderId);
    assert.equal(need.status, 200);
    assert.equal(need.body.gig.id, gigId);
    assert.equal(need.body.gig.description, 'Un besoin pour les tests.');
    const profile = await request(`/${pendingId}/profile`, senderId);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.profile.firstName, 'Owner');
    assert.equal(profile.body.profile.publishedCount, 1);
    assert.doesNotMatch(JSON.stringify(profile.body), /email|motdepasse|password/i);
  });
  it('empêche un autre compte de consulter ou retirer une proposition', async () => {
    for (const [path, method] of [[`/${pendingId}/need`, 'GET'], [`/${pendingId}/profile`, 'GET'], [`/${pendingId}/withdraw`, 'PATCH']]) {
      assert.equal((await request(path, otherId, method)).status, 404);
    }
  });
  it('refuse les identifiants invalides et inconnus', async () => {
    assert.equal((await request('/abc/need', senderId)).status, 400);
    assert.equal((await request('/0/withdraw', senderId, 'PATCH')).status, 400);
    assert.equal((await request('/2147483647/need', senderId)).status, 404);
  });
  it('refuse le retrait des propositions acceptées, refusées et déjà retirées', async () => {
    for (const id of ids.slice(1)) assert.equal((await request(`/${id}/withdraw`, senderId, 'PATCH')).status, 409);
  });
  it('retire atomiquement une seule fois et conserve la proposition en base et dans la liste', async () => {
    const responses = await Promise.all([request(`/${pendingId}/withdraw`, senderId, 'PATCH'), request(`/${pendingId}/withdraw`, senderId, 'PATCH')]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const persisted = await pool.query('SELECT statusreponse FROM reponse WHERE idreponse = $1', [pendingId]);
    assert.equal(persisted.rows[0].statusreponse, 'RETIREE');
    const { body } = await request('', senderId);
    assert.equal(body.proposals.length, 4);
    assert.equal(body.proposals.find((p: any) => p.id === pendingId).status, 'RETIREE');
  });
  it('conserve la consultation du besoin après sa clôture', async () => {
    await pool.query("UPDATE gig SET statusgig = 'CLOTURE' WHERE idgig = $1", [gigId]);
    assert.equal((await request(`/${pendingId}/need`, senderId)).body.gig.status, 'CLOTURE');
  });
});
