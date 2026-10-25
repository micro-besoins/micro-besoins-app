import { NextFunction, Request, Response } from 'express';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification.service';

// Renvoie l'id de l'utilisateur connecté, ou répond 401 et renvoie null
function currentUserId(req: Request, res: Response): number | null {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Authentification requise.' });
    return null;
  }
  return id;
}

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;
    const [notifications, unreadCount] = await Promise.all([listNotifications(userId), countUnreadNotifications(userId)]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;
    res.json({ unreadCount: await countUnreadNotifications(userId) });
  } catch (error) {
    next(error);
  }
}

export async function readNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 'INVALID_PARAMETER', message: 'Identifiant de notification invalide.' });
      return;
    }
    if (!(await markNotificationAsRead(userId, id))) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Notification introuvable.' });
      return;
    }
    res.json({ id, read: true });
  } catch (error) {
    next(error);
  }
}

export async function readAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;
    res.json({ updated: await markAllNotificationsAsRead(userId) });
  } catch (error) {
    next(error);
  }
}
