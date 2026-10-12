import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface AuthFeature {
  icon: 'check' | 'chat';
  title: string;
  text: string;
}

/**
 * Split screen used by every auth page (register, login, forgot password...).
 * Left: brand panel. Right: projected content (<ng-content />).
 */
@Component({
  selector: 'app-auth-split-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-split-layout.component.html',
  styleUrl: './auth-split-layout.component.css',
})
export class AuthSplitLayoutComponent {
  brand = input('Micro-Besoins');
  tagline = input.required<string>();
  features = input<AuthFeature[]>([]);
}