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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  register(payload: RegisterPayload): Observable<{ user: RegisteredUser }> {
    return this.http.post<{ user: RegisteredUser }>(`${this.apiUrl}/register`, payload);
  }
}
