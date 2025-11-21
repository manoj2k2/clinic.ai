import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientListComponent } from './patient-list.component';

@NgModule({
  declarations: [PatientListComponent],
  imports: [CommonModule],
  exports: [PatientListComponent]
})
export class PatientModule {}
