import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/db';
import { pool as adminPool } from '../src/db/pool';
import { env } from '../src/config/env';

// Vraies requêtes HTTP et PostgreSQL. Seules les données créées ici sont supprimées.
describe('Gestion des propositions reçues', () => {
  let server: Server;
  let base: string;
  const users: number[] = [];
  const gigs: number[] = [];
  let proposals: number[] = [];
  const token = (index: number) => jwt.sign({ id: users[index], role: 'demandeur' }, env.jwtSecret, { expiresIn: '5m' });
  async function request(path: string, user = 0, method = 'GET', body?: unknown) {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token(user)}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  }
  const offer = { amount: 1200.50, availability: 'Samedi matin', message: 'Je peux réaliser ce service avec mon matériel.' };

  before(async () => {
    for (let i = 0; i < 4; i++) {
      const result = await pool.query(`INSERT INTO utilisateur (nom, prenom, email, motdepasse, roleutilisateur)
        VALUES ('TestPropositions', $1, $2, 'test-non-connectable', 'demandeur') RETURNING idutilisateur`, [`Test${i}`, `proposals-${Date.now()}-${i}@example.com`]);
      users.push(result.rows[0].idutilisateur);
    }
    for (let i = 0; i < 3; i++) {
      const result = await pool.query(`INSERT INTO gig (titre, description, budget, statusgig, idutilisateur, datepublication)
        VALUES ('Test gestion propositions', 'Besoin temporaire de test', 1500, 'VALIDE', $1, NOW()) RETURNING idgig`, [users[0]]);
      gigs.push(result.rows[0].idgig);
    }
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/gigs`;
  });
  after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    try {
      await pool.query('DELETE FROM gig WHERE idgig = ANY($1::int[])', [gigs]);
      await pool.query('DELETE FROM utilisateur WHERE idutilisateur = ANY($1::int[])', [users]);
    } finally { await Promise.all([pool.end(), adminPool.end()]); }
  });

  it('exige une authentification et réserve la liste au propriétaire', async () => {
    assert.equal((await fetch(`${base}/${gigs[0]}/proposals`)).status, 401);
    assert.equal((await request(`/${gigs[0]}/proposals`, 3)).status, 403);
    const empty = await request(`/${gigs[0]}/proposals`);
    assert.equal(empty.status, 200); assert.deepEqual(empty.body.proposals, []);
  });
  it('valide la soumission, interdit les doublons et persiste les champs', async () => {
    assert.equal((await request(`/${gigs[0]}/proposals`, 0, 'POST', offer)).status, 403);
    assert.equal((await request(`/${gigs[0]}/proposals`, 1, 'POST', { ...offer, amount: -1 })).status, 400);
    assert.equal((await request(`/${gigs[0]}/proposals`, 1, 'POST', { ...offer, availability: ' ' })).status, 400);
    assert.equal((await request(`/${gigs[0]}/proposals`, 1, 'POST', offer)).status, 201);
    assert.equal((await request(`/${gigs[0]}/proposals`, 1, 'POST', offer)).status, 409);
    assert.equal((await request(`/${gigs[0]}/proposals`, 2, 'POST', { ...offer, amount: 1400 })).status, 201);
    const list = await request(`/${gigs[0]}/proposals`);
    proposals = list.body.proposals.map((p: any) => p.id);
    assert.equal(list.body.proposals.length, 2);
    assert.equal(list.body.proposals[0].availability, offer.availability);
    assert.equal(list.body.proposals[0].message, offer.message);
    assert.equal(list.body.proposals[0].status, 'EN_ATTENTE');
    const detail = await request(`/${gigs[0]}`, 1);
    assert.equal(detail.body.gig.hasProposed, true);
  });
  it('expose uniquement les informations publiques du prestataire', async () => {
    const result = await request(`/profiles/${users[1]}`);
    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(result.body.profile).sort(), ['acceptedCount', 'firstName', 'id', 'lastName']);
  });
  it('empêche un tiers de décider et vérifie le rattachement au besoin', async () => {
    assert.equal((await request(`/${gigs[0]}/proposals/${proposals[0]}`, 3, 'PATCH', { decision: 'accept' })).status, 403);
    assert.equal((await request(`/${gigs[1]}/proposals/${proposals[0]}`, 0, 'PATCH', { decision: 'accept' })).status, 404);
    assert.equal((await request(`/${gigs[0]}/proposals/${proposals[0]}`, 0, 'PATCH', { decision: 'unknown' })).status, 400);
  });
  it('accepte une seule proposition, même avec deux requêtes simultanées', async () => {
    const results = await Promise.all(proposals.map(id => request(`/${gigs[0]}/proposals/${id}`, 0, 'PATCH', { decision: 'accept' })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const list = (await request(`/${gigs[0]}/proposals`)).body.proposals;
    assert.equal(list.filter((p: any) => p.status === 'ACCEPTEE').length, 1);
    assert.equal(list.filter((p: any) => p.status === 'REFUSEE').length, 1);
    assert.equal((await request(`/${gigs[0]}`)).body.gig.status, 'EN_COURS');
    assert.ok((await request('/')).body.gigs.some((g: any) => g.id === gigs[0]));
    assert.equal((await request(`/${gigs[0]}/proposals`, 3, 'POST', offer)).status, 409);
  });
  it('refuse une proposition sans fermer le besoin et empêche une seconde décision', async () => {
    assert.equal((await request(`/${gigs[1]}/proposals`, 1, 'POST', offer)).status, 201);
    const id = (await request(`/${gigs[1]}/proposals`)).body.proposals[0].id;
    const result = await request(`/${gigs[1]}/proposals/${id}`, 0, 'PATCH', { decision: 'refuse' });
    assert.equal(result.status, 200); assert.equal(result.body.gigStatus, 'VALIDE');
    assert.equal(result.body.proposals[0].status, 'REFUSEE');
    assert.equal((await request(`/${gigs[1]}/proposals/${id}`, 0, 'PATCH', { decision: 'accept' })).status, 409);
    assert.equal((await request(`/${gigs[1]}/proposals`)).body.proposals[0].status, 'REFUSEE');
  });
});
