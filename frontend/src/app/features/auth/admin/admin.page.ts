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

@Component({selector:'app-admin',imports:[RouterLink,CurrencyPipe,DatePipe,PublicationDetail],templateUrl:'./admin.page.html',styleUrl:'./admin.page.css'})
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
      this.load(currentSection);
    });

    // Ouvre la fenêtre de confirmation dès qu'elle apparaît dans la page
    // (un <dialog> reste caché tant que showModal() n'est pas appelé)
    effect(() => {
      const dialog = this.modal()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  count(key: Section): number { return this.items().filter(d => d.section === key && this.pending(d)).length; }
  pending(d: Dossier): boolean { return d.status === this.sections.find(s => s.key === d.section)?.pending; }
  ask(item:Dossier, action:string): void { this.note.set(''); this.confirmation.set({item,action}); }

  private load(currentSection: string): void {
    this.loading.set(true);

    let request;
    if (currentSection === 'publications') request = this.adminApi.getPublications();
    else if (currentSection === 'paiements') request = this.adminApi.getPaiements();
    else request = this.adminApi.getSignalements();

    request.subscribe({
      next: (res: any) => {
        const mapped = res.data.map((p: any) => ({
          id: String(p.idGig || p.idPaiement || p.idSignalement),
          section: currentSection,
          title: p.titre || p.gigTitre || 'Sans titre',
          author: `${p.auteurPrenom || ''} ${p.auteurNom || p.payeurNom || ''}`,
          category: 'Général',
          city: 'Non spécifié',
          amount: p.budget || p.montant || 0,
          status: p.status,
          description: p.description || p.motif || '',
          email: p.auteurEmail || p.payeurEmail || '',
          date: p.datePublication || p.datePaiement || p.dateSignalement
        }));
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
        this.load(this.current());
      },
      error: (err: HttpErrorResponse) => {
        this.confirmation.set(null);
        this.notice.set(err.status === 409 ? 'Ce dossier a déjà été traité.' : 'Action impossible, réessayez.');
        this.load(this.current());
      },
    });
  }

  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }

  protected initials(firstName: string | null, lastName: string | null): string {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

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