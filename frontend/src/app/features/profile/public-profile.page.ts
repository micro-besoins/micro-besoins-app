import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, of, Subject, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin } from '@ng-icons/lucide';

interface Stats { completedCount: number; reviewCount: number; averageRating: number | null; }
interface Review { id: number; rating: number; comment: string | null; createdAt: string | null; }
interface Activity { id: number; title: string; category: string | null; completedAt: string | null; role: string; reviews: Review[]; }
interface PublicProfile {
  id: number; firstName: string; lastName: string; publicName: string; location: string | null;
  biography: string | null; joinedAt: string | null; skills: string[];
  provider: Stats; requester: Stats; activities: Activity[];
}

@Component({
  selector: 'app-public-profile', standalone: true, imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideMapPin })],
  templateUrl: './public-profile.page.html', styleUrl: './public-profile.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProfilePage {
  readonly profileId = input<number | null>(null);
  readonly editable = input(false);
  readonly refreshVersion = input(0);
  readonly editRequested = output<void>();
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly refresh = new Subject<void>();
  private readonly auth = inject(AuthService);
  protected get user() { return this.auth.currentUser(); }
  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly role = signal<'prestataire' | 'demandeur'>('prestataire');
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly activities = computed(() => this.profile()?.activities.filter((item) => item.role === this.role()) ?? []);
  protected readonly stats = computed(() => this.role() === 'prestataire' ? this.profile()?.provider : this.profile()?.requester);
  constructor() {
    combineLatest([this.route.paramMap, this.refresh.pipe(startWith(undefined)), toObservable(this.profileId), toObservable(this.refreshVersion)]).pipe(
      tap(() => { this.loading.set(true); this.error.set(''); this.profile.set(null); this.role.set('prestataire'); }),
      switchMap(([params, , profileId]) => this.http.get<{ profile: PublicProfile }>(`http://localhost:3000/api/users/${encodeURIComponent(profileId ?? params.get('id') ?? '')}/public`).pipe(
        catchError((error: HttpErrorResponse) => {
          this.error.set(error.status === 404 ? 'Profil introuvable.' : error.status === 400 ? 'Identifiant de profil invalide.' : 'Impossible de charger ce profil. Veuillez réessayer.');
          return of(null);
        }))), takeUntilDestroyed(),
    ).subscribe((result) => { this.profile.set(result?.profile ?? null); this.loading.set(false); });
  }
  protected reload(): void { this.refresh.next(); }
  protected initials(first: string, last: string): string { return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase(); }
  protected date(value: string, monthOnly = false): string {
    return new Intl.DateTimeFormat('fr-FR', monthOnly ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }
  protected rating(value: number | null | undefined): string { return value == null ? '—' : value.toFixed(1); }
}

