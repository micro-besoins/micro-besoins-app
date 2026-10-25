import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Proposal, ProposalService } from './proposal.service';

@Component({
  selector: 'app-my-proposals-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-proposals.page.html',
  styleUrls: ['../home/home.page.css', './my-proposals.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProposalsPage {
  private readonly service = inject(ProposalService);
  protected readonly proposals = signal<Proposal[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() { this.load(); }
  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.listMine().subscribe({
      next: ({ proposals }) => { this.proposals.set(proposals); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger vos propositions.'); this.loading.set(false); },
    });
  }
  protected formatPrice(price: string | null): string { return price === null ? 'Non renseigné' : 'Rs ' + new Intl.NumberFormat('fr-MU').format(Number(price)); }
  protected formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat('fr-MU', { dateStyle: 'medium' }).format(new Date(value)) : 'Date non renseignée'; }
  protected status(value: string | null): string {
    return ({ EN_ATTENTE: 'En attente', ACCEPTE: 'Acceptée', ACCEPTEE: 'Acceptée', REFUSE: 'Refusée', REFUSEE: 'Refusée' } as Record<string, string>)[value ?? ''] ?? value ?? 'Non renseigné';
  }
}
