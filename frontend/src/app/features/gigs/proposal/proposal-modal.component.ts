import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { AuthService } from '../../auth/auth.service';

export interface ProposalGig { id: number; title: string; category: string | null; budget: string; }

@Component({
  selector: 'app-proposal-modal',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ lucideX })],
  templateUrl: './proposal-modal.component.html',
  styleUrl: './proposal-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalModalComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly gig = input.required<ProposalGig>();
  readonly close = output<void>();
  readonly submitted = output<number>();
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    price: ['', [Validators.required, Validators.min(1)]],
    availability: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.sending()) { this.form.markAllAsTouched(); return; }
    this.sending.set(true); this.error.set('');
    this.http.post(`http://localhost:3000/api/gigs/${this.gig().id}/proposals`, this.form.getRawValue(), { headers: { Authorization: `Bearer ${this.auth.token()}` } }).subscribe({
      next: () => { this.sending.set(false); this.submitted.emit(this.gig().id); },
      error: (error: HttpErrorResponse) => { this.sending.set(false); this.error.set(error.error?.message || 'Impossible d’envoyer votre proposition.'); },
    });
  }

  protected cancel(): void { if (!this.sending()) this.close.emit(); }
  protected invalid(name: keyof typeof this.form.controls): boolean { const control = this.form.controls[name]; return control.invalid && control.touched; }
  protected formatBudget(value: string): string { return new Intl.NumberFormat('fr-MU').format(Number(value)); }
}
