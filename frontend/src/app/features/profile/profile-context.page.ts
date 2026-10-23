import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Proposal { id: number; title?: string; content: string; status: string; ownerId: number; firstName: string; lastName: string; }
interface Gig { title: string; description: string; ownerId: number; ownerFirstName: string; ownerLastName: string; isOwner: boolean; }
@Component({
  selector: 'app-profile-context', standalone: true, imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`:host{display:block;min-height:100vh;background:#f5f7fb;color:#06265a}main{max-width:1062px;margin:auto;padding:40px 20px}article,.state{background:white;border:1px solid #dfe6f0;border-radius:12px;padding:24px;margin:16px 0}a{color:#075bd8}p{line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.status{color:#60738d;font-size:13px}`],
  template: `<main><a routerLink="/">‹ Retour à l’exploration</a>
    <h1>{{ isDetail ? 'Détail du besoin' : 'Mes propositions' }}</h1>
    @if (loading()) { <p class="state" role="status">Chargement…</p> }
    @else if (error()) { <p class="state" role="alert">{{ error() }}</p> }
    @else {
      @if (gig(); as item) { <article><h2>{{ item.title }}</h2><p>{{ item.description }}</p><a [routerLink]="['/profil', item.ownerId]">Voir le profil de {{ item.ownerFirstName }} {{ item.ownerLastName }}</a></article>
        @if (item.isOwner) { <h2>Propositions reçues</h2> }
      }
      @for (proposal of proposals(); track proposal.id) { <article>
        @if (proposal.title) { <h2>{{ proposal.title }}</h2> }
        <p>{{ proposal.content }}</p><p class="status">{{ proposal.status || 'En attente' }}</p>
        <a [routerLink]="['/profil', proposal.ownerId]">Voir le profil de {{ proposal.firstName }} {{ proposal.lastName }}</a>
      </article> } @empty { @if (!isDetail || gig()?.isOwner) { <p class="state">Aucune proposition pour le moment.</p> } }
    }</main>`,
})
export class ProfileContextPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  protected readonly isDetail = this.route.snapshot.paramMap.has('id');
  protected readonly gig = signal<Gig | null>(null);
  protected readonly proposals = signal<Proposal[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    const path = this.isDetail ? `gigs/${encodeURIComponent(this.route.snapshot.paramMap.get('id')!)}` : 'proposals/mine';
    this.http.get<{ gig?: Gig; proposals: Proposal[] }>(`http://localhost:3000/api/${path}`, { headers: { Authorization: `Bearer ${this.auth.token()}` } }).pipe(takeUntilDestroyed()).subscribe({
      next: (result) => { this.gig.set(result.gig ?? null); this.proposals.set(result.proposals); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.status === 401 ? 'Connectez-vous pour consulter cette page.' : error.status === 404 ? 'Besoin introuvable.' : 'Impossible de charger les données.'); this.loading.set(false); },
    });
  }
}
