import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { AuthService, RegisteredUser } from '../auth/auth.service';
import { PublicProfilePage } from './public-profile.page';

interface Profile extends RegisteredUser { publicName: string; location: string; bio: string; joinedAt: string | null; }

@Component({
  selector: 'app-profile-page', standalone: true,
  imports: [FormsModule, NgIcon, PublicProfilePage],
  providers: [provideIcons({ lucideX })],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = 'http://localhost:3000/api/users/me';
  @ViewChild('editDialog') private dialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('profileForm') private form?: NgForm;
  protected readonly profile = signal<Profile | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saveError = signal('');
  protected readonly success = signal('');
  protected readonly saving = signal(false);
  protected readonly refreshVersion = signal(0);
  protected draft = { publicName: '', location: '', bio: '', nom: '', prenom: '', email: '' };

  constructor() { 
    this.load(); 
    this.route.queryParams.subscribe(params => {
      if (params['edit'] === 'true') {
        setTimeout(() => this.edit(), 500); 
      }
    });
  }

  protected load(): void {
    if (!this.auth.token()) { void this.router.navigateByUrl('/auth/login'); return; }
    this.loading.set(true); this.error.set('');
    this.http.get<{ profile: Profile }>(this.api, { headers: this.headers() }).subscribe({
      next: ({ profile }) => {
        this.profile.set(profile); this.auth.updateCurrentUser(profile);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => { this.loading.set(false); this.handleError(error, this.error); },
    });
  }

  protected edit(): void {
    const profile = this.profile();
    if (!profile) return;
    this.draft = { publicName: profile.publicName, location: profile.location, bio: profile.bio, nom: profile.nom, prenom: profile.prenom, email: profile.email };
    this.form?.resetForm(this.draft);
    this.saveError.set(''); this.success.set(''); this.dialog?.nativeElement.showModal();
    const body = this.dialog?.nativeElement.querySelector('.dialog-body');
    if (body) body.scrollTop = 0;
  }

  protected close(event?: Event): void {
    if (this.saving()) { event?.preventDefault(); return; }
    this.dialog?.nativeElement.close();
  }

  protected backdrop(event: MouseEvent): void {
    if (event.target !== this.dialog?.nativeElement) return;
    const rect = this.dialog.nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
  }

  protected save(form: NgForm): void {
    if (form.invalid || this.saving()) { form.control.markAllAsTouched(); return; }
    this.saving.set(true); this.saveError.set('');
    this.http.put<{ profile: Profile }>(this.api, this.draft, { headers: this.headers() }).subscribe({
      next: ({ profile }) => {
        this.profile.set(profile); this.auth.updateCurrentUser(profile);
        this.saving.set(false); this.close(); this.refreshVersion.update((value) => value + 1); this.success.set('Votre profil a été mis à jour.');
      },
      error: (error: HttpErrorResponse) => { this.saving.set(false); this.handleError(error, this.saveError); },
    });
  }

  protected logout(): void { this.auth.logout(); void this.router.navigateByUrl('/auth/login'); }
  private headers() { return { Authorization: `Bearer ${this.auth.token()}` }; }
  private handleError(error: HttpErrorResponse, target: { set(value: string): void }): void {
    if (error.status === 401) { this.close(); this.logout(); return; }
    target.set(error.status >= 400 && error.status < 500 ? error.error?.message || 'Les informations sont invalides.' : 'Impossible de contacter le serveur. Veuillez réessayer.');
  }
}
