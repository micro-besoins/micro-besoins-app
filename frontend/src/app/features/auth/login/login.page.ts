import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthFeature, AuthSplitLayoutComponent } from '../../../layouts/auth-split-layout/auth-split-layout.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthSplitLayoutComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage implements OnInit{
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
   
  ngOnInit() {
      if (this.auth.token()) {
        this.router.navigate(['/']);
    }
  }
  
  protected readonly features: AuthFeature[] = [
    { icon: 'check', title: 'Un seul compte', text: 'Demandez un service ou rendez service.' },
    { icon: 'chat', title: 'Des échanges simples', text: 'Tout votre suivi au même endroit.' },
  ];

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.submitting()) return;
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (response) => {
        this.auth.saveSession(response);
        void this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => this.errorMessage.set(
        error.status === 401 ? 'Email ou mot de passe incorrect.' : 'Impossible de se connecter. Veuillez réessayer.'
      ),
    });
  }
}
