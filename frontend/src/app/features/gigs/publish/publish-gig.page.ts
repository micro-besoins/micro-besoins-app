import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, RegisteredUser } from '../../auth/auth.service';

interface FilterOptions { categories: string[]; }

@Component({
  selector: 'app-publish-gig-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './publish-gig.page.html',
  styleUrls: ['./publish-gig.page.css', '../session-actions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublishGigPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly profileOpen = signal(false);
  protected readonly categories = signal<string[]>([]);
  protected readonly submitting = signal(false);
  protected readonly step = signal<1 | 2>(1);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly minDate = new Date().toISOString().slice(0, 10);
  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
    category: ['', Validators.required],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    budget: ['', [Validators.required, Validators.min(1)]],
    requestedAt: ['', Validators.required],
  });
  // Ces champs servent uniquement au parcours de validation : ils ne sont
  // jamais envoyés au serveur ni conservés.
  protected readonly paymentForm = this.fb.group({
    cardNumber: ['', Validators.required],
    expiry: ['', Validators.required],
    cvc: ['', Validators.required],
    acknowledgement: [false, Validators.requiredTrue],
  });

  constructor() {
    if (!this.auth.token()) { void this.router.navigateByUrl('/auth/login'); return; }
    this.http.get<FilterOptions>('http://localhost:3000/api/gigs/filter-options', { headers: this.headers() }).subscribe({
      next: ({ categories }) => this.categories.set(categories),
    });
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.errorMessage.set('');
    if (this.form.invalid || this.paymentForm.invalid) {
      this.form.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.http.post('http://localhost:3000/api/gigs', this.form.getRawValue(), { headers: this.headers() })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.successMessage.set('Votre besoin a été transmis à l’administrateur. Les Rs 75 ne seront débités qu’après sa validation et sa publication.'),
        error: (error: HttpErrorResponse) => this.errorMessage.set(error.error?.message || 'La publication est impossible pour le moment.'),
      });
  }

  protected continue(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.step.set(2);
  }

  protected returnToForm(): void { this.step.set(1); }
  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }
  protected initialsUser(): string {
    const user = this.user();
    return `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase() || '?';
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }
  protected paymentInvalid(name: keyof typeof this.paymentForm.controls): boolean {
    const control = this.paymentForm.controls[name];
    return control.invalid && control.touched;
  }
  private headers() { return { Authorization: `Bearer ${this.auth.token()}` }; }
}
