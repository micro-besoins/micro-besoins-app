import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideFlag, lucideMessageCircle, lucidePlus, lucideSend } from '@ng-icons/lucide';
import { AuthService, RegisteredUser } from '../auth/auth.service';
import { HeaderComponent } from '../../shared/layout/header/header.component';

interface Conversation {
  id: number;
  gigId: number;
  title: string;
  otherUserId: number;
  otherFirstName: string;
  otherLastName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  content: string;
  sentAt: string;
  senderId: number;
  senderFirstName: string;
  senderLastName: string;
}

interface ConversationDetail {
  id: number;
  gigId: number;
  title: string;
  otherUserId: number;
  otherFirstName: string;
  otherLastName: string;
}

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [FormsModule, NgIcon, HeaderComponent],
  providers: [provideIcons({ lucideBell, lucideFlag, lucideMessageCircle, lucidePlus, lucideSend })],
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.css', '../gigs/session-actions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = signal<RegisteredUser | null>(this.auth.currentUser());
  protected readonly profileOpen = signal(false);
  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly selected = signal<ConversationDetail | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMessages = signal(false);
  protected readonly sending = signal(false);
  protected readonly draft = signal('');
  protected readonly error = signal('');
  protected readonly reportOpen = signal(false);
  protected readonly reportReason = signal('');
  protected readonly reporting = signal(false);
  protected readonly reportError = signal('');
  protected readonly selectedId = computed(() => this.selected()?.id ?? null);

  constructor() {
    this.loadConversations();
  }

  protected selectConversation(id: number): void {
    if (id === this.selectedId()) return;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { conversation: id }, queryParamsHandling: 'merge' });
    this.loadMessages(id);
  }

  protected send(): void {
    const conversation = this.selected();
    const content = this.draft().trim();
    if (!conversation || !content || this.sending()) return;
    this.sending.set(true);
    this.error.set('');
    this.http.post<{ message: ChatMessage }>(`http://localhost:3000/api/conversations/${conversation.id}/messages`, { content }, { headers: this.headers() }).subscribe({
      next: ({ message }) => {
        this.messages.update((items) => [...items, message]);
        this.conversations.update((items) => items.map((item) => item.id === conversation.id
          ? { ...item, lastMessage: message.content, lastMessageAt: message.sentAt }
          : item));
        this.draft.set('');
        this.sending.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.message || 'Impossible d’envoyer le message.');
        this.sending.set(false);
      },
    });
  }

  protected initials(firstName: string, lastName: string): string {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }
  protected initialsUser(): string {
    const user = this.user();
    return this.initials(user?.prenom ?? '', user?.nom ?? '');
  }
  protected fullName(firstName: string, lastName: string): string { return `${firstName} ${lastName}`.trim(); }
  protected preview(item: Conversation): string { return item.lastMessage || 'Aucun message pour le moment'; }
  protected time(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return new Intl.DateTimeFormat('fr-MU', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  protected day(value: string): string {
    return new Intl.DateTimeFormat('fr-MU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }
  protected isMine(message: ChatMessage): boolean { return message.senderId === this.user()?.id; }
  protected openReport(): void { this.reportError.set(''); this.reportOpen.set(true); }
  protected closeReport(): void {
    if (this.reporting()) return;
    this.reportOpen.set(false);
    this.reportReason.set('');
    this.reportError.set('');
  }
  protected submitReport(): void {
    const conversation = this.selected();
    const reason = this.reportReason().trim();
    if (!conversation || reason.length < 5) {
      this.reportError.set('Décrivez le problème en au moins 5 caractères.');
      return;
    }
    this.reporting.set(true);
    this.reportError.set('');
    this.http.post(`http://localhost:3000/api/conversations/${conversation.id}/signalements`, { reason }, { headers: this.headers() }).subscribe({
      next: () => {
        this.reporting.set(false);
        this.closeReport();
        this.error.set('Votre signalement a été transmis à l’administrateur.');
      },
      error: (error: HttpErrorResponse) => {
        this.reporting.set(false);
        this.reportError.set(error.error?.message || 'Impossible d’envoyer le signalement.');
      },
    });
  }
  protected toggleProfile(): void { this.profileOpen.update((open) => !open); }
  protected logout(): void { this.auth.logout(); void this.router.navigateByUrl('/auth/login'); }

  private loadConversations(): void {
    this.loading.set(true);
    this.http.get<{ conversations: Conversation[] }>('http://localhost:3000/api/conversations', { headers: this.headers() }).subscribe({
      next: ({ conversations }) => {
        this.conversations.set(conversations);
        this.loading.set(false);
        const requested = Number(this.route.snapshot.queryParamMap.get('conversation'));
        const firstId = conversations[0]?.id;
        const id = conversations.some((item) => item.id === requested) ? requested : firstId;
        if (id) this.loadMessages(id);
      },
      error: () => { this.error.set('Impossible de charger vos conversations.'); this.loading.set(false); },
    });
  }

  private loadMessages(id: number): void {
    this.loadingMessages.set(true);
    this.error.set('');
    this.http.get<{ conversation: ConversationDetail; messages: ChatMessage[] }>(`http://localhost:3000/api/conversations/${id}/messages`, { headers: this.headers() }).subscribe({
      next: ({ conversation, messages }) => {
        this.selected.set(conversation);
        this.messages.set(messages);
        this.conversations.update((items) => items.map((item) => item.id === id ? { ...item, unreadCount: 0 } : item));
        this.loadingMessages.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.message || 'Impossible de charger cette conversation.');
        this.loadingMessages.set(false);
      },
    });
  }

  private headers() { return { Authorization: `Bearer ${this.auth.token()}` }; }
}
