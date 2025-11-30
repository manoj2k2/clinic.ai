import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OrganizationListComponent } from './organization-list.component';
import { OrganizationEditorComponent } from './organization-editor.component';
import { SharedModule } from '../common/shared.module';

@NgModule({
    declarations: [
        OrganizationListComponent,
        OrganizationEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        SharedModule
    ],
    exports: [
        OrganizationListComponent,
        OrganizationEditorComponent
    ]
})
export class OrganizationModule { }
