import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db';

// Usage : npm run seed:proposal -- <identifiant du compte qui envoie la proposition>
async function main() {
  const senderId = Number(process.argv[2]);
  if (!Number.isSafeInteger(senderId) || senderId <= 0) {
    throw new Error('Précisez le compte destinataire : npm run seed:proposal -- <id-utilisateur>');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sender = await client.query('SELECT prenom, nom FROM utilisateur WHERE idutilisateur = $1', [senderId]);
    if (!sender.rowCount) throw new Error('Ce compte utilisateur n’existe pas.');

    // Aucun mot de passe de démonstration partagé ou utilisable pour se connecter.
    const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    await client.query(
      `INSERT INTO utilisateur (prenom, nom, email, motdepasse, roleutilisateur)
       VALUES ('Kevin', 'Ramdass', 'kevin.proposals-demo@example.test', $1, 'demandeur')
       ON CONFLICT (email) DO NOTHING`, [hash]
    );
    const owner = await client.query('SELECT idutilisateur AS id FROM utilisateur WHERE email = $1', ['kevin.proposals-demo@example.test']);
    const ownerId = owner.rows[0].id;
    if (ownerId === senderId) throw new Error('Choisissez un compte différent du demandeur fictif.');
    let gig = await client.query(
      'SELECT idgig AS id FROM gig WHERE idutilisateur = $1 AND titre = $2 ORDER BY idgig LIMIT 1',
      [ownerId, 'Cours de mathématiques niveau Form 4']
    );
    if (!gig.rowCount) {
      gig = await client.query(
        `INSERT INTO gig (titre, description, budget, datepublication, datemodification,
                          statusgig, categorie, localite, datesouhaitee, idutilisateur)
         VALUES ('Cours de mathématiques niveau Form 4',
                 '[DÉMONSTRATION] Besoin fictif pour tester la page Mes propositions. Cours de mathématiques, mercredi après 16 h.',
                 650, NOW(), NOW(), 'VALIDE', 'Cours particuliers', 'Quatre Bornes',
                 CURRENT_DATE + INTERVAL '7 days 16 hours', $1)
         RETURNING idgig AS id`, [ownerId]
      );
    }
    const gigId = gig.rows[0].id;
    const existing = await client.query(
      `SELECT idreponse AS id FROM reponse
       WHERE idutilisateur = $1 AND idgig = $2 AND statusreponse = 'EN_ATTENTE'`, [senderId, gigId]
    );
    let proposalId = existing.rows[0]?.id;
    if (!proposalId) {
      const proposal = await client.query(
        `INSERT INTO reponse (contenu, prixpropose, datereponse, statusreponse, idutilisateur, idgig)
         VALUES ('[DÉMONSTRATION] Je propose des cours de mathématiques et suis disponible mercredi après 16 h.',
                 650, NOW(), 'EN_ATTENTE', $1, $2) RETURNING idreponse AS id`, [senderId, gigId]
      );
      proposalId = proposal.rows[0].id;
    }
    await client.query('COMMIT');
    console.log(`Proposition fictive n°${proposalId} disponible pour ${sender.rows[0].prenom} ${sender.rows[0].nom} : Rs 650, En attente.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
