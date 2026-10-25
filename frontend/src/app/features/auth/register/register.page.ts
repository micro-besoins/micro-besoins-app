import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, RegisterPayload } from '../auth.service';
import { matchesField } from '../validators/matches-field.validator';
import { AuthFeature, AuthSplitLayoutComponent } from '../../../layouts/auth-split-layout/auth-split-layout.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthSplitLayoutComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
})
export class RegisterPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
      if (this.auth.token()) {
        this.router.navigate(['/']);
    }
  }

  protected readonly submitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(41)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required, matchesField('password')]],
  });
  protected readonly features: AuthFeature[] = [
    { icon: 'check', title: 'Un seul compte', text: 'Demandez un service ou rendez service.' },
    { icon: 'chat', title: 'Des échanges simples', text: 'Tout votre suivi au même endroit.' },
  ];

  constructor() {
    this.form.controls.password.valueChanges.subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.successMessage.set('');
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, email, password } = this.form.getRawValue();
    const [prenom, ...nomParts] = fullName.trim().split(/\s+/);
    const payload: RegisterPayload = {
      prenom,
      nom: nomParts.join(' ') || prenom,
      email: email.trim(),
      password,
      role: 'demandeur',
    };

    this.submitting.set(true);
    this.auth.register(payload).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.successMessage.set('Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.');
        this.form.reset();
      },
      error: (error: HttpErrorResponse) => this.errorMessage.set(this.messageFor(error)),
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 409) return 'Cette adresse email est déjà utilisée.';
    if (error.status === 400 && error.error?.message === "Format d'email invalide.") return 'Adresse email invalide.';
    return 'Impossible de créer le compte. Veuillez réessayer.';
  }
}
