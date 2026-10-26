import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBell, lucideCalendarDays, lucideFlag, lucideMapPin, lucideMessageCircle, lucidePlus } from '@ng-icons/lucide';
import { AuthService, RegisteredUser } from '../../auth/auth.service';
import { HeaderComponent } from '../../../shared/layout/header/header.component';

interface Payment { 
    amount:string;
    status:string|null; 
    paidAt:string|null; 
    responseId:number|null;
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
    ownerId:number|null;
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
  status?: string;
}

@Component({selector:'app-gig-detail-page',standalone:true,imports:[RouterLink,NgIcon,HeaderComponent],providers:[provideIcons({lucideArrowLeft,lucideBell,lucideCalendarDays,lucideFlag,lucideMapPin,lucideMessageCircle,lucidePlus})],templateUrl:'./gig-detail.page.html',styleUrls:['./gig-detail.page.css','./proposal-modal.css','./owner-payment-summary.css','../session-actions.css'],changeDetection:ChangeDetectionStrategy.OnPush})
export class GigDetailPage {
    private readonly http=inject(HttpClient);
    private readonly auth=inject(AuthService);
    private readonly router=inject(Router);
    private readonly route=inject(ActivatedRoute);
    protected readonly user=signal<RegisteredUser|null>(this.auth.currentUser());
    protected readonly profileOpen=signal(false);
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
    protected readonly proposalAvailability = signal('');
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
    protected paymentStatus(value:string|null){
        return value === 'REUSSI' ? 'Payé' : value === 'ECHOUE' ? 'Échoué' : 'En attente de validation';
    }
    protected paymentDate(value:string|null){
        return value ? ` · ${this.date(value)}` : '';
    }
    protected servicePaymentStatus(item:GigDetail){
        return item.proposals?.some((proposal) => proposal.status === 'ACCEPTE')
          ? 'À définir — proposition acceptée'
          : 'Non exigible — besoin non terminé';
    }
    protected publicationPayment(item:GigDetail){
        return item.payments.find((payment) => payment.responseId === null) ?? null;
    }
    protected servicePayment(item:GigDetail){
        return item.payments.find((payment) => payment.responseId !== null) ?? null;
    }
    protected initialsUser(){
        const user=this.user();
        return `${user?.prenom?.[0]??''}${user?.nom?.[0]??''}`.toUpperCase()||'?';
    }
    protected notify(message:string){
        this.actionMessage.set(message);
    }
    protected logout(){
        this.auth.logout();
        void this.router.navigateByUrl('/auth/login');
    }
    protected toggleProfile(){ this.profileOpen.update((open) => !open); }
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
    protected contacterAuteur(_idUtilisateur: number | null) {
        const gig = this.gig();
        if (!gig) return;
        this.http.post<{ conversation: { id: number } }>('http://localhost:3000/api/conversations', { gigId: gig.id }, { headers: this.headers() }).subscribe({
            next: ({ conversation }) => void this.router.navigate(['/messages'], { queryParams: { conversation: conversation.id } }),
            error: (error: HttpErrorResponse) => this.notify(error.error?.message || 'Impossible d’ouvrir la conversation.'),
        });
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
        this.proposalAvailability.set('');
        this.proposalError.set('');
        }
    }
    protected submitProposal() {
        const gig = this.gig();
        const msg = this.proposalMessage().trim();
        const amount = this.proposalAmount();
        const availability = this.proposalAvailability().trim();

        if (!gig || msg.length < 10 || !amount || amount <= 0 || availability.length < 3) {
        this.proposalError.set('Complétez un message, un tarif et vos disponibilités.');
        return;
        }

        this.submittingProposal.set(true);
        this.http.post<{ conversation: { id: number } }>(`http://localhost:3000/api/gigs/${gig.id}/propositions`,
        { message: `${msg}\n\nDisponibilités : ${availability}`, montant: amount }, 
        { headers: this.headers() }
        ).subscribe({
        next: () => {
            this.submittingProposal.set(false);
            this.closeProposal();
            this.notify('Votre proposition a été envoyée. Vous pouvez retrouver la conversation dans Messages.');
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
