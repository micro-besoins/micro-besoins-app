import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Control-level validator: value must equal the sibling control `otherName`. */
export function matchesField(otherName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const other = control.parent?.get(otherName);
    return other && control.value !== other.value ? { mismatch: true } : null;
  };
}