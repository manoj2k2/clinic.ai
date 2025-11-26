import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientListComponent } from './patient-list.component';
import { PatientEditorComponent } from './patient-editor.component';
import { PatientObservationComponent } from './patient-observation.component';
import { PatientObservationListComponent } from './patient-observation-list.component';

@NgModule({
  declarations: [PatientListComponent, PatientEditorComponent, PatientObservationComponent, PatientObservationListComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [PatientListComponent, PatientEditorComponent, PatientObservationComponent, PatientObservationListComponent]
})
export class PatientModule { }
