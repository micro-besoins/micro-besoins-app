import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Dossier } from './admin.types';

@Component({
  selector:'app-publication-detail',
  imports:[DatePipe,DecimalPipe],
  templateUrl:'./publication-detail.html',
  styleUrls:['./publication-detail.css', './publication-detail-polish.css', './payment-card-typography.css', './publication-status.css'],
})
export class PublicationDetail {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly dossier = input.required<Dossier>();
  readonly approve = output<void>();
  readonly refuse = output<void>();
  readonly report = output<void>();
  readonly selected = computed(() => this.dossier().details?.proposals.find(p => p.accepted));

  initials(name:string): string { return name.split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join(''); }
  contact(email:string): string { return `mailto:${email}?subject=${encodeURIComponent('Suivi du dossier '+this.dossier().id)}`; }
  canContactAuthor(): boolean {
    const authorId = this.dossier().authorId;
    return !!authorId && authorId !== this.auth.currentUser()?.id;
  }
  contactAuthor(): void {
    const dossier = this.dossier();
    this.http.post<{ conversation: { id: number } }>('http://localhost:3000/api/conversations', { gigId: Number(dossier.id) }, {
      headers: { Authorization: `Bearer ${this.auth.token()}` },
    }).subscribe({ next: ({ conversation }) => void this.router.navigate(['/messages'], { queryParams: { conversation: conversation.id } }) });
  }
  paymentStatus(status: string | null | undefined, kind: 'publication' | 'service'): string {
    if (status === 'REUSSI') return 'Payé';
    if (status === 'ECHOUE') return 'Échoué';
    if (status === 'EN_ATTENTE') return kind === 'publication' ? 'En attente de validation' : 'En attente de paiement';
    return 'En attente';
  }
  stars(rating:number): string { return '★'.repeat(rating)+'☆'.repeat(5-rating); }
}
