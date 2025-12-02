import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientListComponent } from './patient/patient-list.component';
import { PatientEditorComponent } from './patient/patient-editor.component';
import { PatientObservationComponent } from './patient/patient-observation.component';
import { PatientObservationListComponent } from './patient/patient-observation-list.component';
import { PractitionerListComponent } from './practitioner/practitioner-list.component';
import { PractitionerEditorComponent } from './practitioner/practitioner-editor.component';
import { RoleGuard } from './services/role.guard';
import { Roles } from './services/roles';
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
import { AppointmentEditorComponent } from './appointment/appointment-editor.component';
import { MedicationRequestListComponent } from './medication-request/medication-request-list.component';
import { MedicationRequestEditorComponent } from './medication-request/medication-request-editor.component';
import { CoverageListComponent } from './coverage/coverage-list.component';
import { CoverageEditorComponent } from './coverage/coverage-editor.component';
import { PractitionerRoleListComponent } from './practitioner-role/practitioner-role-list.component';
import { PractitionerRoleEditorComponent } from './practitioner-role/practitioner-role-editor.component';
import { LocationListComponent } from './location/location-list.component';
import { LocationEditorComponent } from './location/location-editor.component';
import { practitionerPortalDashboardComponent } from './practitioner-portal/practitioner-portal.component';
import { PatientPortalComponent } from './patient-portal/patient-portal.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'practitioner-portal', component: practitionerPortalDashboardComponent },
  { path: 'patient-portal', component: PatientPortalComponent },
  { path: 'patients', component: PatientListComponent },
  { path: 'patients/new', component: PatientEditorComponent },
  { path: 'patients/:id/observations', component: PatientObservationListComponent },
  { path: 'patients/:id/observation', component: PatientObservationComponent },
  { path: 'patients/:id', component: PatientEditorComponent }
  , { path: 'practitioners', component: PractitionerListComponent, canActivate: [RoleGuard], data: { roles: [Roles.Practitioner] } },
  { path: 'practitioners/new', component: PractitionerEditorComponent, canActivate: [RoleGuard], data: { roles: [Roles.Practitioner] } },
  { path: 'practitioners/:id', component: PractitionerEditorComponent, canActivate: [RoleGuard], data: { roles: [Roles.Practitioner] } }
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
  , { path: 'coverages', component: CoverageListComponent }
  , { path: 'coverages/new', component: CoverageEditorComponent }
  , { path: 'coverages/:id', component: CoverageEditorComponent }
  , { path: 'appointments', component: AppointmentListComponent }
  , { path: 'appointments/new', component: AppointmentEditorComponent }
  , { path: 'appointments/:id', component: AppointmentEditorComponent }
  , { path: 'practitioner-roles', component: PractitionerRoleListComponent }
  , { path: 'practitioner-roles/new', component: PractitionerRoleEditorComponent }
  , { path: 'practitioner-roles/:id', component: PractitionerRoleEditorComponent }
  , { path: 'locations', component: LocationListComponent }
  , { path: 'locations/new', component: LocationEditorComponent }
  , { path: 'locations/:id', component: LocationEditorComponent }
  , { path: 'encounters', loadChildren: () => import('./encounter/encounter.module').then(m => m.EncounterModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

}
