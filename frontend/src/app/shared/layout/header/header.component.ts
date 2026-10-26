import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, RegisteredUser } from '../../../features/auth/auth.service';
import { isAdminUser } from '../../../features/auth/admin-role';
import { NotificationBell } from '../../../features/notification/notification-bell';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly isAdmin = isAdminUser(this.auth);
  protected readonly profileOpen = signal(false);

  protected toggleProfile() { this.profileOpen.update(open => !open); }
  
  protected logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  protected goToAdmin() {
    this.profileOpen.set(false);
    void this.router.navigateByUrl('/admin');
  }

  protected goToProfile() {
    this.profileOpen.set(false);
    void this.router.navigateByUrl('/mon-profil');
  }

  protected changeProfile() {
    this.profileOpen.set(false);
    void this.router.navigate(['/mon-profil'], { queryParams: { edit: true } });
  } 

  protected initials(firstName: string | null, lastName: string | null): string {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }
}
