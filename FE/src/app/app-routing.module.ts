import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientListComponent } from './patient/patient-list.component';
import { PatientEditorComponent } from './patient/patient-editor.component';
import { PatientObservationComponent } from './patient/patient-observation.component';
import { PatientObservationListComponent } from './patient/patient-observation-list.component';
import { PractitionerListComponent } from './practitioner/practitioner-list.component';
import { PractitionerEditorComponent } from './practitioner/practitioner-editor.component';

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
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

}
