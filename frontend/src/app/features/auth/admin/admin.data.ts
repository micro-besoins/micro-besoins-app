import { Injectable, signal } from '@angular/core';
export type Section = 'publications' | 'paiements' | 'signalements';
export interface Dossier {
  id: string; section: Section; title: string; author: string; category: string;
  city: string; amount: number; status: string; description: string; email: string; date: string;
  details?: {
    memberSince: string;
    desiredDate: string;
    payments: {label: string; status: string; amount: number; date: string}[];
    proposals: {name: string; email: string; availability: string; description: string; amount: number; accepted: boolean}[];
    reviews: {name: string; rating: number; comment: string}[];
  };
}
export const sections: {key: Section; label: string; metric: string; pending: string}[] = [
  {key:'publications', label:'Publications', metric:'À valider', pending:'À valider'},
  {key:'paiements', label:'Paiements', metric:'Paiements échoués', pending:'Échoué'},
  {key:'signalements', label:'Signalements', metric:'Signalements ouverts', pending:'Ouvert'},
];
@Injectable({providedIn:'root'})
export class AdminState {
  readonly items = signal<Dossier[]>(demoData());
  readonly notice = signal('');
}
export function demoData(): Dossier[] {
  const rows: [string,string,string,string,number,string][] = [
    ["Nettoyage des vitres d’une maison",'Sophie Laurent','Nettoyage','Quatre Bornes',1800,'Publié'],
    ["Entretien d’un petit jardin",'Sophie Laurent','Jardinage','Moka',2500,'Publié'],
    ['Cours de mathématiques niveau Form 4','Kevin Ramdass','Cours particuliers','Curepipe',700,'Publié'],
    ['Fixer trois étagères murales','Aisha Beebeejaun','Petits travaux','Port-Louis',1200,'Publié'],
    ["Installation d’une imprimante Wi-Fi",'Sophie Laurent','Aide informatique','Quatre Bornes',1000,'Terminé'],
    ['Aide pour les courses du quotidien','Marie Pierre','Aide à domicile','Rose-Hill',600,'À valider'],
  ];
  const publications = rows.map((r,i): Dossier => ({id:`PUB-${i+1}`,section:'publications',title:r[0],author:r[1],category:r[2],city:r[3],amount:r[4],status:r[5],description:`${r[0]}. Intervention à ${r[3]}. Les horaires et les modalités seront convenus avec le demandeur.`,email:'demandeur@example.com',date:'2026-10-07'}));
  publications[4] = {
    ...publications[4],
    description:'Installation terminée avec succès sur deux ordinateurs.',
    details: {
      memberSince:'Mars 2024', desiredDate:'2025-06-02',
      payments:[
        {label:'Frais de publication',status:'Payé',amount:90,date:'2025-05-28'},
        {label:'Paiement du service',status:'Payé',amount:850,date:'2025-06-02'},
      ],
      proposals:[{name:'Kevin Ramdass',email:'kevin@example.com',availability:'Disponible mardi après-midi',description:'Installation et tests inclus.',amount:850,accepted:true}],
      reviews:[
        {name:'Sophie Laurent',rating:5,comment:'Très efficace et patient, tout fonctionne parfaitement.'},
        {name:'Kevin Ramdass',rating:5,comment:'Accueil chaleureux et besoin très bien expliqué.'},
      ],
    },
  };
  return [...publications,
    {id:'PAY-1',section:'paiements',title:'Paiement — Entretien d’un petit jardin',author:'Sophie Laurent',category:'Transaction PAY-1',city:'Moka',amount:2500,status:'Échoué',description:'Transaction fictive refusée. Vérifier le dossier et contacter le demandeur. Accepter ce dossier ne relance pas le paiement.',email:'demandeur@example.com',date:'2026-10-07'},
    {id:'SIG-1',section:'signalements',title:'Contenu inapproprié — Fixer trois étagères murales',author:'Kevin Ramdass',category:'Publication PUB-4',city:'Port-Louis',amount:0,status:'Ouvert',description:'La description de la publication PUB-4 a été signalée pour contenu inapproprié. Examiner la publication et consigner le résultat de la modération avant de clôturer ce signalement.',email:'signalant@example.com',date:'2026-10-07'},
  ];
}


