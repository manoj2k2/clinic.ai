import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PractitionerListComponent } from './practitioner-list.component';
import { PractitionerEditorComponent } from './practitioner-editor.component';

@NgModule({
  declarations: [PractitionerListComponent, PractitionerEditorComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [PractitionerListComponent, PractitionerEditorComponent]
})
export class PractitionerModule {}
