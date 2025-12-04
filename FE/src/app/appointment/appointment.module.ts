import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppointmentListComponent } from './appointment-list.component';
import { AppointmentEditorComponent } from './appointment-editor.component';
import { SharedModule } from '../common/shared.module';


import { TableModule } from 'primeng/table';

@NgModule({
    declarations: [
        AppointmentListComponent,
        AppointmentEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        SharedModule,
        TableModule
    ],
    exports: [
        AppointmentListComponent,
        AppointmentEditorComponent
    ]
})
export class AppointmentModule { }
