import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  loading = input(false);
}