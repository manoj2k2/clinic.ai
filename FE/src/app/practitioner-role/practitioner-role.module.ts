import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PractitionerRoleListComponent } from  './practitioner-role-list.component';
import { PractitionerRoleEditorComponent } from  './practitioner-role-editor.component';

@NgModule({
  declarations: [
    PractitionerRoleListComponent,
    PractitionerRoleEditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  exports: [
    PractitionerRoleListComponent,
    PractitionerRoleEditorComponent
  ]
})
export class PractitionerRoleModule { }
