import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OrganizationListComponent } from './organization-list.component';
import { OrganizationEditorComponent } from './organization-editor.component';
import { OrganizationCardComponent } from './organization-card.component';
import { SharedModule } from '../common/shared.module';

@NgModule({
    declarations: [
        OrganizationListComponent,
        OrganizationEditorComponent
        ,OrganizationCardComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        SharedModule
    ],
    exports: [
        OrganizationListComponent,
        OrganizationEditorComponent,
        OrganizationCardComponent
    ]
})
export class OrganizationModule { }
