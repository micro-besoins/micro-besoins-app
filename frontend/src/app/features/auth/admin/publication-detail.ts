import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { Dossier } from './admin.data';

@Component({
  selector:'app-publication-detail',
  imports:[DatePipe,DecimalPipe],
  templateUrl:'./publication-detail.html',
  styleUrl:'./publication-detail.css',
})
export class PublicationDetail {
  readonly dossier = input.required<Dossier>();
  readonly approve = output<void>();
  readonly refuse = output<void>();
  readonly report = output<void>();
  readonly selected = computed(() => this.dossier().details?.proposals.find(p => p.accepted));

  initials(name:string): string { return name.split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join(''); }
  contact(email:string): string { return `mailto:${email}?subject=${encodeURIComponent('Suivi du dossier '+this.dossier().id)}`; }
  stars(rating:number): string { return '★'.repeat(rating)+'☆'.repeat(5-rating); }
}
