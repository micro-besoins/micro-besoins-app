import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DashboardStats {
  publicationsAValider: number;
  paiementsEchoues: number;
  signalementsOuverts: number;
}

export interface AdminResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/admin';

  private getHeaders() {
    const token = localStorage.getItem('token');
    console.log('Token envoyé :', token);
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getPublications(status = 'EN_ATTENTE', page = 1): Observable<AdminResponse<any>> {
    const params = new HttpParams().set('status', status).set('page', page.toString());
    return this.http.get<AdminResponse<any>>(`${this.apiUrl}/publications`, { params });
  }

  getPaiements(status = 'ECHOUE', page = 1): Observable<AdminResponse<any>> {
    const params = new HttpParams().set('status', status).set('page', page.toString());
    return this.http.get<AdminResponse<any>>(`${this.apiUrl}/paiements`, { params });
  }

  getSignalements(status = 'OUVERT', page = 1): Observable<AdminResponse<any>> {
    const params = new HttpParams().set('status', status).set('page', page.toString());
    return this.http.get<AdminResponse<any>>(`${this.apiUrl}/signalements`, { params });
  }

  // Actions
  accepterPublication(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/publications/${id}/accepter`, {});
  }

  refuserPublication(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/publications/${id}/refuser`, {});
  }

  traiterSignalement(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/signalements/${id}/traiter`, {});
  }
}