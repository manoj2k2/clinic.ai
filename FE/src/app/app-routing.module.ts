import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientListComponent } from './patient/patient-list.component';
import { PatientEditorComponent } from './patient/patient-editor.component';
import { PatientObservationComponent } from './patient/patient-observation.component';
import { PatientObservationListComponent } from './patient/patient-observation-list.component';
import { PractitionerListComponent } from './practitioner/practitioner-list.component';
import { PractitionerEditorComponent } from './practitioner/practitioner-editor.component';
import { ConsentListComponent } from './consent/consent-list.component';
import { ConsentEditorComponent } from './consent/consent-editor.component';
import { OrganizationListComponent } from './organization/organization-list.component';
import { OrganizationEditorComponent } from './organization/organization-editor.component';
import { DiagnosticReportListComponent } from './diagnostic-report/diagnostic-report-list.component';
import { DiagnosticReportEditorComponent } from './diagnostic-report/diagnostic-report-editor.component';
import { InvoiceListComponent } from './invoice/invoice-list.component';
import { InvoiceEditorComponent } from './invoice/invoice-editor.component';
import { ObservationListComponent } from './observation/observation-list.component';
import { ObservationEditorComponent } from './observation/observation-editor.component';
import { AppointmentListComponent } from './appointment/appointment-list.component';
import { MedicationRequestListComponent } from './medication-request/medication-request-list.component';
import { MedicationRequestEditorComponent } from './medication-request/medication-request-editor.component';

const routes: Routes = [
  // { path: '', pathMatch: 'full', redirectTo: 'patients' },
  { path: 'patients', component: PatientListComponent },
  { path: 'patients/new', component: PatientEditorComponent },
  { path: 'patients/:id/observations', component: PatientObservationListComponent },
  { path: 'patients/:id/observation', component: PatientObservationComponent },
  { path: 'patients/:id', component: PatientEditorComponent }
  , { path: 'practitioners', component: PractitionerListComponent },
  { path: 'practitioners/new', component: PractitionerEditorComponent },
  { path: 'practitioners/:id', component: PractitionerEditorComponent }
  , { path: 'consents', component: ConsentListComponent }
  , { path: 'consents/new', component: ConsentEditorComponent }
  , { path: 'consents/:id', component: ConsentEditorComponent }
  , { path: 'organizations', component: OrganizationListComponent }
  , { path: 'organizations/new', component: OrganizationEditorComponent }
  , { path: 'organizations/:id', component: OrganizationEditorComponent }
  , { path: 'diagnostic-reports', component: DiagnosticReportListComponent }
  , { path: 'diagnostic-reports/new', component: DiagnosticReportEditorComponent }
  , { path: 'diagnostic-reports/:id', component: DiagnosticReportEditorComponent }
  , { path: 'invoices', component: InvoiceListComponent }
  , { path: 'invoices/new', component: InvoiceEditorComponent }
  , { path: 'invoices/:id', component: InvoiceEditorComponent }
  , { path: 'observations', component: ObservationListComponent }
  , { path: 'observations/new', component: ObservationEditorComponent }
  , { path: 'observations/:id', component: ObservationEditorComponent }
  , { path: 'medication-requests', component: MedicationRequestListComponent }
  , { path: 'medication-requests/new', component: MedicationRequestEditorComponent }
  , { path: 'medication-requests/:id', component: MedicationRequestEditorComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

}
