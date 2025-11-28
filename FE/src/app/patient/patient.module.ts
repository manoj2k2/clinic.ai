import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientListComponent } from './patient-list.component';
import { PatientEditorComponent } from './patient-editor.component';
import { PatientObservationComponent } from './patient-observation.component';
import { PatientObservationListComponent } from './patient-observation-list.component';

import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { EhicScannerComponent } from './ehic-scanner/ehic-scanner.component';

@NgModule({
  declarations: [
    PatientListComponent, 
    PatientEditorComponent, 
    PatientObservationComponent, 
    PatientObservationListComponent,
    EhicScannerComponent
  ],
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    ZXingScannerModule
  ],
  exports: [
    PatientListComponent, 
    PatientEditorComponent, 
    PatientObservationComponent, 
    PatientObservationListComponent,
    EhicScannerComponent
  ]
})
export class PatientModule { }
