import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface Proposal {
  id: number;
  gigId: number;
  gigTitle: string;
  category: string | null;
  location: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  message: string;
  price: string | null;
  availability: string | null;
  createdAt: string | null;
  status: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly http = inject(HttpClient);
  send(gigId: number, input: { message: string; price: number; availability: string }) {
    return this.http.post('http://localhost:3000/api/gigs/' + gigId + '/proposals', input);
  }
  listMine() { return this.http.get<{ proposals: Proposal[] }>('http://localhost:3000/api/proposals'); }
}
