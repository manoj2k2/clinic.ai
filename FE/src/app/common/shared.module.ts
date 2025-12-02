// src/app/common/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceSelectorComponent } from './resource-selector/resource-selector.component';
import { AddressComponent } from './address/address.component';
@NgModule({
  declarations: [ResourceSelectorComponent, AddressComponent],
  imports: [CommonModule, FormsModule],
  exports: [ResourceSelectorComponent, AddressComponent]   // make it available to other modules
})
export class SharedModule {}