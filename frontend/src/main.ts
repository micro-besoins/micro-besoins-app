import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Component, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import fr from '@angular/common/locales/fr';
import { RouterOutlet } from '@angular/router';
import { AdminPage } from './app/admin.page';
@Component({selector:'app-root', imports:[RouterOutlet], template:'<router-outlet />'})
class App {}
registerLocaleData(fr);
bootstrapApplication(App, { providers: [{provide:LOCALE_ID,useValue:'fr'}, provideRouter([
  {path:'', pathMatch:'full', redirectTo:'admin'},
  {path:'admin', component:AdminPage},
  {path:'admin/:section/:id', component:AdminPage},
  {path:'admin/:section', component:AdminPage},
  {path:'**', redirectTo:'admin'},
])] }).catch(console.error);


