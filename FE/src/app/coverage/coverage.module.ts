import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CoverageListComponent } from './coverage-list.component';
import { CoverageEditorComponent } from './coverage-editor.component';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';

@NgModule({
    declarations: [
        CoverageListComponent,
        CoverageEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
        ,
        InputTextModule,
        CheckboxModule
    ],
    exports: [
        CoverageListComponent,
        CoverageEditorComponent
    ]
})
export class CoverageModule { }
