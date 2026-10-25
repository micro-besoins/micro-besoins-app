import { pool } from '../config/db';
import { createMessageNotification } from './notification.service';

type ConversationRow = {
  id: number;
  gigId: number;
  title: string;
  otherUserId: number;
  otherFirstName: string;
  otherLastName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function participants(firstId: number, secondId: number): [number, number] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

export async function getOrCreateConversation(gigId: number, requesterId: number): Promise<{ id: number; created: boolean; isEmpty: boolean; title: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: gigs } = await client.query<{ ownerId: number; title: string }>(
      'SELECT idutilisateur AS "ownerId", titre AS title FROM gig WHERE idgig = $1 FOR KEY SHARE',
      [gigId],
    );
    const gig = gigs[0];
    if (!gig) throw new Error('Besoin introuvable.');
    if (Number(gig.ownerId) === Number(requesterId)) throw new Error('Vous ne pouvez pas démarrer une conversation avec vous-même.');

    const [firstUserId, secondUserId] = participants(requesterId, Number(gig.ownerId));
    const { rows } = await client.query<{ id: number; created: boolean }>(
      `INSERT INTO conversation (idgig, idutilisateur1, idutilisateur2)
       VALUES ($1, $2, $3)
       ON CONFLICT (idgig, idutilisateur1, idutilisateur2)
       DO UPDATE SET datemodification = conversation.datemodification
       RETURNING idconversation AS id, (xmax = 0) AS created`,
      [gigId, firstUserId, secondUserId],
    );
    const conversation = rows[0];
    const { rows: messageState } = await client.query<{ isEmpty: boolean }>(
      `SELECT NOT EXISTS (
         SELECT 1 FROM message WHERE idconversation = $1
       ) AS "isEmpty"`,
      [conversation.id],
    );
    await client.query('COMMIT');
    return { ...conversation, isEmpty: messageState[0].isEmpty, title: gig.title };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listConversations(userId: number): Promise<ConversationRow[]> {
  const { rows } = await pool.query<ConversationRow>(
    `SELECT c.idconversation AS id,
            c.idgig AS "gigId",
            g.titre AS title,
            other_user.idutilisateur AS "otherUserId",
            other_user.prenom AS "otherFirstName",
            other_user.nom AS "otherLastName",
            latest.contenu AS "lastMessage",
            latest.dateenvoi AS "lastMessageAt",
            COUNT(unread.idmessage)::int AS "unreadCount"
       FROM conversation c
       JOIN gig g ON g.idgig = c.idgig
       JOIN utilisateur other_user ON other_user.idutilisateur =
         CASE WHEN c.idutilisateur1 = $1 THEN c.idutilisateur2 ELSE c.idutilisateur1 END
       LEFT JOIN LATERAL (
         SELECT contenu, dateenvoi
           FROM message
          WHERE idconversation = c.idconversation
          ORDER BY dateenvoi DESC, idmessage DESC
          LIMIT 1
       ) latest ON TRUE
       LEFT JOIN message unread ON unread.idconversation = c.idconversation
                                AND unread.idutilisateur <> $1
                                AND unread.lu = FALSE
      WHERE c.idutilisateur1 = $1 OR c.idutilisateur2 = $1
      GROUP BY c.idconversation, g.idgig, other_user.idutilisateur, latest.contenu, latest.dateenvoi
      ORDER BY COALESCE(latest.dateenvoi, c.datemodification, c.datecreation) DESC, c.idconversation DESC`,
    [userId],
  );
  return rows;
}

export async function getConversationMessages(conversationId: number, userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: conversations } = await client.query(
      `SELECT c.idconversation AS id, c.idgig AS "gigId", g.titre AS title,
              CASE WHEN c.idutilisateur1 = $2 THEN c.idutilisateur2 ELSE c.idutilisateur1 END AS "otherUserId",
              u.prenom AS "otherFirstName", u.nom AS "otherLastName"
         FROM conversation c
         JOIN gig g ON g.idgig = c.idgig
         JOIN utilisateur u ON u.idutilisateur = CASE WHEN c.idutilisateur1 = $2 THEN c.idutilisateur2 ELSE c.idutilisateur1 END
        WHERE c.idconversation = $1 AND (c.idutilisateur1 = $2 OR c.idutilisateur2 = $2)`,
      [conversationId, userId],
    );
    const conversation = conversations[0];
    if (!conversation) throw new Error('Conversation introuvable.');
    await client.query(
      'UPDATE message SET lu = TRUE WHERE idconversation = $1 AND idutilisateur <> $2 AND lu = FALSE',
      [conversationId, userId],
    );
    const { rows: messages } = await client.query(
      `SELECT m.idmessage AS id, m.contenu AS content, m.dateenvoi AS "sentAt", m.idutilisateur AS "senderId",
              u.prenom AS "senderFirstName", u.nom AS "senderLastName"
         FROM message m
         JOIN utilisateur u ON u.idutilisateur = m.idutilisateur
        WHERE m.idconversation = $1
        ORDER BY m.dateenvoi ASC, m.idmessage ASC`,
      [conversationId],
    );
    await client.query('COMMIT');
    return { conversation, messages };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function sendMessage(conversationId: number, senderId: number, content: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: conversations } = await client.query<{ gigId: number; recipientId: number }>(
      `SELECT idgig AS "gigId",
              CASE WHEN idutilisateur1 = $2 THEN idutilisateur2 ELSE idutilisateur1 END AS "recipientId"
         FROM conversation
        WHERE idconversation = $1 AND (idutilisateur1 = $2 OR idutilisateur2 = $2)
        FOR UPDATE`,
      [conversationId, senderId],
    );
    const conversation = conversations[0];
    if (!conversation) throw new Error('Conversation introuvable.');

    const { rows } = await client.query(
      `INSERT INTO message (contenu, idconversation, idutilisateur)
       VALUES ($1, $2, $3)
       RETURNING idmessage AS id, contenu AS content, dateenvoi AS "sentAt", idutilisateur AS "senderId"`,
      [content, conversationId, senderId],
    );
    await client.query('UPDATE conversation SET datemodification = NOW() WHERE idconversation = $1', [conversationId]);
    await createMessageNotification(client, {
      recipientId: Number(conversation.recipientId), senderId, conversationId, gigId: Number(conversation.gigId),
    });
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
