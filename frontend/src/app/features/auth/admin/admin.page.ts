import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminState, Dossier, Section, sections } from './admin.data';
import { PublicationDetail } from './publication-detail';

@Component({selector:'app-admin',imports:[RouterLink,CurrencyPipe,DatePipe,PublicationDetail],templateUrl:'./admin.page.html',styleUrl:'./admin.page.css'})
export class AdminPage {
  private readonly state = inject(AdminState);
  readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly sections = sections;
  readonly section = computed(() => sections.find(s => s.key === this.params()?.get('section')));
  readonly current = computed(() => this.section()?.key ?? 'publications');
  readonly invalid = computed(() => !!this.params()?.get('section') && !this.section());
  readonly id = computed(() => this.params()?.get('id'));
  readonly items = this.state.items;
  readonly item = computed(() => this.items().find(d => d.id === this.id() && d.section === this.current()));
  readonly rows = computed(() => this.items().filter(d => d.section === this.current()));
  readonly notice = this.state.notice;
  readonly confirmation = signal<{item:Dossier; action:string}|null>(null);
  readonly note = signal('');
  readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');

  constructor() {
    effect(() => {
      const dialog = this.modal()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  count(key: Section): number { return this.items().filter(d => d.section === key && this.pending(d)).length; }
  pending(d: Dossier): boolean { return d.status === sections.find(s => s.key === d.section)?.pending; }
  ask(item:Dossier, action:string): void { this.note.set(''); this.confirmation.set({item,action}); }

  confirm(): void {
    const request = this.confirmation();
    if (!request) return;
    if (request.action === 'signaler') {
      if (!this.note().trim()) return;
      const report: Dossier = {
        id:`SIG-${Date.now()}`,section:'signalements',title:`Signalement — ${request.item.title}`,
        author:'Admin démo',email:'admin@example.com',category:`Publication ${request.item.id}`,
        city:request.item.city,amount:0,status:'Ouvert',description:this.note().trim(),date:new Date().toISOString().slice(0,10),
      };
      this.items.update(items=>[...items,report]);
      this.confirmation.set(null);
      this.notice.set('Signalement ajouté à la démonstration. Il sera effacé au rechargement.');
      return;
    }
    if (!this.pending(request.item)) return;
    if (request.action === 'traiter' && !this.note().trim()) return;
    const status = request.action === 'accepter'
      ? (request.item.section === 'publications' ? 'Publié' : 'Accepté')
      : request.action === 'refuser' ? 'Refusé' : 'Traité';
    this.items.update(items => items.map(d => d.id === request.item.id ? {...d,status} : d));
    this.confirmation.set(null);
    this.notice.set(`${request.item.id} : ${status}. Modification fictive, conservée jusqu’au rechargement de la page.`);
  }

  contact(d:Dossier): string { return `mailto:${d.email}?subject=${encodeURIComponent('Suivi du dossier '+d.id)}`; }
}
