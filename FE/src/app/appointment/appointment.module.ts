import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppointmentListComponent } from './appointment-list.component';
import { AppointmentEditorComponent } from './appointment-editor.component';

@NgModule({
    declarations: [
        AppointmentListComponent,
        AppointmentEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        AppointmentListComponent,
        AppointmentEditorComponent
    ]
})
export class AppointmentModule { }
