import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PractitionerListComponent } from './practitioner-list.component';
import { PractitionerEditorComponent } from './practitioner-editor.component';
import { PractitionerCardComponent } from './practitioner-card.component';
import { SharedModule } from '../common/shared.module';

@NgModule({
  declarations: [PractitionerListComponent, PractitionerEditorComponent, PractitionerCardComponent],
  imports: [CommonModule, FormsModule, RouterModule, SharedModule],
  exports: [PractitionerListComponent, PractitionerEditorComponent, PractitionerCardComponent]
})  
export class PractitionerModule {}
