import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBell, lucideCalendarDays, lucideFlag, lucideMapPin, lucideMessageCircle, lucidePlus } from '@ng-icons/lucide';
import { AuthService, RegisteredUser } from '../../auth/auth.service';
import { ProposalGig, ProposalModalComponent } from '../proposal/proposal-modal.component';

interface Payment { amount: string; status: string | null; paidAt: string | null; }
interface Proposal {
  id: number; content: string; price: string; availability: string | null; sentAt: string | null; status: string | null;
  providerId: number | null; providerFirstName: string | null; providerLastName: string | null;
}
interface GigDetail {
  id: number; title: string; description: string; budget: string; publishedAt: string | null; requestedAt: string | null;
  status: string | null; category: string | null; location: string | null; ownerFirstName: string | null; ownerLastName: string | null;
  proposalCount: number; isOwner: boolean; payments: Payment[]; proposals: Proposal[];
}

@Component({
  selector: 'app-gig-detail-page', standalone: true,
  imports: [RouterLink, NgIcon, ProposalModalComponent],
  providers: [provideIcons({ lucideArrowLeft, lucideBell, lucideCalendarDays, lucideFlag, lucideMapPin, lucideMessageCircle, lucidePlus })],
  templateUrl: './gig-detail.page.html', styleUrl: './gig-detail.page.css',
  styles: [`
    .proposal-list{display:grid;gap:12px;margin-top:16px}.proposal-item{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:13px;align-items:start;padding:17px 18px;border:1px solid #dce6f3;border-radius:15px;background:#fff;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.proposal-item:hover{transform:translateY(-2px);border-color:#a9c7f7;box-shadow:0 10px 24px rgba(29,78,150,.09)}.proposal-avatar{width:44px;height:44px;font-size:16px}.proposal-body{display:grid;gap:4px;min-width:0}.proposal-body strong{color:#0b3473;font-size:16px}.proposal-body small{color:#667d9e;font-size:13px;line-height:1.35}.proposal-body p{margin:7px 0 0;color:#405d82;font-size:15px;line-height:1.45;white-space:pre-line}.proposal-price{display:grid;justify-items:end;gap:8px;text-align:right}.proposal-price>strong{color:#062d68;font-size:17px;white-space:nowrap}.proposal-price span{padding:5px 9px;border-radius:99px;background:#fff2d9;color:#9b5a00;font-size:12px;font-weight:700;white-space:nowrap}.proposal-price span.accepted{background:#e4f8eb;color:#08763c}.proposal-price span.declined{background:#ffe8e8;color:#b42318}.empty-proposals{padding:18px;border:1px dashed #cbd9ec;border-radius:13px;background:#f8fbff}@media(max-width:620px){.proposal-item{grid-template-columns:42px minmax(0,1fr)}.proposal-avatar{width:40px;height:40px}.proposal-price{grid-column:2;justify-items:start;text-align:left;grid-auto-flow:column;justify-content:start;align-items:center}.proposal-body p{font-size:14px}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GigDetailPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly gig = signal<GigDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionMessage = signal('');
  protected readonly reportOpen = signal(false);
  protected readonly reportReason = signal('');
  protected readonly reportError = signal('');
  protected readonly reporting = signal(false);
  protected readonly proposalGig = signal<ProposalGig | null>(null);

  constructor() {
    if (!this.auth.token()) { void this.router.navigateByUrl('/auth/login'); return; }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) { this.fail('Cette annonce est introuvable.'); return; }
    this.http.get<{ gig: GigDetail }>(`http://localhost:3000/api/gigs/${id}`, { headers: this.headers() }).subscribe({
      next: ({ gig }) => { this.gig.set(gig); this.loading.set(false); },
      error: (error: HttpErrorResponse) => this.fail(error.status === 404 ? 'Cette annonce est introuvable ou n’est pas accessible.' : 'Impossible de charger cette annonce.'),
    });
  }

  protected owner(item: GigDetail): string { return [item.ownerFirstName, item.ownerLastName].filter(Boolean).join(' ') || 'Utilisateur inconnu'; }
  protected initials(item: GigDetail): string { return `${item.ownerFirstName?.[0] ?? ''}${item.ownerLastName?.[0] ?? ''}`.toUpperCase() || '?'; }
  protected providerInitials(proposal: Proposal): string { return `${proposal.providerFirstName?.[0] ?? ''}${proposal.providerLastName?.[0] ?? ''}`.toUpperCase() || '?'; }
  protected providerName(proposal: Proposal): string { return [proposal.providerFirstName, proposal.providerLastName].filter(Boolean).join(' ') || 'Prestataire'; }
  protected budget(value: string): string { return new Intl.NumberFormat('fr-MU').format(Number(value)); }
  protected date(value: string | null): string { return value ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'long' }).format(new Date(value)) : 'À convenir'; }
  protected relativeDate(value: string | null): string { return value ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Date inconnue'; }
  protected status(value: string | null): string { return value === 'EN_ATTENTE' ? 'En attente de validation' : value === 'REFUSE' ? 'Refusée' : 'Publiée'; }
  protected proposalStatus(value: string | null): string { return value === 'ACCEPTEE' ? 'Acceptée' : value === 'REFUSEE' ? 'Refusée' : 'En attente'; }
  protected initialsUser(): string { const user = this.user(); return `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase() || '?'; }
  protected notify(message: string): void { this.actionMessage.set(message); }
  protected openProposal(): void {
    const item = this.gig();
    if (item) this.proposalGig.set({ id: item.id, title: item.title, category: item.category, budget: item.budget });
  }
  protected closeProposal(): void { this.proposalGig.set(null); }
  protected proposalSubmitted(): void { this.closeProposal(); this.notify('Votre proposition a été envoyée à l’auteur du besoin.'); }
  protected openReport(): void { this.reportError.set(''); this.reportOpen.set(true); }
  protected closeReport(): void {
    if (!this.reporting()) { this.reportOpen.set(false); this.reportReason.set(''); this.reportError.set(''); }
  }
  protected submitReport(): void {
    const item = this.gig();
    const reason = this.reportReason().trim();
    if (!item || reason.length < 5) { this.reportError.set('Décrivez le motif du signalement (au moins 5 caractères).'); return; }
    this.reporting.set(true); this.reportError.set('');
    this.http.post(`http://localhost:3000/api/gigs/${item.id}/signalements`, { reason }, { headers: this.headers() }).subscribe({
      next: () => { this.reporting.set(false); this.reportOpen.set(false); this.reportReason.set(''); this.notify('Votre signalement a été transmis à l’administrateur.'); },
      error: (error: HttpErrorResponse) => { this.reporting.set(false); this.reportError.set(error.error?.message || 'Impossible d’envoyer le signalement.'); },
    });
  }

  private headers() { return { Authorization: `Bearer ${this.auth.token()}` }; }
  private fail(message: string): void { this.error.set(message); this.loading.set(false); }
}
