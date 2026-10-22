import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideBookOpen, lucideCalendarDays, lucideCoins, lucideMapPin, lucideSparkles, lucideSprout, lucideWrench } from '@ng-icons/lucide';
import { isAdminUser } from '../auth/admin-role';
import { AuthService, RegisteredUser } from '../auth/auth.service';

interface Gig {
  id: number;
  title: string;
  description: string;
  budget: string;
  publishedAt: string | null;
  requestedAt: string | null;
  status: string | null;
  category: string | null;
  location: string | null;
  ownerId: number | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  proposalCount: number;
}

interface FilterOptions { categories: string[]; locations: string[]; budgets: string[]; }

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIcon],
  providers: [provideIcons({ lucideBell, lucideBookOpen, lucideCalendarDays, lucideCoins, lucideMapPin, lucideSparkles, lucideSprout, lucideWrench })],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly isAdmin = isAdminUser(this.auth);
  protected readonly profileOpen = signal(false);
  protected readonly gigs = signal<Gig[]>([]);
  protected readonly filters = signal<FilterOptions>({ categories: [], locations: [], budgets: [] });
  protected readonly budgetRanges = [
    { value: 'under-1000', label: 'Moins de Rs 1 000' },
    { value: '1000-2000', label: 'Rs 1 000 – 2 000' },
    { value: 'over-2000', label: 'Plus de Rs 2 000' },
  ];
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly keyword = signal('');
  protected readonly category = signal('');
  protected readonly location = signal('');
  protected readonly budget = signal('');
  protected readonly sort = signal<'recent' | 'budget-asc' | 'budget-desc'>('recent');
  protected readonly countLabel = computed(() => `${this.gigs().length} annonce${this.gigs().length > 1 ? 's' : ''}`);

  constructor() {
    if (!this.auth.token()) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }
    this.http.get<FilterOptions>('http://localhost:3000/api/gigs/filter-options', { headers: this.headers() }).subscribe({
      next: (options) => this.filters.set(options),
      error: () => this.error.set('Impossible de charger les filtres.'),
    });
    this.search();
  }

  protected search(): void {
    this.loading.set(true);
    this.error.set('');
    let params = new HttpParams();
    const entries = { q: this.keyword(), category: this.category(), location: this.location(), budget: this.budget() };
    Object.entries(entries).forEach(([key, value]) => { if (value) params = params.set(key, value); });
    this.http.get<{ gigs: Gig[] }>('http://localhost:3000/api/gigs', { headers: this.headers(), params }).subscribe({
      next: ({ gigs }) => { this.gigs.set(this.sortGigs(gigs)); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les besoins.'); this.loading.set(false); },
    });
  }

  protected reset(): void {
    this.keyword.set(''); this.category.set(''); this.location.set(''); this.budget.set('');
    this.search();
  }

  protected changeSort(value: 'recent' | 'budget-asc' | 'budget-desc'): void {
    this.sort.set(value);
    this.gigs.update((gigs) => this.sortGigs(gigs));
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  protected goToAdmin(): void {
    this.profileOpen.set(false);
    void this.router.navigateByUrl('/admin');
  }

  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }

  protected initials(firstName: string | null, lastName: string | null): string {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  protected owner(gig: Gig): string { return [gig.ownerFirstName, gig.ownerLastName].filter(Boolean).join(' ') || 'Utilisateur inconnu'; }
  protected categoryIcon(category: string | null): string {
    return category === 'Jardinage' ? 'lucideSprout' : category === 'Cours particuliers' ? 'lucideBookOpen' : category === 'Nettoyage' ? 'lucideSparkles' : 'lucideWrench';
  }
  protected formatBudget(budget: string): string { return new Intl.NumberFormat('fr-MU').format(Number(budget)); }
  protected formatDate(date: string | null): string { return date ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'medium' }).format(new Date(date)) : 'Date non renseignée'; }
  private sortGigs(gigs: Gig[]): Gig[] {
    return [...gigs].sort((first, second) => {
      if (this.sort() === 'budget-asc') return Number(first.budget) - Number(second.budget);
      if (this.sort() === 'budget-desc') return Number(second.budget) - Number(first.budget);
      return new Date(second.publishedAt ?? 0).getTime() - new Date(first.publishedAt ?? 0).getTime();
    });
  }
  private headers() { return { Authorization: `Bearer ${this.auth.token()}` }; }
}