export type Section = 'publications' | 'paiements' | 'signalements';

export interface Dossier {
  id: string; section: Section; title: string; author: string; category: string;
  city: string; amount: number; status: string; description: string; email: string; date: string; authorId?: number | null;
  details?: {
    memberSince: string;
    desiredDate: string;
    /** Informations calculées depuis les enregistrements de paiement. */
    publicationPayment: { status: string; amount: number; date: string | null } | null;
    servicePayment: { status: string; amount: number; date: string | null } | null;
    serviceAmount: number | null;
    proposals: { name: string; email: string; availability: string; description: string; amount: number; accepted: boolean }[];
    reviews: { name: string; rating: number; comment: string }[];
  };
}
