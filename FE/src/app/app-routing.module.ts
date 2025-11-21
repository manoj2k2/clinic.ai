import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientListComponent } from './patient/patient-list.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'patients' },
  { path: 'patients', component: PatientListComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
