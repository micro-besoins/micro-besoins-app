import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;
const REDIRECT_DELAY_MS = 800;

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly passwordHidden = signal(true);
  readonly apiError = signal<string | null>(null);
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(EMAIL_RE)]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  readonly emailControl = this.form.controls.email;
  readonly passwordControl = this.form.controls.password;

  readonly emailError = computed(() => {
    const control = this.emailControl;
    if (!control.touched && !this.submitted()) return '';
    if (control.hasError('required')) return "L'adresse email est obligatoire.";
    if (control.hasError('pattern')) return 'Veuillez saisir une adresse email valide.';
    return '';
  });

  readonly passwordError = computed(() => {
    const control = this.passwordControl;
    if (!control.touched && !this.submitted()) return '';
    if (control.hasError('required')) return 'Le mot de passe est obligatoire.';
    if (control.hasError('minlength')) {
      return 'Le mot de passe doit contenir au moins ' + MIN_PASSWORD_LENGTH + ' caractères.';
    }
    return '';
  });

  togglePassword(): void {
    this.passwordHidden.update((hidden) => !hidden);
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.emailControl.markAsTouched();
      this.passwordControl.markAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.loading.set(true);
    this.apiError.set(null);
    this.success.set(false);

    this.http
      .post<{ token: string; user: { email: string; name: string } }>('/api/login', { email, password })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          this.apiError.set('Connexion réussie, redirection…');
          setTimeout(() => this.router.navigateByUrl('/page-vide'), REDIRECT_DELAY_MS);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.apiError.set(this.extractApiError(err));
        },
      });
  }

  private extractApiError(err: HttpErrorResponse): string {
    const payload = err.error;
    if (payload && typeof payload.error === 'string') return payload.error;
    if (payload && typeof payload.message === 'string') return payload.message;
    if (err.status === 0) return "Impossible de contacter le serveur. Vérifiez qu'il est bien démarré.";
    if (err.status === 401 || err.status === 403) return 'Email ou mot de passe incorrect.';
    if (err.status === 422) return 'Les données envoyées sont invalides.';
    if (err.status >= 500) return 'Une erreur serveur est survenue. Veuillez réessayer plus tard.';
    return 'Une erreur est survenue lors de la connexion.';
  }
}
