import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/db';
import { env } from '../src/config/env';

// Utiliser la base locale de développement : fixtures dédiées supprimées après les tests.
describe('Proposer mes services — API et PostgreSQL', () => {
  let server: ReturnType<typeof app.listen>;
  let base = '';
  let ownerId: number;
  let providerId: number;
  let outsiderId: number;
  let gigId: number;
  let pendingId: number;
  const users: number[] = [];
  const token = (id: number) => jwt.sign({ id, role: 'prospect' }, env.jwtSecret, { expiresIn: '5m' });
  const payload = { message: 'Je dispose du matériel nécessaire.', price: 1200.50, availability: 'Samedi de 8 h à 12 h' };
  const send = async (id: number, input: unknown = payload, target = gigId) => {
    const response = await fetch(`${base}/api/gigs/${target}/proposals`, { method: 'POST', headers: { Authorization: `Bearer ${token(id)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    return { status: response.status, body: await response.json() as any };
  };
  before(async () => {
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.databaseUrl).hostname), 'Ces tests doivent utiliser une base PostgreSQL locale.');
    await pool.query(readFileSync('src/db/ajout-propositions.sql', 'utf8'));
    for (const name of ['owner', 'provider', 'outsider']) {
      const { rows } = await pool.query(`INSERT INTO utilisateur (nom, prenom, email, motdepasse, roleutilisateur) VALUES ('TestProposition', $1, $2, 'fixture-inutilisable', 'prospect') RETURNING idutilisateur`, [name, `proposal-${name}-${Date.now()}@example.com`]);
      users.push(rows[0].idutilisateur);
    }
    [ownerId, providerId, outsiderId] = users;
    for (const status of ['VALIDE', 'EN_ATTENTE']) {
      const { rows } = await pool.query(`INSERT INTO gig (titre, description, budget, statusgig, idutilisateur, categorie, localite) VALUES ('Test proposition', 'Fixture test', 1500, $1, $2, 'Petits travaux', 'Moka') RETURNING idgig`, [status, ownerId]);
      if (status === 'VALIDE') gigId = rows[0].idgig; else pendingId = rows[0].idgig;
    }
    await new Promise<void>((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    base = `http://127.0.0.1:${address.port}`;
  });
  after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    try { if (users.length) await pool.query('DELETE FROM utilisateur WHERE idutilisateur = ANY($1::int[])', [users]); }
    finally { await pool.end(); }
  });
  it('exige une authentification', async () => {
    assert.equal((await fetch(`${base}/api/proposals`)).status, 401);
    assert.equal((await fetch(`${base}/api/gigs/${gigId}/proposals`, { method: 'POST' })).status, 401);
  });
  it('refuse son propre besoin et les besoins non disponibles', async () => {
    assert.equal((await send(ownerId)).status, 403);
    assert.equal((await send(providerId, payload, pendingId)).status, 409);
    assert.equal((await send(providerId, payload, 2147483647)).status, 404);
  });
  it('valide les champs et la précision du tarif côté API', async () => {
    for (const input of [{ ...payload, message: '   ' }, { ...payload, availability: '' }, { ...payload, price: 0 }, { ...payload, price: 100000 }, { ...payload, price: 1.234 }, { ...payload, price: '1200' }, { ...payload, availability: 'a'.repeat(501) }]) {
      assert.equal((await send(providerId, input)).status, 400);
    }
  });
  it('enregistre une seule proposition lors de deux envois simultanés', async () => {
    const results = await Promise.all([send(providerId), send(providerId)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const saved = results.find((r) => r.status === 201)!.body.proposal;
    assert.equal(saved.message, payload.message);
    assert.equal(saved.price, '1200.50');
    assert.equal(saved.availability, payload.availability);
    assert.equal(saved.status, 'EN_ATTENTE');
  });
  it('affiche la proposition persistée uniquement dans la liste du prestataire', async () => {
    const list = async (id: number) => (await fetch(`${base}/api/proposals`, { headers: { Authorization: `Bearer ${token(id)}` } })).json() as Promise<any>;
    const { proposals } = await list(providerId);
    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].gigId, gigId);
    assert.equal(proposals[0].availability, payload.availability);
    assert.equal((await list(outsiderId)).proposals.length, 0);
    assert.equal((await list(ownerId)).proposals.length, 0);
  });
  it('conserve Proposition envoyée au rechargement, avec les filtres actifs', async () => {
    const response = await fetch(`${base}/api/gigs?q=Test%20proposition&category=Petits%20travaux&location=Moka&budget=1000-2000`, { headers: { Authorization: `Bearer ${token(providerId)}` } });
    assert.equal(response.status, 200);
    const { gigs } = await response.json() as any;
    const gig = gigs.find((g: any) => g.id === gigId);
    assert.equal(gig.hasProposed, true);
    assert.equal(gig.proposalCount, 1);
  });
});
