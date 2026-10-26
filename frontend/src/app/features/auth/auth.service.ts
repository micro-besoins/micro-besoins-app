import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: 'demandeur';
}

export interface RegisteredUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: RegisteredUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  register(payload: RegisterPayload): Observable<{ user: RegisteredUser }> {
    return this.http.post<{ user: RegisteredUser }>(`${this.apiUrl}/register`, payload);
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload);
  }

  saveSession(response: LoginResponse): void {
    localStorage.setItem('micro-besoins-token', response.token);
    localStorage.setItem('micro-besoins-user', JSON.stringify(response.user));
  }

  token(): string | null {
    return localStorage.getItem('micro-besoins-token');
  }

  currentUser(): RegisteredUser | null {
    const raw = localStorage.getItem('micro-besoins-user');
    if (!raw) return null;
    try { return JSON.parse(raw) as RegisteredUser; } catch { return null; }
  }

  updateCurrentUser(user: RegisteredUser): void {
    localStorage.setItem('micro-besoins-user', JSON.stringify(user));
  }

  logout(): void {
    localStorage.removeItem('micro-besoins-token');
    localStorage.removeItem('micro-besoins-user');
  }
}
