import { pool } from '../config/db';

export async function reportConversationContent(conversationId: number, reporterId: number, reason: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: conversations } = await client.query<{ id: number }>(
      `SELECT idconversation AS id
         FROM conversation
        WHERE idconversation = $1 AND (idutilisateur1 = $2 OR idutilisateur2 = $2)
        FOR KEY SHARE`,
      [conversationId, reporterId],
    );
    if (!conversations[0]) throw new Error('Conversation introuvable.');

    const { rows: messages } = await client.query<{ id: number }>(
      `SELECT idmessage AS id
         FROM message
        WHERE idconversation = $1 AND idutilisateur <> $2
        ORDER BY dateenvoi DESC, idmessage DESC
        LIMIT 1`,
      [conversationId, reporterId],
    );
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO signalement_message (idconversation, idmessage, idutilisateur, motif)
       VALUES ($1, $2, $3, $4)
       RETURNING idsignalementmessage AS id`,
      [conversationId, messages[0]?.id ?? null, reporterId, reason],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
