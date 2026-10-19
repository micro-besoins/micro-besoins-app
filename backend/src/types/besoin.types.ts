export interface BesoinItem {
  idGig: number;
  titre: string;
  description: string;
  budget: number;
  datePublication: Date | null;
  auteurId: number | null;
  auteurNom: string | null;
  auteurPrenom: string | null;
}