import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../common/shared.module';
import { EncounterListComponent } from './encounter-list.component';
import { EncounterEditorComponent } from './encounter-editor.component';
import { RoleGuard } from '../services/role.guard';
import { Roles } from '../services/roles';

const routes: Routes = [
  { path: '', component: EncounterListComponent, canActivate: [RoleGuard], data: { roles: [Roles.Practitioner, Roles.Admin] } },
  { path: ':id', component: EncounterEditorComponent, canActivate: [RoleGuard], data: { roles: [Roles.Practitioner, Roles.Admin] } }
];

@NgModule({
  declarations: [
    EncounterListComponent,
    EncounterEditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class EncounterModule { }
