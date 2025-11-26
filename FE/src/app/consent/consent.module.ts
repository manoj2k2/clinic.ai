import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConsentListComponent } from './consent-list.component';
import { ConsentEditorComponent } from './consent-editor.component';

@NgModule({
  declarations: [ConsentListComponent, ConsentEditorComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [ConsentListComponent, ConsentEditorComponent]
})
export class ConsentModule {}
