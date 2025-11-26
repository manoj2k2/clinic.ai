import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MedicationRequestListComponent } from './medication-request-list.component';
import { MedicationRequestEditorComponent } from './medication-request-editor.component';

@NgModule({
    declarations: [
        MedicationRequestListComponent,
        MedicationRequestEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        MedicationRequestListComponent,
        MedicationRequestEditorComponent
    ]
})
export class MedicationRequestModule { }
