import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell } from '@ng-icons/lucide';
import { AuthService } from '../../features/auth/auth.service';
import { isAdminUser } from '../../features/auth/admin-role';

@Component({
  selector: 'app-site-header', standalone: true, imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideBell })], templateUrl: './site-header.html', styleUrl: './site-header.css',
})
export class SiteHeader {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly user = signal(this.auth.currentUser());
  protected readonly isAdmin = isAdminUser(this.auth);
  protected readonly profileOpen = signal(false);
  protected initials(first: string | null, last: string | null) { return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'; }
  protected toggleProfile() { this.profileOpen.update(open => !open); }
  protected logout() { this.auth.logout(); void this.router.navigateByUrl('/auth/login'); }
  protected goToAdmin() { this.profileOpen.set(false); void this.router.navigateByUrl('/admin'); }
}
