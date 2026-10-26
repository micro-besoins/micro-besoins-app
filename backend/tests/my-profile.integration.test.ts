import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Pool } from 'pg';
import type { Server } from 'node:http';
import { readFile } from 'node:fs/promises';
let pool: Pool;
let database: Pool;
const connectionString = process.env.TEST_DATABASE_URL;
const schema = `my_profile_test_${Date.now()}`;

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emails = [`profil-${suffix}@example.com`, `autre-${suffix}@example.com`];
const ids: number[] = [];
let token = '';
let otherToken = '';
let base = '';
let server: Server;
const input = { nom: 'Laurent', prenom: 'Sophie', email: emails[0], publicName: 'Sophie L.', location: 'Quatre Bornes', bio: 'Aide en français et en organisation.' };

async function request(path: string, method = 'GET', body?: unknown, bearer = token) {
  const response = await fetch(`${base}${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() as any };
}

describe('Mon profil : API et persistance PostgreSQL', { skip: !connectionString }, () => {
  before(async () => {
    database = new Pool({ connectionString });
    await database.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    process.env.DATABASE_URL = url.toString();
    ({ pool } = await import('../src/config/db'));
    await pool.query(await readFile(new URL('../../MicroBesoins.sql', import.meta.url), 'utf8'));
    await pool.query('ALTER TABLE gig ADD COLUMN categorie VARCHAR(50)');
    await pool.query(await readFile(new URL('../src/db/ajout-profil-public.sql', import.meta.url), 'utf8'));
    const migration = await readFile(new URL('../src/db/ajout-profil.sql', import.meta.url), 'utf8');
    await pool.query(migration); await pool.query(migration);
    const { default: app } = await import('../src/app');
    server = app.listen(0, '127.0.0.1');
    if (!server.listening) await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const email of emails) {
      const registered = await request('/api/auth/register', 'POST', { nom: 'TestProfil', prenom: 'Integration', email, password: 'Profil-Test-2026!', role: 'demandeur' }, '');
      assert.equal(registered.status, 201); ids.push(registered.body.user.id);
      const login = await request('/api/auth/login', 'POST', { email, password: 'Profil-Test-2026!' }, '');
      assert.equal(login.status, 200);
      if (!token) token = login.body.token; else otherToken = login.body.token;
    }
  });
  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
    try { await database.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
    finally { await database.end(); }
  });

  it('protège lecture et modification sans token ou avec token invalide', async () => {
    for (const bearer of ['', 'invalide']) {
      for (const [path, method] of [['/api/users/me', 'GET'], ['/api/users/me', 'PUT']]) {
        assert.equal((await request(path, method, method === 'PUT' ? input : undefined, bearer)).status, 401);
      }
    }
  });
  it('lit les vraies informations sans exposer le mot de passe', async () => {
    const result = await request('/api/users/me');
    assert.equal(result.status, 200); assert.equal(result.body.profile.id, ids[0]);
    assert.equal(result.body.profile.email, emails[0]);
    assert.doesNotMatch(JSON.stringify(result.body), /motdepasse|passwordHash/);
  });
  it('valide les champs sans modifier la base', async () => {
    for (const change of [{ publicName: '  ' }, { location: '' }, { nom: 'x'.repeat(21) }, { prenom: 123 }, { bio: 'x'.repeat(1001) }, { email: 'incorrect' }]) {
      assert.equal((await request('/api/users/me', 'PUT', { ...input, ...change })).status, 400);
    }
    assert.equal((await request('/api/users/me')).body.profile.nom, 'TestProfil');
  });
  it('enregistre puis relit les modifications, sans permettre de changer de compte ou de rôle', async () => {
    const result = await request('/api/users/me', 'PUT', { ...input, id: ids[1], role: 'ADMIN' });
    assert.equal(result.status, 200);
    const saved = (await request('/api/users/me')).body.profile;
    for (const [key, value] of Object.entries(input)) assert.equal(saved[key], value);
    assert.equal(saved.id, ids[0]); assert.equal(saved.role, 'demandeur');
    const other = (await request('/api/users/me', 'GET', undefined, otherToken)).body.profile;
    assert.equal(other.id, ids[1]); assert.equal(other.nom, 'TestProfil');
    const stored = await pool.query('SELECT nompublic, biographie FROM utilisateur WHERE idutilisateur = $1', [ids[0]]);
    assert.equal(stored.rows[0].nompublic, input.publicName); assert.equal(stored.rows[0].biographie, input.bio);
    const publicProfile = await request(`/api/users/${ids[0]}/public`, 'GET', undefined, '');
    assert.equal(publicProfile.status, 200);
    assert.equal(publicProfile.body.profile.publicName, input.publicName);
    assert.equal(publicProfile.body.profile.biography, input.bio);
    assert.equal(publicProfile.body.profile.location, input.location);
    assert.equal(publicProfile.body.profile.email, undefined);
  });
  it('signale un e-mail déjà utilisé sans perdre les modifications précédentes', async () => {
    assert.equal((await request('/api/users/me', 'PUT', { ...input, email: emails[1] })).status, 409);
    assert.equal((await request('/api/users/me')).body.profile.email, emails[0]);
  });
});
