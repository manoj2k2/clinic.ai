import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LocationListComponent } from './location-list.component';
import { LocationEditorComponent } from './location-editor.component';
import { SharedModule } from '../common/shared.module';

@NgModule({
  declarations: [LocationListComponent, LocationEditorComponent],
  imports: [CommonModule, FormsModule, RouterModule, SharedModule],
  exports: [LocationListComponent, LocationEditorComponent]
})
export class LocationModule { }
