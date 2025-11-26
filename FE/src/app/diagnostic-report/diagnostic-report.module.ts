import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { DiagnosticReportListComponent } from './diagnostic-report-list.component';
import { DiagnosticReportEditorComponent } from './diagnostic-report-editor.component';

@NgModule({
    declarations: [
        DiagnosticReportListComponent,
        DiagnosticReportEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        DiagnosticReportListComponent,
        DiagnosticReportEditorComponent
    ]
})
export class DiagnosticReportModule { }
