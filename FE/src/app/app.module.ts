import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { OAuthModule } from 'angular-oauth2-oidc';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { PatientModule } from './patient/patient.module';
import { PractitionerModule } from './practitioner/practitioner.module';
import { ConsentModule } from './consent/consent.module';
import { OrganizationModule } from './organization/organization.module';
import { DiagnosticReportModule } from './diagnostic-report/diagnostic-report.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ObservationModule } from './observation/observation.module';
import { AppointmentModule } from './appointment/appointment.module';
import { AuthService } from './services/auth.service';
import { FhirService } from './services/fhir.service';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule, AppRoutingModule, PatientModule, PractitionerModule, ConsentModule, OrganizationModule, DiagnosticReportModule, InvoiceModule, ObservationModule, AppointmentModule, OAuthModule.forRoot()],
  providers: [AuthService, FhirService],
  bootstrap: [AppComponent]

})
export class AppModule { }
