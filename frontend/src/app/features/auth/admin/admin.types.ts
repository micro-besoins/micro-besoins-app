export type Section = 'publications' | 'paiements' | 'signalements';

export interface Dossier {
  id: string; section: Section; title: string; author: string; category: string;
  city: string; amount: number; status: string; description: string; email: string; date: string;
  details?: {
    memberSince: string;
    desiredDate: string;
    payments: { label: string; status: string; amount: number; date: string }[];
    proposals: { name: string; email: string; availability: string; description: string; amount: number; accepted: boolean }[];
    reviews: { name: string; rating: number; comment: string }[];
  };
}
