import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell } from '@ng-icons/lucide';
import { HeaderComponent } from '../../shared/layout/header/header.component';
import { AppNotification, NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-page',
  standalone: true,
  imports: [HeaderComponent, NgIcon],
  providers: [provideIcons({ lucideBell })],
  templateUrl: './notification.page.html',
  styleUrl: './notification.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPage implements OnInit {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly notifications = this.service.notifications;
  protected readonly unreadCount = this.service.unreadCount;
  protected readonly loading = this.service.loading;
  protected readonly error = this.service.error;

  ngOnInit(): void { this.service.load(); }

  protected markAll(): void { this.service.markAllAsRead(); }

  protected open(notification: AppNotification): void {
    this.service.markAsRead(notification);
    void this.router.navigate(['/messages'], {
      queryParams: notification.conversationId ? { conversation: notification.conversationId } : {},
    });
  }

  protected sender(notification: AppNotification): string {
    return [notification.senderFirstName, notification.senderLastName].filter(Boolean).join(' ') || 'Un utilisateur';
  }

  protected label(notification: AppNotification): string {
    const topic = notification.gigTitle ? ` à propos de « ${notification.gigTitle} »` : '';
    return `${this.sender(notification)} vous a envoyé un message${topic}.`;
  }
}
