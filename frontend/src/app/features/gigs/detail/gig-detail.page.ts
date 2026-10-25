import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { SiteHeader } from '../../../shared/site-header/site-header';

interface Gig {
  id: number; title: string; description: string; category: string | null; location: string | null;
  budget: string; requestedAt: string | null; status: string; isOwner: boolean; hasProposed: boolean;
  ownerFirstName: string | null; ownerLastName: string | null;
}
interface Proposal {
  id: number; providerId: number; firstName: string; lastName: string; amount: string | null;
  availability: string | null; message: string; status: string; createdAt: string | null;
}
interface PublicProfile { id: number; firstName: string; lastName: string; acceptedCount: number; }

@Component({
  selector: 'app-gig-detail', standalone: true, imports: [RouterLink, FormsModule, SiteHeader],
  templateUrl: './gig-detail.page.html', styleUrl: './gig-detail.page.css', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GigDetailPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly api = 'http://localhost:3000/api/gigs';
  protected readonly gig = signal<Gig | null>(null);
  protected readonly proposals = signal<Proposal[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly busy = signal(false);
  protected readonly confirmation = signal<{ proposal: Proposal; decision: 'accept' | 'refuse' } | null>(null);
  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly profileOpen = signal(false);
  protected readonly profileLoading = signal(false);
  protected readonly profileError = signal('');
  protected readonly pendingCount = computed(() => this.proposals().filter(p => p.status === 'EN_ATTENTE').length);
  protected readonly selected = computed(() => this.proposals().find(p => p.status === 'ACCEPTEE'));
  protected readonly sort = signal('recent');
  protected readonly sortedProposals = computed(() => [...this.proposals()].sort((a, b) => {
    if (this.sort() === 'amount') return Number(a.amount ?? Infinity) - Number(b.amount ?? Infinity);
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  }));
  protected amount: number | null = null;
  protected availability = '';
  protected message = '';
  private readonly decisionDialog = viewChild<ElementRef<HTMLDialogElement>>('decisionDialog');
  private readonly profileDialog = viewChild<ElementRef<HTMLDialogElement>>('profileDialog');

  constructor() {
    effect(() => { const dialog = this.decisionDialog()?.nativeElement; if (dialog && !dialog.open) dialog.showModal(); });
    effect(() => { const dialog = this.profileDialog()?.nativeElement; if (dialog && !dialog.open) dialog.showModal(); });
    this.load();
  }

  protected load() {
    this.loading.set(true); this.error.set('');
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<{ gig: Gig }>(`${this.api}/${id}`).pipe(switchMap(({ gig }) => {
      this.gig.set(gig);
      return gig.isOwner ? this.http.get<{ proposals: Proposal[] }>(`${this.api}/${gig.id}/proposals`) : Promise.resolve({ proposals: [] });
    })).subscribe({
      next: ({ proposals }) => { this.proposals.set(proposals); this.loading.set(false); },
      error: e => { this.error.set(e.error?.message || 'Impossible de charger ce besoin.'); this.loading.set(false); },
    });
  }

  protected confirm() {
    const action = this.confirmation(); const gig = this.gig();
    if (!action || !gig || this.busy()) return;
    this.busy.set(true); this.error.set(''); this.feedback.set('');
    this.http.patch<{ proposals: Proposal[]; gigStatus: string }>(`${this.api}/${gig.id}/proposals/${action.proposal.id}`, { decision: action.decision }).subscribe({
      next: result => {
        this.proposals.set(result.proposals); this.gig.set({ ...gig, status: result.gigStatus });
        this.feedback.set(action.decision === 'accept' ? 'Proposition acceptée. Le besoin est en cours et les autres propositions en attente ont été refusées.' : 'Proposition refusée.');
        this.busy.set(false); this.confirmation.set(null);
      },
      error: e => {
        this.busy.set(false); this.confirmation.set(null);
        if (e.status === 409) { this.load(); this.feedback.set(e.error?.message || 'La liste a changé.'); }
        else this.error.set(e.error?.message || 'Impossible d’enregistrer la décision. Vous pouvez réessayer.');
      },
    });
  }

  protected showProfile(proposal: Proposal) {
    this.profile.set(null); this.profileError.set(''); this.profileOpen.set(true); this.profileLoading.set(true);
    this.http.get<{ profile: PublicProfile }>(`${this.api}/profiles/${proposal.providerId}`).subscribe({
      next: ({ profile }) => { this.profile.set(profile); this.profileLoading.set(false); },
      error: () => { this.profileError.set('Impossible de charger le profil. Fermez puis réessayez.'); this.profileLoading.set(false); },
    });
  }

  protected submit() {
    const gig = this.gig();
    if (!gig || this.busy()) return;
    this.busy.set(true); this.error.set(''); this.feedback.set('');
    this.http.post(`${this.api}/${gig.id}/proposals`, { amount: this.amount, availability: this.availability, message: this.message }).subscribe({
      next: () => { this.gig.set({ ...gig, hasProposed: true }); this.feedback.set('Votre proposition a été envoyée.'); this.busy.set(false); },
      error: e => { this.error.set(e.error?.message || 'Impossible d’envoyer la proposition.'); this.busy.set(false); },
    });
  }

  protected initials(first: string | null, last: string | null) { return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'; }
  protected money(amount: string | null) { return amount === null ? 'À convenir' : `Rs ${new Intl.NumberFormat('fr-MU', { maximumFractionDigits: 2 }).format(Number(amount))}`; }
  protected date(value: string | null) { return value ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'long' }).format(new Date(value)) : 'À convenir'; }
  protected status(value: string) { return ({ VALIDE: 'Publié', EN_COURS: 'En cours', TERMINE: 'Terminé', EN_ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée', REFUSE: 'Refusé' } as Record<string, string>)[value] || value; }
}
