import type { Pool } from 'pg';
import { pool } from '../config/db';

export const NOTIFICATION_TYPE = {
  NEW_MESSAGE: 'NOUVEAU_MESSAGE',
} as const;

export interface NewMessageNotificationInput {
  recipientId: number;       // l'autre participant de la conversation
  senderId: number;          // l'auteur du message
  conversationId: number;
  gigId?: number | null;     // besoin concerné par la conversation
}

// Accepte `pool` ou le `client` d'une transaction en cours
type Queryable = Pick<Pool, 'query'>;

/**
 * Crée la notification « nouveau message » pour le destinataire.
 * À appeler juste après l'enregistrement du message, dans la même transaction.
 * Ne crée rien (et renvoie null) si le destinataire est l'expéditeur.
 */
export async function createMessageNotification(db: Queryable, input: NewMessageNotificationInput): Promise<number | null> {
  if (input.recipientId === input.senderId) return null;

  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO notification (idutilisateur, idexpediteur, idconversation, idgig, typenotification)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING idnotification AS id`,
    [input.recipientId, input.senderId, input.conversationId, input.gigId ?? null, NOTIFICATION_TYPE.NEW_MESSAGE]
  );
  return rows[0].id;
}

// Notifications de l'utilisateur, de la plus récente à la plus ancienne
export async function listNotifications(userId: number, limit = 50) {
  const { rows } = await pool.query(
    `SELECT n.idnotification AS id, n.typenotification AS type, n.lue AS "read",
            n.datecreation AS "createdAt", n.idconversation AS "conversationId",
            n.idgig AS "gigId", g.titre AS "gigTitle",
            n.idexpediteur AS "senderId", s.prenom AS "senderFirstName", s.nom AS "senderLastName"
     FROM notification n
     LEFT JOIN utilisateur s ON s.idutilisateur = n.idexpediteur
     LEFT JOIN gig g ON g.idgig = n.idgig
     WHERE n.idutilisateur = $1
     ORDER BY n.datecreation DESC, n.idnotification DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM notification WHERE idutilisateur = $1 AND NOT lue`,
    [userId]
  );
  return rows[0].count;
}

// false si la notification n'existe pas ou n'appartient pas à cet utilisateur
export async function markNotificationAsRead(userId: number, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE notification SET lue = TRUE WHERE idnotification = $1 AND idutilisateur = $2`,
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function markAllNotificationsAsRead(userId: number): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE notification SET lue = TRUE WHERE idutilisateur = $1 AND NOT lue`,
    [userId]
  );
  return rowCount ?? 0;
}
