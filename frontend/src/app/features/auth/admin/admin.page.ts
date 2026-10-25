import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, RegisteredUser } from '../auth.service';
import { AdminService } from './admin.service';
import { Dossier, Section } from './admin.types';
import { PublicationDetail } from './publication-detail';

@Component({selector:'app-admin',imports:[RouterLink,CurrencyPipe,DatePipe,PublicationDetail],templateUrl:'./admin.page.html',styleUrls:['./admin.page.css', './admin-detail-compact.css']})
export class AdminPage {
  private readonly adminApi = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly profileOpen = signal(false);
  readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly sections = [
    {key:'publications' as Section, label:'Publications', metric:'À valider', pending:'EN_ATTENTE'},
    {key:'paiements' as Section, label:'Paiements', metric:'Paiements échoués', pending:'ECHOUE'},
    {key:'signalements' as Section, label:'Signalements', metric:'Signalements ouverts', pending:'OUVERT'},
  ];
  readonly apiData = signal<any[]>([]);
  readonly stats = signal<any>(null);
  readonly loading = signal(true);
  readonly notice = signal('');
  readonly section = computed(() => this.sections.find(s => s.key === this.params()?.get('section')));
  readonly current = computed(() => this.section()?.key ?? 'publications');
  readonly invalid = computed(() => !!this.params()?.get('section') && !this.section());
  readonly id = computed(() => this.params()?.get('id'));
  readonly items = signal<Dossier[]>([]);
  readonly item = computed(() => this.items().find(d => d.id === this.id() && d.section === this.current()));
  readonly rows = computed(() => this.items().filter(d => d.section === this.current()));
  readonly confirmation = signal<{item:Dossier; action:string}|null>(null);
  readonly note = signal('');
  readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');

  constructor() {
    // Recharge les données quand la section change
    effect(() => {
      const currentSection = this.current();
      this.load(currentSection, this.id());
      this.loadStats();
    });

    // Ouvre la fenêtre de confirmation dès qu'elle apparaît dans la page
    // (un <dialog> reste caché tant que showModal() n'est pas appelé)
    effect(() => {
      const dialog = this.modal()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  count(key: Section): number {
    const stats = this.stats();
    if (!stats) return 0;
    if (key === 'publications') return stats.publicationsAValider;
    if (key === 'paiements') return stats.paiementsEchoues;
    return stats.signalementsOuverts;
  }
  pending(d: Dossier): boolean { return d.status === this.sections.find(s => s.key === d.section)?.pending; }
  canAct(d: Dossier): boolean { return (d.section === 'publications' || d.section === 'signalements') && this.pending(d); }
  ask(item:Dossier, action:string): void { this.note.set(''); this.confirmation.set({item,action}); }

  private load(currentSection: Section, detailId: string | null = null): void {
    this.loading.set(true);

    if (currentSection === 'publications' && detailId) {
      this.adminApi.getPublication(Number(detailId)).subscribe({
        next: ({ publication }) => { this.items.set([this.mapDossier(currentSection, publication)]); this.loading.set(false); },
        error: () => { this.notice.set('Impossible de charger les données.'); this.loading.set(false); },
      });
      return;
    }

    let request;
    if (currentSection === 'publications') request = this.adminApi.getPublications();
    else if (currentSection === 'paiements') request = this.adminApi.getPaiements();
    else request = this.adminApi.getSignalements();

    request.subscribe({
      next: (res: any) => {
        const mapped = res.data.map((p: any) => this.mapDossier(currentSection, p));
        this.items.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notice.set('Impossible de charger les données.');
        this.loading.set(false);
      }
    });
  }

  private loadStats(): void {
    this.adminApi.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.stats.set(null),
    });
  }

  private mapDossier(currentSection: Section, p: any): Dossier {
    const rawPayments = p.payments || [];
    const publicationPayment = rawPayments.find((item: any) => item.label === 'Frais de publication') || null;
    const servicePayment = rawPayments.find((item: any) => item.label === 'Paiement du service') || null;
    const selectedProposal = (p.proposals || []).find((item: any) => item.status === 'ACCEPTE' || item.status === 'TERMINE') || null;
    return {
          id: String(currentSection === 'signalements' ? p.idSignalement : p.idGig || p.idPaiement),
          section: currentSection,
          title: p.titre || p.gigTitre || 'Sans titre',
          author: currentSection === 'signalements'
            ? `${p.signaleurPrenom || ''} ${p.signaleurNom || ''}`.trim() || 'Utilisateur inconnu'
            : `${p.auteurPrenom || ''} ${p.auteurNom || p.payeurNom || ''}`.trim() || 'Utilisateur inconnu',
          authorId: currentSection === 'signalements' ? p.signaleurId : p.auteurId || p.payeurId || null,
          category: currentSection === 'publications' ? p.categorie || 'Non spécifiée' : currentSection === 'paiements' ? p.gigCategory || '' : 'Général',
          city: currentSection === 'publications' ? p.localite || 'Non spécifiée' : currentSection === 'paiements' ? p.gigLocation || '' : 'Non spécifié',
          amount: p.budget || p.montant || 0,
          status: p.status,
          description: p.description || p.motif || '',
          email: currentSection === 'signalements' ? p.signaleurEmail || '' : p.auteurEmail || p.payeurEmail || '',
          date: p.datePublication || p.datePaiement || p.dateSignalement,
          details: currentSection === 'publications' ? {
            memberSince: '', desiredDate: p.dateSouhaitee,
            publicationPayment: publicationPayment && { status: publicationPayment.status, amount: Number(publicationPayment.amount), date: publicationPayment.date || null },
            servicePayment: servicePayment && { status: servicePayment.status, amount: Number(servicePayment.amount), date: servicePayment.date || null },
            serviceAmount: selectedProposal ? Number(selectedProposal.amount) : null,
            proposals: (p.proposals || []).map((item: any) => ({ name: `${item.prenom || ''} ${item.nom || ''}`.trim(), email: item.email, availability: item.status, description: item.description, amount: Number(item.amount), accepted: item.status === 'ACCEPTE' || item.status === 'TERMINE' })),
            reviews: (p.reviews || []).map((item: any) => ({ name: `${item.prenom || ''} ${item.nom || ''}`.trim(), rating: item.rating, comment: item.comment || '' })),
          } : undefined,
        };
  }

  confirm(): void {
    const request = this.confirmation();
    if (!request) return;
    const id = Number(request.item.id);
    let call$: Observable<unknown>;
    let result: string;

    if (request.item.section === 'publications') {
      const accept = request.action === 'accepter';
      call$ = accept ? this.adminApi.accepterPublication(id) : this.adminApi.refuserPublication(id);
      result = accept ? 'Publié' : 'Refusé';
    } else if (request.item.section === 'signalements') {
      call$ = this.adminApi.traiterSignalement(id);
      result = 'Traité';
    } else {
      // Paiements : l'API n'a pas encore d'action pour cette section
      this.confirmation.set(null);
      this.notice.set('Aucune action n’est encore disponible pour les paiements.');
      return;
    }

    call$.subscribe({
      next: () => {
        this.confirmation.set(null);
        this.notice.set(`${request.item.id} : ${result}.`);
        this.load(this.current(), this.id());
        this.loadStats();
      },
      error: (err: HttpErrorResponse) => {
        this.confirmation.set(null);
        this.notice.set(err.status === 409 ? 'Ce dossier a déjà été traité.' : 'Action impossible, réessayez.');
        this.load(this.current(), this.id());
        this.loadStats();
      },
    });
  }

  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }

  protected initials(firstName: string | null, lastName: string | null): string {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  summary(d: Dossier): string { return [d.category, d.city].filter(Boolean).join(' · '); }

  protected goHome(): void {
    this.profileOpen.set(false);
    void this.router.navigateByUrl('/');
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  contact(d:Dossier): string { return `mailto:${d.email}?subject=${encodeURIComponent('Suivi du dossier '+d.id)}`; }
}
