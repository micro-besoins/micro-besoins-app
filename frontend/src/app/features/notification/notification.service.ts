import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface AppNotification {
  id: number;
  type: string;
  read: boolean;
  createdAt: string;
  conversationId: number | null;
  gigId: number | null;
  gigTitle: string | null;
  senderId: number | null;
  senderFirstName: string | null;
  senderLastName: string | null;
}

const API_URL = 'http://localhost:3000/api/notifications';
const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  private polling: Subscription | null = null;
  private ownerId: number | null = null;

  // Vérifie le nombre de non lues toutes les 30 secondes (et tout de suite au démarrage)
  startPolling(): void {
    if (!this.auth.token()) return;

    // Autre utilisateur connecté depuis la dernière fois : on repart de zéro
    const userId = this.auth.currentUser()?.id ?? null;
    if (userId !== this.ownerId) {
      this.ownerId = userId;
      this.notifications.set([]);
      this.unreadCount.set(0);
    }

    if (this.polling) return;
    this.polling = timer(0, POLL_INTERVAL_MS).subscribe(() => this.refreshCount());
  }

  stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = null;
  }

  refreshCount(): void {
    this.http.get<{ unreadCount: number }>(`${API_URL}/unread-count`, { headers: this.headers() }).subscribe({
      next: ({ unreadCount }) => this.unreadCount.set(unreadCount),
      error: () => { /* silencieux : le badge garde sa dernière valeur */ },
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<{ notifications: AppNotification[]; unreadCount: number }>(API_URL, { headers: this.headers() }).subscribe({
      next: ({ notifications, unreadCount }) => {
        this.notifications.set(notifications);
        this.unreadCount.set(unreadCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les notifications.');
        this.loading.set(false);
      },
    });
  }

  markAsRead(notification: AppNotification): void {
    if (notification.read) return;
    // L'écran est mis à jour tout de suite, l'API confirme ensuite
    this.notifications.update((list) => list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    this.unreadCount.update((count) => Math.max(0, count - 1));
    this.http.patch(`${API_URL}/${notification.id}/read`, {}, { headers: this.headers() }).subscribe({
      error: () => this.load(),
    });
  }

  markAllAsRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.unreadCount.set(0);
    this.http.patch(`${API_URL}/read-all`, {}, { headers: this.headers() }).subscribe({
      error: () => this.load(),
    });
  }

  private headers() {
    return { Authorization: `Bearer ${this.auth.token()}` };
  }
}
