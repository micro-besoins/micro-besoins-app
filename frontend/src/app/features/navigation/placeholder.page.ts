import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, RegisteredUser } from '../auth/auth.service';

@Component({
  selector: 'app-navigation-placeholder-page',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './placeholder.page.html',
  styleUrls: ['./placeholder.page.css', '../gigs/session-actions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationPlaceholderPage {
  protected readonly title = inject(ActivatedRoute).data.pipe(map((data) => data['title'] as string));
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly profileOpen = signal(false);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }
  protected initialsUser(): string {
    const user = this.user();
    return `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase() || '?';
  }
}
