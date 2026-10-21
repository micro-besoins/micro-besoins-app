export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface DashboardStats {
  publicationsAValider: number;
  paiementsEchoues: number;
  signalementsOuverts: number;
}

export interface PublicationItem {
  idGig: number;
  titre: string;
  description: string;
  budget: number;
  datePublication: Date | null;
  status: string;
  motif: string | null;
  auteurId: number | null;
  auteurNom: string | null;
  auteurPrenom: string | null;
  auteurEmail: string | null;
}

export interface PublicationDecisionResult {
  idGig: number;
  status: string;
  motif: string | null;
  dateModification: Date;
}

export interface PaiementItem {
  idPaiement: number;
  montant: number;
  methode: string;
  datePaiement: Date | null;
  status: string;
  idReponse: number | null;
  gigTitre: string | null;
  payeurId: number | null;
  payeurNom: string | null;
  payeurPrenom: string | null;
  payeurEmail: string | null;
}

export interface SignalementItem {
  idSignalement: number;
  motif: string;
  dateSignalement: Date | null;
  status: string;
  idGig: number | null;
  gigTitre: string | null;
  gigStatus: string | null;
  signaleurId: number | null;
  signaleurNom: string | null;
  signaleurPrenom: string | null;
  signaleurEmail: string | null;
}

export interface SignalementProcessResult {
  idSignalement: number;
  status: string;
}