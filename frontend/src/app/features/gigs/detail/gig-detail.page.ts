import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBell, lucideCalendarDays, lucideFlag, lucideMapPin, lucideMessageCircle, lucidePlus } from '@ng-icons/lucide';
import { AuthService, RegisteredUser } from '../../auth/auth.service';

interface Payment { 
    amount:string;
    status:string|null; 
    paidAt:string|null; 
}
interface GigDetail { 
    id:number; 
    title:string; 
    description:string; 
    budget:string; 
    publishedAt:string|null; 
    requestedAt:string|null; 
    status:string|null; 
    category:string|null; 
    location:string|null; 
    ownerFirstName:string|null; 
    ownerLastName:string|null; 
    proposalCount:number; 
    isOwner:boolean; 
    payments:Payment[]; 
    proposals?: Proposition[]; 
}
interface Proposition {
  id: number;
  auteurId: number;
  auteurPrenom: string;
  auteurNom: string;
  idUtilisateur: number;
  message: string;
  montant: number;
}

@Component({selector:'app-gig-detail-page',standalone:true,imports:[RouterLink,NgIcon],providers:[provideIcons({lucideArrowLeft,lucideBell,lucideCalendarDays,lucideFlag,lucideMapPin,lucideMessageCircle,lucidePlus})],templateUrl:'./gig-detail.page.html',styleUrl:'./gig-detail.page.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class GigDetailPage {
    private readonly http=inject(HttpClient);
    private readonly auth=inject(AuthService);
    private readonly router=inject(Router);
    private readonly route=inject(ActivatedRoute);
    protected readonly user=signal<RegisteredUser|null>(this.auth.currentUser());
    protected readonly gig=signal<GigDetail|null>(null);
    protected readonly loading=signal(true);
    protected readonly error=signal('');
    protected readonly actionMessage=signal('');
    protected readonly reportOpen=signal(false);
    protected readonly reportReason=signal('');
    protected readonly reportError=signal('');
    protected readonly reporting=signal(false);
    protected readonly proposalOpen = signal(false);
    protected readonly proposalMessage = signal('');
    protected readonly proposalAmount = signal<number | null>(null);
    protected readonly proposalError = signal('');
    protected readonly submittingProposal = signal(false);
    protected readonly acceptOpen = signal(false);
    protected readonly acceptDate = signal('');
    protected readonly acceptId = signal<number | null>(null);
    
    constructor(){
        if(!this.auth.token()){
            void this.router.navigateByUrl('/auth/login');
            return;
        }
        
        const id=Number(this.route.snapshot.paramMap.get('id'));
        if(!Number.isInteger(id)||id<=0){this.fail('Cette annonce est introuvable.');
            return;
        }
        this.http.get<{gig:GigDetail}>(`http://localhost:3000/api/gigs/${id}`,
            {headers:this.headers()}).subscribe({next:({gig})=>{this.gig.set(gig);this.loading.set(false);},error:(error:HttpErrorResponse)=>this.fail(error.status===404?'Cette annonce est introuvable ou n’est pas accessible.':'Impossible de charger cette annonce.')
        });
    }

    protected owner(item:GigDetail){
        return [item.ownerFirstName,item.ownerLastName].filter(Boolean).join(' ')||'Utilisateur inconnu';
    }
    protected initials(item:GigDetail){
        return `${item.ownerFirstName?.[0]??''}${item.ownerLastName?.[0]??''}`.toUpperCase()||'?';
    }
    protected budget(value:string){
        return new Intl.NumberFormat('fr-MU').format(Number(value));
    }
    protected date(value:string|null){
        return value?new Intl.DateTimeFormat('fr-MU',{dateStyle:'long'}).format(new Date(value)):'À convenir';
    }
    protected status(value:string|null){
        return value==='EN_ATTENTE'?'En attente de validation':value==='REFUSE'?'Refusée':'Publiée';
    }
    protected initialsUser(){
        const user=this.user();
        return `${user?.prenom?.[0]??''}${user?.nom?.[0]??''}`.toUpperCase()||'?';
    }
    protected notify(message:string){
        this.actionMessage.set(message);
    }
    protected openReport(){
        this.reportError.set('');this.reportOpen.set(true);
    }
    protected closeReport(){
        if(!this.reporting()){
            this.reportOpen.set(false);
            this.reportReason.set('');this.reportError.set('');
        }
    }
    protected submitReport(){
        const gig=this.gig();
        const reason=this.reportReason().trim();
        if(!gig||reason.length<5){
            this.reportError.set('Décrivez le motif du signalement (au moins 5 caractères).');
            return;
        }
        this.reporting.set(true);
        this.reportError.set('');
        this.http.post(`http://localhost:3000/api/gigs/${gig.id}/signalements`,{reason},{headers:this.headers()}).subscribe({
            next:()=>{
                this.reporting.set(false);
                this.reportOpen.set(false);
                this.reportReason.set('');
                this.notify('Votre signalement a été transmis à l’administrateur.');
            },
            error:(error:HttpErrorResponse)=>{
                this.reporting.set(false);
                this.reportError.set(error.error?.message||'Impossible d’envoyer le signalement.');
            }
        });
    }
    private headers(){
        return {Authorization:`Bearer ${this.auth.token()}`};
    }
    private fail(message:string){
        this.error.set(message);this.loading.set(false);
    }
    protected contacterAuteur(idUtilisateur: number) {
        this.router.navigate(['/messages'], { queryParams: { userId: idUtilisateur } });
        this.notify('Redirection vers la messagerie...');
    }
    protected accepterProposition(idReponse: number) {
        if (!confirm('Voulez-vous vraiment accepter cette proposition ? Les autres seront automatiquement refusées.')) return;

        this.http.patch(`http://localhost:3000/api/reponses/${idReponse}/accepter`, {}, { headers: this.headers() })
        .subscribe({
            next: () => {
            this.notify('La proposition a été acceptée !');
            setTimeout(() => window.location.reload(), 1500); 
            },
            error: (err: HttpErrorResponse) => {
            this.notify(err.error?.message || 'Erreur lors de l\'acceptation.');
            }
        });
    }
    protected openProposal() {
        this.proposalError.set('');
        this.proposalOpen.set(true);
    }
    protected closeProposal() {
        if(!this.submittingProposal()) {
        this.proposalOpen.set(false);
        this.proposalMessage.set('');
        this.proposalAmount.set(null);
        this.proposalError.set('');
        }
    }
    protected submitProposal() {
        const gig = this.gig();
        const msg = this.proposalMessage().trim();
        const amount = this.proposalAmount();

        if (!gig || msg.length < 5 || !amount || amount <= 0) {
        this.proposalError.set('Message trop court ou tarif invalide.');
        return;
        }

        this.submittingProposal.set(true);
        this.http.post(`http://localhost:3000/api/gigs/${gig.id}/propositions`, 
        { message: msg, montant: amount }, 
        { headers: this.headers() }
        ).subscribe({
        next: () => {
            this.submittingProposal.set(false);
            this.closeProposal();
            this.notify('Votre proposition a bien été envoyée !');
        },
        error: (err) => {
            this.submittingProposal.set(false);
            this.proposalError.set(err.error?.message || 'Erreur lors de l\'envoi.');
        }
        });
    }
    protected openAccept(idReponse: number) {
        this.acceptId.set(idReponse);
        this.acceptDate.set('');
        this.acceptOpen.set(true);
    }
    protected closeAccept() {
        this.acceptOpen.set(false);
        this.acceptId.set(null);
    }
    protected confirmAccept() {
        const id = this.acceptId();
        if (!id) return;

        this.http.patch(`http://localhost:3000/api/gigs/reponses/${id}/accepter`, 
        { dateRdv: this.acceptDate() || null }, 
        { headers: this.headers() }
        ).subscribe({
        next: () => {
            this.closeAccept();
            this.notify('Proposition acceptée avec succès !');
            setTimeout(() => window.location.reload(), 1500);
        },
        error: (err) => {
            this.notify(err.error?.message || 'Erreur lors de l\'acceptation.');
        }
        });
    }
}
