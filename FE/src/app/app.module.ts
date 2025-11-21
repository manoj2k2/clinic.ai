import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { OAuthModule } from 'angular-oauth2-oidc';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { PatientModule } from './patient/patient.module';
import { AuthService } from './services/auth.service';
import { FhirService } from './services/fhir.service';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule, AppRoutingModule, PatientModule, OAuthModule.forRoot()],
  providers: [AuthService, FhirService],
  bootstrap: [AppComponent]
  
})
export class AppModule { }
