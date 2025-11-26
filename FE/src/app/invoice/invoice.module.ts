import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { InvoiceListComponent } from './invoice-list.component';
import { InvoiceEditorComponent } from './invoice-editor.component';

@NgModule({
    declarations: [
        InvoiceListComponent,
        InvoiceEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    exports: [
        InvoiceListComponent,
        InvoiceEditorComponent
    ]
})
export class InvoiceModule { }
