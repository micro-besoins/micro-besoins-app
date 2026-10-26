import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBell, lucideCalendarDays, lucideCheck, lucideFlag, lucideMapPin, lucideMessageCircle, lucidePlus } from '@ng-icons/lucide';
import { AuthService, RegisteredUser } from '../../auth/auth.service';
import { HeaderComponent } from '../../../shared/layout/header/header.component';

interface Payment {
  amount: string;
  status: string | null;
  paidAt: string | null;
  responseId: number | null;
}

interface Proposition {
  id: number;
  auteurId: number;
  auteurPrenom: string;
  auteurNom: string;
  message: string;
  montant: number | string;
  status: string; // EN_ATTENTE | ACCEPTE | REFUSE
  dateRdv: string | null;
}

interface GigDetail {
  id: number;
  title: string;
  description: string;
  budget: string;
  requestedAt: string | null;
  status: string | null;
  category: string | null;
  location: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  proposalCount: number;
  isOwner: boolean;
  payments: Payment[];
  proposals?: Proposition[];
}

@Component({
  selector: 'app-proposals-page',
  standalone: true,
  imports: [RouterLink, NgIcon, HeaderComponent],
  providers: [provideIcons({ lucideArrowLeft, lucideBell, lucideCalendarDays, lucideCheck, lucideFlag, lucideMapPin, lucideMessageCircle, lucidePlus })],
  templateUrl: './proposals.page.html',
  styleUrls: ['./proposals.page.css', './proposal-payment-summary.css', '../session-actions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalsPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly gigId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly profileOpen = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly gig = signal<GigDetail | null>(null);
  protected readonly proposals = signal<Proposition[]>([]);
  protected readonly actionMessage = signal('');

  // Prestataire retenu = la proposition acceptée (bloc vert de la maquette)
  protected readonly retained = computed(() => this.proposals().find(p => p.status === 'ACCEPTE' || p.status === 'TERMINE') ?? null);

  protected readonly reportOpen = signal(false);
  protected readonly reportReason = signal('');
  protected readonly reportError = signal('');
  protected readonly reporting = signal(false);

  protected readonly acceptOpen = signal(false);
  protected readonly acceptDate = signal('');
  protected readonly acceptId = signal<number | null>(null);
  protected readonly completingService = signal(false);

  constructor() {
    if (!this.auth.token()) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }
    if (!Number.isInteger(this.gigId) || this.gigId <= 0) {
      this.fail('Cette annonce est introuvable.');
      return;
    }
    this.loadProposals();
  }

  // Charge (ou recharge, sans quitter la page) l'annonce et ses propositions
  private loadProposals() {
    this.http.get<{ gig: GigDetail }>(`http://localhost:3000/api/gigs/${this.gigId}`, { headers: this.headers() }).subscribe({
      next: ({ gig }) => {
        if (!gig.isOwner) {
          this.fail('Vous n’êtes pas autorisé à voir ces propositions.');
          return;
        }
        this.gig.set(gig);
        this.proposals.set(gig.proposals ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) =>
        this.fail(
          err.status === 401 || err.status === 403 ? 'Vous n’êtes pas autorisé à voir ces propositions.'
          : err.status === 404 ? 'Cette annonce est introuvable.'
          : 'Erreur lors du chargement.',
        ),
    });
  }

  protected owner(item: GigDetail) {
    return [item.ownerFirstName, item.ownerLastName].filter(Boolean).join(' ') || 'Utilisateur inconnu';
  }
  protected initials(item: GigDetail) {
    return `${item.ownerFirstName?.[0] ?? ''}${item.ownerLastName?.[0] ?? ''}`.toUpperCase() || '?';
  }
  protected initialsOf(prop: Proposition) {
    return `${prop.auteurPrenom?.[0] ?? ''}${prop.auteurNom?.[0] ?? ''}`.toUpperCase() || '?';
  }
  protected initialsUser() {
    const user = this.user();
    return `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase() || '?';
  }
  protected budget(value: string | number | null) {
    return new Intl.NumberFormat('fr-MU').format(Number(value));
  }
  protected date(value: string | null) {
    return value ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'long' }).format(new Date(value)) : 'À convenir';
  }
  protected paymentStatus(value: string | null) {
    return value === 'REUSSI' ? 'Payé' : value === 'ECHOUE' ? 'Échoué' : 'En attente de validation';
  }
  protected paymentDate(value: string | null) {
    return value ? ` · ${this.date(value)}` : '';
  }
  protected servicePaymentStatus() {
    return this.proposals().some((proposal) => proposal.status === 'ACCEPTE')
      ? 'À définir — proposition acceptée'
      : 'Non exigible — besoin non terminé';
  }
  protected publicationPayment(item: GigDetail): Payment | null {
    return item.payments.find((payment) => payment.responseId === null) ?? null;
  }
  protected servicePayment(item: GigDetail): Payment | null {
    return item.payments.find((payment) => payment.responseId !== null) ?? null;
  }
  protected dateTime(value: string | null) {
    return value ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : '';
  }
  protected status(value: string | null) {
    return value === 'EN_ATTENTE' ? 'En attente de validation' : value === 'REFUSE' ? 'Refusée' : 'Publiée';
  }
  protected proposalStatus(value: string) {
    return value === 'ACCEPTE' ? 'Acceptée' : value === 'REFUSE' ? 'Refusée' : 'En attente';
  }
  protected notify(message: string) {
    this.actionMessage.set(message);
  }
  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }

  // ---- Accepter une proposition (reste sur cette page) ----
  protected openAccept(idReponse: number) {
    this.acceptId.set(idReponse);
    this.acceptDate.set('');
    this.acceptOpen.set(true);
  }
  protected closeAccept() {
    this.acceptOpen.set(false);
    this.acceptId.set(null);
  }
  protected confirmAccept() {
    const id = this.acceptId();
    if (!id) return;

    this.http.patch(`http://localhost:3000/api/gigs/reponses/${id}/accepter`, { dateRdv: this.acceptDate() || null }, { headers: this.headers() }).subscribe({
      next: () => {
        this.closeAccept();
        this.notify('Proposition acceptée avec succès !');
        this.loadProposals(); // la liste se met à jour : badge « Acceptée » + bloc « Prestataire retenu »
      },
      error: (err: HttpErrorResponse) => {
        this.closeAccept();
        this.notify(err.error?.message || 'Erreur lors de l’acceptation.');
        this.loadProposals(); // ex. 409 : l'affichage est resynchronisé avec la base
      },
    });
  }

  protected completeService(idReponse: number): void {
    if (this.completingService() || !confirm('Confirmer que le service est terminé ? Le paiement sera enregistré.')) return;
    this.completingService.set(true);
    this.http.patch(`http://localhost:3000/api/gigs/reponses/${idReponse}/terminer`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.completingService.set(false);
        this.notify('Service terminé : le paiement a été enregistré.');
        this.loadProposals();
      },
      error: (err: HttpErrorResponse) => {
        this.completingService.set(false);
        this.notify(err.error?.message || 'Impossible de terminer le service.');
      },
    });
  }

  protected contacter(idUtilisateur: number) {
    this.router.navigate(['/messages'], { queryParams: { userId: idUtilisateur } });
  }

  // ---- Signalement ----
  protected openReport() {
    this.reportError.set('');
    this.reportOpen.set(true);
  }
  protected closeReport() {
    if (!this.reporting()) {
      this.reportOpen.set(false);
      this.reportReason.set('');
      this.reportError.set('');
    }
  }
  protected submitReport() {
    const gig = this.gig();
    const reason = this.reportReason().trim();
    if (!gig || reason.length < 5) {
      this.reportError.set('Décrivez le motif du signalement (au moins 5 caractères).');
      return;
    }
    this.reporting.set(true);
    this.reportError.set('');
    this.http.post(`http://localhost:3000/api/gigs/${gig.id}/signalements`, { reason }, { headers: this.headers() }).subscribe({
      next: () => {
        this.reporting.set(false);
        this.reportOpen.set(false);
        this.reportReason.set('');
        this.notify('Votre signalement a été transmis à l’administrateur.');
      },
      error: (err: HttpErrorResponse) => {
        this.reporting.set(false);
        this.reportError.set(err.error?.message || 'Impossible d’envoyer le signalement.');
      },
    });
  }

  private headers() {
    return { Authorization: `Bearer ${this.auth.token()}` };
  }
  private fail(message: string) {
    this.error.set(message);
    this.loading.set(false);
  }
}
