import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';

const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const testSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const testEmail = `mb-25-${testSuffix}@example.com`;
const unknownEmail = `mb-25-inconnu-${testSuffix}@example.com`;
const testPassword = 'MotDePasse-Integration-25';
const database = new Pool({ connectionString: process.env.DATABASE_URL });

type ApiResponse = { status: number; body: Record<string, unknown> };

let createdUser: { id: number; email: string; role: string } | undefined;
let token = '';

// Envoie une requête HTTP réelle vers l'API locale.
async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, options);
  } catch (error) {
    throw new Error(
      `API inaccessible sur ${apiBaseUrl}. Démarrez-la avec « npm.cmd run dev » dans le dossier backend, puis relancez les tests.`
    );
  }

  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

// Vérifie récursivement qu'aucun secret ne fuit dans une réponse.
function expectNoSecret(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(expectNoSecret);
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key.toLowerCase(), /password|motdepasse|hash/);
      expectNoSecret(child);
    }
  }
}

describe('API d’authentification MB-25', () => {
  before(async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: 'TestMB25',
        prenom: 'Integration',
        email: testEmail,
        password: testPassword,
        role: 'demandeur',
      }),
    });

    assert.equal(response.status, 201);
    const user = response.body.user as { id: number; email: string; role: string };
    assert.equal(user.email, testEmail);
    assert.equal(user.role, 'demandeur');
    assert.equal(typeof user.id, 'number');
    createdUser = user;
    expectNoSecret(response.body);
  });

  after(async () => {
    try {
      if (createdUser) {
        await database.query(
          'DELETE FROM utilisateur WHERE idUtilisateur = $1 AND email = $2',
          [createdUser.id, createdUser.email]
        );
      }
    } finally {
      await database.end();
    }
  });

  it('connecte le compte de test avec les bons identifiants', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.token, 'string');
    assert.ok((response.body.token as string).length > 0);
    const user = response.body.user as { id: number; email: string; role: string };
    assert.equal(user.id, createdUser?.id);
    assert.equal(user.email, testEmail);
    assert.equal(user.role, 'demandeur');
    expectNoSecret(response.body);
    token = response.body.token as string;
  });

  it('refuse un mauvais mot de passe', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Mauvais-mot-de-passe' }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Email ou mot de passe incorrect.');
  });

  it('refuse un email inconnu', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unknownEmail, password: testPassword }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Email ou mot de passe incorrect.');
  });

  it('refuse un mot de passe absent', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Email et mot de passe requis.');
  });

  it('refuse un email absent', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: testPassword }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Email et mot de passe requis.');
  });

  it('refuse un email et un mot de passe vides', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Email et mot de passe requis.');
  });

  it('renvoie le bon utilisateur connecté avec le token obtenu', async () => {
    const response = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    const user = response.body.user as { id: number; role: string };
    assert.equal(user.id, createdUser?.id);
    assert.equal(user.role, 'demandeur');
    expectNoSecret(response.body);
  });

  it('refuse l’accès sans token', async () => {
    const response = await request('/api/auth/me');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Authentification requise.');
  });

  it('refuse l’accès avec un token invalide', async () => {
    const response = await request('/api/auth/me', {
      headers: { Authorization: 'Bearer token-invalide' },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Token invalide ou expiré.');
  });
});
