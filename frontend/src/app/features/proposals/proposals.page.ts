import { DatePipe, DecimalPipe, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, LOCALE_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { HeaderComponent } from '../../shared/layout/header/header.component';

interface Proposal {
  id: number; gigId: number; title: string; category: string | null;
  amount: string | null; sentAt: string | null; status: string | null; content: string;
  ownerFirstName: string | null; ownerLastName: string | null;
}
interface Need {
  title: string; description: string; budget: string; status: string | null;
  category: string | null; location: string | null; requestedAt: string | null;
  ownerFirstName: string | null; ownerLastName: string | null;
}
interface OwnerProfile { firstName: string; lastName: string; publishedCount: number; }
type DialogKind = 'withdraw' | 'need' | 'profile';
registerLocaleData(localeFr);

@Component({
  selector: 'app-proposals-page', standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, HeaderComponent],
  providers: [{ provide: LOCALE_ID, useValue: 'fr' }],
  templateUrl: './proposals.page.html', styleUrls: ['./proposals.page.css', './proposals-polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalsPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = 'http://localhost:3000/api/proposals';
  private detailVersion = 0;
  @ViewChild('detailDialog') private dialog!: ElementRef<HTMLDialogElement>;
  protected readonly user = this.auth.currentUser();
  protected readonly proposals = signal<Proposal[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly profileOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly updates = computed(() => this.proposals().filter(p => ['ACCEPTEE', 'REFUSEE', 'ACCEPTE', 'REFUSE'].includes(p.status ?? '')));
  protected readonly selected = signal<Proposal | null>(null);
  protected readonly dialogKind = signal<DialogKind>('need');
  protected readonly dialogLoading = signal(false);
  protected readonly dialogError = signal('');
  protected readonly saving = signal(false);
  protected readonly need = signal<Need | null>(null);
  protected readonly ownerProfile = signal<OwnerProfile | null>(null);

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
    this.http.get<{ proposals: Proposal[] }>(this.api, { headers: this.headers() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ proposals }) => { this.proposals.set(proposals); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger vos propositions. Veuillez réessayer.'); this.loading.set(false); },
    });
  }

  protected open(kind: DialogKind, proposal: Proposal): void {
    this.selected.set(proposal);
    this.dialogKind.set(kind);
    this.detailVersion++;
    this.dialogLoading.set(false);
    this.dialogError.set('');
    this.need.set(null);
    this.ownerProfile.set(null);
    this.notificationsOpen.set(false);
    this.dialog.nativeElement.showModal();
    if (kind !== 'withdraw') this.loadDetail();
  }
  private headers() {
    return { Authorization: `Bearer ${this.auth.token()}` };
  }
  
  protected loadDetail(): void {
    const proposal = this.selected();
    if (!proposal) return;
    this.dialogLoading.set(true);
    this.dialogError.set('');
    const version = ++this.detailVersion;
    if (this.dialogKind() === 'need') {
      this.http.get<{ gig: Need }>(`${this.api}/${proposal.id}/need`, { headers: this.headers() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ gig }) => { if (version === this.detailVersion) { this.need.set(gig); this.dialogLoading.set(false); } },
        error: () => { if (version === this.detailVersion) { this.dialogError.set('Impossible de charger le besoin associé.'); this.dialogLoading.set(false); } },
      });
    } else {
      this.http.get<{ profile: OwnerProfile }>(`${this.api}/${proposal.id}/profile`, { headers: this.headers() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ profile }) => { if (version === this.detailVersion) { this.ownerProfile.set(profile); this.dialogLoading.set(false); } },
        error: () => { if (version === this.detailVersion) { this.dialogError.set('Impossible de charger ce profil.'); this.dialogLoading.set(false); } },
      });
    }
  }

  protected withdraw(): void {
    const proposal = this.selected();
    if (!proposal || this.saving()) return;
    this.saving.set(true);
    this.dialogError.set('');
    this.http.patch<{ proposal: { id: number; status: string } }>(`${this.api}/${proposal.id}/withdraw`, {}, { headers: this.headers() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ proposal: updated }) => {
        this.proposals.update(items => items.map(item => item.id === updated.id ? { ...item, status: updated.status } : item));
        this.saving.set(false);
        this.closeDialog();
        this.notice.set('Votre proposition a été retirée. Elle reste disponible dans votre historique.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.dialogError.set(error.status === 409 ? 'Cette proposition n’est plus en attente. La liste a été actualisée.' : 'Le retrait a échoué. Veuillez réessayer.');
        if (error.status === 409 || error.status === 404) this.load();
      },
    });
  }

  protected closeDialog(): void { if (!this.saving()) this.dialog.nativeElement.close(); }
  protected cancelDialog(event: Event): void { if (this.saving()) event.preventDefault(); }
  protected canWithdraw(): boolean {
    return this.proposals().some(p => p.id === this.selected()?.id && this.isPending(p));
  }
  protected toggleProfile(): void { this.profileOpen.update(open => !open); this.notificationsOpen.set(false); }
  protected toggleNotifications(): void { this.notificationsOpen.update(open => !open); this.profileOpen.set(false); }
  protected logout(): void { this.auth.logout(); void this.router.navigateByUrl('/auth/login'); }
  protected initials(first: string | null | undefined, last: string | null | undefined): string {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
  }
  protected owner(proposal: Proposal): string {
    return [proposal.ownerFirstName, proposal.ownerLastName].filter(Boolean).join(' ') || 'Utilisateur indisponible';
  }
  protected availability(proposal: Proposal): string {
    const match = proposal.content.match(/Disponibilités\s*:\s*([^\n]+)/i);
    return match?.[1]?.trim() || 'Non renseignées';
  }
  protected normalizedStatus(status: string | null | undefined): string {
    return status?.trim().toUpperCase() || 'EN_ATTENTE';
  }
  protected isPending(proposal: Proposal): boolean {
    return this.normalizedStatus(proposal.status) === 'EN_ATTENTE';
  }
  protected statusLabel(status: string | null): string {
    switch (this.normalizedStatus(status)) {
      case 'EN_ATTENTE': return 'En attente';
      case 'ACCEPTEE': case 'ACCEPTE': return 'Acceptée';
      case 'REFUSEE': case 'REFUSE': return 'Refusée';
      case 'RETIREE': case 'RETIRE': return 'Retirée';
      case 'TERMINEE': case 'TERMINE': return 'Terminée';
      default: return 'Statut non renseigné';
    }
  }
  protected needStatus(status: string | null): string {
    return status === 'VALIDE' ? 'Disponible' : status === 'EN_ATTENTE' ? 'En attente de validation' : status === 'REFUSE' ? 'Refusé' : status === 'CLOTURE' ? 'Clôturé' : 'Indisponible';
  }
}
