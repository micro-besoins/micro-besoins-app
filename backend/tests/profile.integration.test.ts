import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import type { Server } from 'node:http';

// Base de test explicite. Chaque exécution crée puis supprime son propre schéma.
const connectionString = process.env.TEST_DATABASE_URL;
const schema = `profile_test_${Date.now()}`;
let database: Pool;
let appPool: Pool;
let server: Server;
let base: string;
let providerId: number;
let requesterId: number;
let emptyId: number;
let completedId: number;
let visibleId: number;
const secret = 'profile-integration-test-secret';

describe('Profil public : données PostgreSQL et API HTTP', { skip: !connectionString }, () => {
  before(async () => {
    database = new Pool({ connectionString });
    await database.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    process.env.DATABASE_URL = url.toString();
    process.env.JWT_SECRET = secret;
    const { pool } = await import('../src/config/db');
    appPool = pool;
    await pool.query(await readFile(new URL('../../MicroBesoins.sql', import.meta.url), 'utf8'));
    await pool.query('ALTER TABLE gig ADD COLUMN categorie VARCHAR(50); ALTER TABLE gig ADD COLUMN localite VARCHAR(80); ALTER TABLE gig ADD COLUMN dateSouhaitee TIMESTAMP;');
    const migration = await readFile(new URL('../src/db/ajout-profil-public.sql', import.meta.url), 'utf8');
    await pool.query(migration);
    await pool.query(migration); // Migration réexécutable.
    const { rows } = await pool.query(`INSERT INTO utilisateur (nom, prenom, email, motdepasse, roleutilisateur)
      VALUES ('Ram dass', 'Kevin', 'private-provider@example.com', 'private-hash', 'prospect'),
      ('Test', 'Sophie', 'private-requester@example.com', 'private-hash', 'demandeur'),
      ('Vide', 'Profil', 'private-empty@example.com', 'private-hash', 'demandeur') RETURNING idutilisateur AS id`);
    [providerId, requesterId, emptyId] = rows.map((row) => row.id);
    await pool.query(`UPDATE utilisateur SET localite = 'Moka', biographie = 'Technicien polyvalent', competences = ARRAY['Aide informatique'] WHERE idutilisateur = $1`, [providerId]);
    const { rows: gigs } = await pool.query(`INSERT INTO gig(titre, description, budget, statusgig, idutilisateur, categorie, daterealisation)
      VALUES ('Imprimante Wi-Fi', 'Description privée non renvoyée', 1000, 'TERMINE', $1, 'Aide informatique', NOW()),
      ('Sans évaluation', 'Description', 500, 'TERMINE', $1, 'Petits travaux', NOW()),
      ('Besoin visible', 'Description', 500, 'VALIDE', $1, 'Petits travaux', NULL),
      ('Besoin refusé', 'Ne doit pas être public', 500, 'REFUSE', $1, 'Petits travaux', NULL)
      RETURNING idgig AS id`, [requesterId]);
    completedId = gigs[0].id;
    visibleId = gigs[2].id;
    await pool.query(`INSERT INTO reponse(contenu, statusreponse, idutilisateur, idgig)
      VALUES ('Acceptée', 'ACCEPTEE', $1, $2), ('Doublon accepté', 'ACCEPTEE', $1, $2),
      ('Autre service', 'ACCEPTEE', $1, $3), ('En attente', 'EN_ATTENTE', $1, $4),
      ('Refusée', 'REFUSEE', $5, $2)`, [providerId, completedId, gigs[1].id, visibleId, emptyId]);
    await pool.query(`INSERT INTO avis(note, commentaire, idutilisateur, idgig, iddestinataire, roledestinataire)
      VALUES (5, 'Très efficace et patient.', $1, $3, $2, 'prestataire'),
      (3, 'Deuxième avis', $1, $3, $2, 'prestataire'),
      (4, 'Demande claire', $2, $3, $1, 'demandeur'),
      (1, 'Auto-évaluation exclue', $2, $3, $2, 'prestataire'),
      (1, 'Tiers non participant exclu', $4, $3, $2, 'prestataire'),
      (1, 'Service non terminé exclu', $1, $5, $2, 'prestataire'),
      (1, 'Historique sans destinataire exclu', $1, $3, NULL, NULL)`, [requesterId, providerId, completedId, emptyId, visibleId]);
    const { default: app } = await import('../src/app');
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (appPool) await appPool.end();
    if (database) { await database.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await database.end(); }
  });

  const headers = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ id, role: 'demandeur' }, secret)}` });
  async function profile(id: number) {
    const response = await fetch(`${base}/api/users/${id}/public`);
    assert.equal(response.status, 200);
    return (await response.json() as any).profile;
  }

  it('renvoie seulement les champs publics, sans authentification', async () => {
    const result = await profile(providerId);
    assert.deepEqual(Object.keys(result).sort(), ['id', 'firstName', 'lastName', 'location', 'biography', 'joinedAt', 'skills', 'provider', 'requester', 'activities'].sort());
    assert.equal(result.location, 'Moka');
    assert.deepEqual(result.skills, ['Aide informatique']);
    assert.doesNotMatch(JSON.stringify(result), /private-|email|motdepasse|budget|Description privée/);
  });
  it('compte chaque service une fois et calcule les avis admissibles', async () => {
    const result = await profile(providerId);
    assert.deepEqual(result.provider, { completedCount: 2, reviewCount: 2, averageRating: 4 });
    assert.equal(result.activities.length, 2);
    assert.equal(result.activities.find((a: any) => a.id === completedId).reviews.length, 2);
  });
  it('distingue les évaluations reçues en tant que demandeur', async () => {
    const result = await profile(requesterId);
    assert.deepEqual(result.requester, { completedCount: 2, reviewCount: 1, averageRating: 4 });
    assert.equal(result.provider.reviewCount, 0);
  });
  it('gère un profil sans activité ni évaluation', async () => {
    const result = await profile(emptyId);
    assert.deepEqual(result.activities, []);
    assert.equal(result.provider.averageRating, null);
    assert.equal(result.requester.completedCount, 0);
  });
  it('valide les identifiants et distingue les profils inexistants', async () => {
    for (const id of ['-1', '0', 'abc', '1.2', '2147483648', '1%20OR%201=1']) {
      assert.equal((await fetch(`${base}/api/users/${id}/public`)).status, 400);
    }
    assert.equal((await fetch(`${base}/api/users/2147483647/public`)).status, 404);
  });
  it('protège les propositions et permet de rejoindre le profil du demandeur', async () => {
    assert.equal((await fetch(`${base}/api/proposals/mine`)).status, 401);
    const response = await fetch(`${base}/api/proposals/mine`, { headers: headers(providerId) });
    assert.equal(response.status, 200);
    const { proposals } = await response.json() as any;
    assert.equal(proposals.length, 4);
    assert.ok(proposals.every((p: any) => p.ownerId === requesterId));
  });
  it('réserve les propositions reçues au propriétaire du besoin', async () => {
    const owner = await fetch(`${base}/api/gigs/${visibleId}`, { headers: headers(requesterId) });
    const ownerBody = await owner.json() as any;
    assert.equal(ownerBody.proposals[0].ownerId, providerId);
    const visitor = await fetch(`${base}/api/gigs/${visibleId}`, { headers: headers(emptyId) });
    assert.deepEqual((await visitor.json() as any).proposals, []);
  });
});
