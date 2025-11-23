import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientListComponent } from './patient-list.component';
import { PatientEditorComponent } from './patient-editor.component';

@NgModule({
  declarations: [PatientListComponent, PatientEditorComponent],
  imports: [CommonModule, FormsModule],
  exports: [PatientListComponent, PatientEditorComponent]
})
export class PatientModule {}
