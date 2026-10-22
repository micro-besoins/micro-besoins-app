import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface AuthFeature { icon: 'check' | 'chat'; title: string; text: string; }

@Component({
  selector: 'app-auth-split-layout', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-split-layout.component.html', styleUrl: './auth-split-layout.component.css',
})
export class AuthSplitLayoutComponent {
  brand = input('Micro-Besoins');
  tagline = input.required<string>();
  features = input<AuthFeature[]>([]);
}
