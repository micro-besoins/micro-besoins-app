import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell, lucideBookOpen, lucideCalendarDays, lucideClipboardList, lucideCoins,
  lucideHeartHandshake, lucideMapPin, lucideMonitor, lucideSparkles, lucideSprout, lucideWrench,
} from '@ng-icons/lucide';
import { AuthService } from '../auth/auth.service';
import { HeaderComponent } from '../../shared/layout/header/header.component';

const API = 'http://localhost:3000/api';

interface MyGig {
  id: number;
  title: string;
  description: string;
  budget: string;
  publishedAt: string | null;
  requestedAt: string | null;
  status: string | null;
  category: string | null;
  location: string | null;
  proposalCount: number;
  providerFirstName: string | null;
  providerLastName: string | null;
  agreedPrice: string | null;
}

@Component({
  selector: 'app-my-needs-page',
  standalone: true,
  imports: [RouterLink, NgIcon, HeaderComponent],
  providers: [provideIcons({
    lucideBell, lucideBookOpen, lucideCalendarDays, lucideClipboardList, lucideCoins,
    lucideHeartHandshake, lucideMapPin, lucideMonitor, lucideSparkles, lucideSprout, lucideWrench,
  })],
  templateUrl: './needs.page.html',
  styleUrls: ['./needs.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyNeedsPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = signal(this.auth.currentUser());
  protected readonly gigs = signal<MyGig[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly sessionExpired = signal(false);
  protected readonly countLabel = computed(() => {
    const count = this.gigs().length;
    return `${count} besoin${count > 1 ? 's' : ''}`;
  });

  constructor() {
    if (!this.auth.token()) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.sessionExpired.set(false);
    this.http.get<{ gigs: MyGig[] }>(`${API}/gigs/mine`, { headers: { Authorization: `Bearer ${this.auth.token()}` } }).subscribe({
      next: ({ gigs }) => {
        this.gigs.set(gigs);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.sessionExpired.set(error.status === 401);
        this.error.set(error.status === 401 ? 'Votre session a expiré. Veuillez vous reconnecter.' : 'Impossible de charger vos besoins.');
        this.loading.set(false);
      },
    });
  }

  protected openDetail(id: number): void {
    void this.router.navigate(['/besoins', id]);
  }
  protected openProposals(id: number, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/besoins', id, 'propositions']);
  }

  // ---- Affichage ----
  protected initials(): string {
    const user = this.user();
    return `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase() || '?';
  }
  protected provider(gig: MyGig): string | null {
    return [gig.providerFirstName, gig.providerLastName].filter(Boolean).join(' ') || null;
  }
  protected formatDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('fr-MU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'À convenir';
  }
  protected formatBudget(value: string | number | null): string {
    return new Intl.NumberFormat('fr-MU').format(Number(value));
  }
  protected statusLabel(status: string | null): string {
    return status === 'EN_ATTENTE' ? 'En attente de validation' : status === 'REFUSE' ? 'Refusé' : 'Publié';
  }
  protected statusClass(status: string | null): string {
    return status === 'EN_ATTENTE' ? 'attente' : status === 'REFUSE' ? 'refuse' : 'valide';
  }
  protected categoryIcon(category: string | null): string {
    const key = (category ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (key.includes('cours')) return 'lucideBookOpen';
    if (key.includes('travaux') || key.includes('bricol')) return 'lucideWrench';
    if (key.includes('nettoy')) return 'lucideSparkles';
    if (key.includes('jardin')) return 'lucideSprout';
    if (key.includes('informatique')) return 'lucideMonitor';
    if (key.includes('domicile')) return 'lucideHeartHandshake';
    return 'lucideClipboardList';
  }
}