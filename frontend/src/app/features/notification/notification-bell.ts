import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell } from '@ng-icons/lucide';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ lucideBell })],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell implements OnInit, OnDestroy {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly unreadCount = this.service.unreadCount;
  protected readonly badge = computed(() => (this.unreadCount() > 99 ? '99+' : String(this.unreadCount())));

  ngOnInit(): void { this.service.startPolling(); }
  ngOnDestroy(): void { this.service.stopPolling(); }

  protected openNotifications(): void { void this.router.navigateByUrl('/notifications'); }
}
