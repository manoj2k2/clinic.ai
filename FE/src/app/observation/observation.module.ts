import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ObservationListComponent } from './observation-list.component';
import { ObservationEditorComponent } from './observation-editor.component';

@NgModule({
    declarations: [
        ObservationListComponent,
        ObservationEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        ObservationListComponent,
        ObservationEditorComponent
    ]
})
export class ObservationModule { }
