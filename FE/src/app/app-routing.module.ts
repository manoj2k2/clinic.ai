import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientListComponent } from './patient/patient-list.component';
import { PatientEditorComponent } from './patient/patient-editor.component';

const routes: Routes = [
  // { path: '', pathMatch: 'full', redirectTo: 'patients' },
  { path: 'patients', component: PatientListComponent },
  { path: 'patients/new', component: PatientEditorComponent },
  { path: 'patients/:id', component: PatientEditorComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { 
   
}
