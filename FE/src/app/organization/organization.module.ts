import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OrganizationListComponent } from './organization-list.component';
import { OrganizationEditorComponent } from './organization-editor.component';

@NgModule({
    declarations: [
        OrganizationListComponent,
        OrganizationEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        OrganizationListComponent,
        OrganizationEditorComponent
    ]
})
export class OrganizationModule { }
