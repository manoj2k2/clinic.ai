// src/app/common/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceSelectorComponent } from './resource-selector/resource-selector.component';
@NgModule({
  declarations: [ResourceSelectorComponent],
  imports: [CommonModule, FormsModule],
  exports: [ResourceSelectorComponent]   // make it available to other modules
})
export class SharedModule {}