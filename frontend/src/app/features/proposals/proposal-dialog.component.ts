import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProposalService } from './proposal.service';

@Component({
  selector: 'app-proposal-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './proposal-dialog.component.html',
  styleUrl: './proposal-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalDialogComponent {
  readonly gig = input.required<{ id: number; title: string; category: string | null; budget: string }>();
  readonly dismissed = output<void>();
  readonly sent = output<void>();
  private readonly proposals = inject(ProposalService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly submitted = signal(false);
  protected readonly form = new FormGroup({
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(5000)] }),
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01), Validators.max(99999.99), Validators.pattern(/^\d+(\.\d{1,2})?$/)]),
    availability: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(500)] }),
  });

  constructor() { afterNextRender(() => this.dialog().nativeElement.showModal()); }

  protected close(): void {
    if (this.sending()) return;
    this.dialog().nativeElement.close();
    this.dismissed.emit();
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.sending()) { this.form.markAllAsTouched(); return; }
    const { message, price, availability } = this.form.getRawValue();
    this.sending.set(true);
    this.error.set('');
    this.proposals.send(this.gig().id, { message: message.trim(), price: price!, availability: availability.trim() }).subscribe({
      next: () => { this.dialog().nativeElement.close(); this.sent.emit(); },
      error: (error) => {
        this.sending.set(false);
        this.error.set(error.error?.message || 'Impossible d’envoyer la proposition. Veuillez réessayer.');
      },
    });
  }
}
