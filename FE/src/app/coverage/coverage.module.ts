import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CoverageListComponent } from './coverage-list.component';
import { CoverageEditorComponent } from './coverage-editor.component';

@NgModule({
    declarations: [
        CoverageListComponent,
        CoverageEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        CoverageListComponent,
        CoverageEditorComponent
    ]
})
export class CoverageModule { }
