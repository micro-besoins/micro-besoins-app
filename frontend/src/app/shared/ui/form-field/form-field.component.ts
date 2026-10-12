import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

let nextId = 0;

/**
 * Reusable label + input + error message.
 * Works with formControlName / formControl / ngModel.
 *
 * <app-form-field label="Email" type="email" formControlName="email"
 *   [errors]="{ required: 'Email requis', email: 'Email invalide' }" />
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  // Default (not OnPush) on purpose: errors depend on the control's touched/invalid state,
  // which can change from outside (e.g. form.markAllAsTouched() on submit).
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent implements ControlValueAccessor {
  label = input.required<string>();
  type = input<'text' | 'email' | 'password'>('text');
  placeholder = input('');
  autocomplete = input<string | null>(null);
  required = input(false);
  /** Map of validator key -> message shown to the user. */
  errors = input<Record<string, string>>({});

  protected readonly id = `app-field-${nextId++}`;
  protected value = signal('');
  protected isDisabled = signal(false);

  private ngControl = inject(NgControl, { self: true, optional: true });

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  protected errorMessage(): string | null {
    const c = this.ngControl?.control;
    if (!c || !c.invalid || !(c.touched || c.dirty)) return null;
    const key = Object.keys(c.errors ?? {})[0];
    return this.errors()[key] ?? 'Champ invalide';
  }

  protected onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.value.set(v);
    this.onChange(v);
  }

  writeValue(v: string | null): void { this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.isDisabled.set(d); }
}