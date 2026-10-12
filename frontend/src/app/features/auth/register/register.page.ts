import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthFeature, AuthSplitLayoutComponent } from '../../../layouts/auth-split-layout/auth-split-layout.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { matchesField } from '../validators/matches-field.validator';

/** Page component: routed, owns the form. Backend integration is done by the API team. */
@Component({
  selector: 'app-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthSplitLayoutComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
})
export class RegisterPage {
  private fb = inject(NonNullableFormBuilder);

  protected features: AuthFeature[] = [
    { icon: 'check', title: 'Un seul compte', text: 'Demandez un service ou rendez service.' },
    { icon: 'chat', title: 'Des échanges simples', text: 'Tout votre suivi au même endroit.' },
  ];

  protected form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, matchesField('password')]],
  });

  constructor() {
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO (backend team): send this.form.getRawValue() to the register endpoint.
    console.log(this.form.getRawValue());
  }
}