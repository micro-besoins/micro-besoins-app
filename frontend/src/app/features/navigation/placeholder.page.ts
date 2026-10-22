import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-navigation-placeholder-page',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './placeholder.page.html',
  styleUrl: './placeholder.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationPlaceholderPage {
  protected readonly title = inject(ActivatedRoute).data.pipe(map((data) => data['title'] as string));
}
