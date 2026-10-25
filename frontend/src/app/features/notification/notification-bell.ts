import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell } from '@ng-icons/lucide';
import { AppNotification, NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ lucideBell })],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class NotificationBell implements OnInit, OnDestroy {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);
  protected readonly notifications = this.service.notifications;
  protected readonly unreadCount = this.service.unreadCount;
  protected readonly loading = this.service.loading;
  protected readonly error = this.service.error;
  protected readonly badge = computed(() => (this.unreadCount() > 99 ? '99+' : String(this.unreadCount())));

  ngOnInit(): void { this.service.startPolling(); }
  ngOnDestroy(): void { this.service.stopPolling(); }

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.service.load();
  }

  close(): void { this.open.set(false); }

  onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  // Marque la notification comme lue puis ouvre la conversation concernée
  protected openNotification(notification: AppNotification): void {
    this.service.markAsRead(notification);
    this.close();
    void this.router.navigate(['/messages'], {
      queryParams: notification.conversationId ? { conversation: notification.conversationId } : {},
    });
  }

  protected markAll(): void { this.service.markAllAsRead(); }

  protected sender(notification: AppNotification): string {
    return [notification.senderFirstName, notification.senderLastName].filter(Boolean).join(' ') || 'Un utilisateur';
  }

  // Aujourd'hui : l'heure seule. Avant : la date et l'heure.
  protected formatTime(date: string): string {
    const value = new Date(date);
    const today = value.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat('fr-MU', today ? { timeStyle: 'short' } : { dateStyle: 'medium', timeStyle: 'short' }).format(value);
  }
}
