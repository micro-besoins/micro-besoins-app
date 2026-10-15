import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
let nextId = 0;
@Component({ selector:'app-form-field', standalone:true, changeDetection:ChangeDetectionStrategy.Default, templateUrl:'./form-field.component.html', styleUrl:'./form-field.component.css' })
export class FormFieldComponent implements ControlValueAccessor {
  label=input.required<string>(); type=input<'text'|'email'|'password'>('text'); placeholder=input(''); autocomplete=input<string|null>(null); required=input(false); errors=input<Record<string,string>>({});
  protected readonly id=`app-field-${nextId++}`; protected value=signal(''); protected isDisabled=signal(false); private ngControl=inject(NgControl,{self:true,optional:true}); private onChange=(value:string)=>{}; protected onTouched=()=>{};
  constructor(){ if(this.ngControl) this.ngControl.valueAccessor=this; } protected errorMessage():string|null { const control=this.ngControl?.control; if(!control||!control.invalid||!(control.touched||control.dirty)) return null; const key=Object.keys(control.errors??{})[0]; return this.errors()[key]??'Champ invalide'; }
  protected onInput(event:Event){ const value=(event.target as HTMLInputElement).value; this.value.set(value); this.onChange(value); } writeValue(value:string|null){this.value.set(value??'');} registerOnChange(fn:(value:string)=>void){this.onChange=fn;} registerOnTouched(fn:()=>void){this.onTouched=fn;} setDisabledState(disabled:boolean){this.isDisabled.set(disabled);}
}
