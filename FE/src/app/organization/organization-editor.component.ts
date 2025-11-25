import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-organization-editor',
    template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Organization</h2>
        <h2 *ngIf="!isNew">Edit Organization</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        
        <div class="form-section">
          <div class="form-section-title">Basic Information</div>
          <div class="form-field">
            <label>Name</label>
            <input type="text" [(ngModel)]="name" name="name" placeholder="e.g. Burgers University Medical Center" />
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label>Identifier Value</label>
              <input type="text" [(ngModel)]="identifierValue" name="identifierValue" placeholder="e.g. 91654" />
            </div>
            <div class="form-field">
              <label>Identifier System</label>
              <input type="text" [(ngModel)]="identifierSystem" name="identifierSystem" placeholder="urn:oid:..." />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Type</div>
          <div class="form-field">
            <label>Organization Type</label>
            <select [(ngModel)]="typeCode" name="typeCode" (change)="onTypeChange()">
              <option value="">-- Select Type --</option>
              <option *ngFor="let type of organizationTypes" [value]="type.code">{{type.display}}</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Contact Information</div>
          <div class="form-row">
            <div class="form-field">
              <label>Phone</label>
              <input type="text" [(ngModel)]="telecomValue" name="telecomValue" placeholder="e.g. 022-655 2300" />
            </div>
            <div class="form-field">
              <label>Use</label>
              <select [(ngModel)]="telecomUse" name="telecomUse">
                <option value="work">Work</option>
                <option value="home">Home</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Address</div>
          <div class="form-field">
            <label>Line</label>
            <input type="text" [(ngModel)]="addressLine" name="addressLine" placeholder="e.g. Galapagosweg 91" />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>City</label>
              <input type="text" [(ngModel)]="addressCity" name="addressCity" placeholder="e.g. Den Burg" />
            </div>
            <div class="form-field">
              <label>Postal Code</label>
              <input type="text" [(ngModel)]="addressPostalCode" name="addressPostalCode" placeholder="e.g. 9105 PZ" />
            </div>
          </div>
          <div class="form-field">
            <label>Country</label>
            <input type="text" [(ngModel)]="addressCountry" name="addressCountry" placeholder="e.g. NLD" />
          </div>
        </div>

        <div class="actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px">
          <button type="button" (click)="cancel()" class="btn btn-secondary">Cancel</button>
          <button *ngIf="!isNew" type="button" (click)="remove()" class="btn btn-danger">Delete</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  `,
    styles: []
})
export class OrganizationEditorComponent implements OnInit {
    isNew = true;
    id: string | null = null;
    loading = false;
    error: string | null = null;

    // Form fields
    name = '';
    identifierValue = '';
    identifierSystem = '';
    typeCode = '';
    typeDisplay = '';
    telecomValue = '';
    telecomUse = 'work';
    addressLine = '';
    addressCity = '';
    addressPostalCode = '';
    addressCountry = '';

    organizationTypes = [
        { code: 'prov', display: 'Healthcare Provider' },
        { code: 'dept', display: 'Hospital Department' },
        { code: 'team', display: 'Organizational team' },
        { code: 'govt', display: 'Government' },
        { code: 'ins', display: 'Insurance Company' },
        { code: 'pay', display: 'Payer' },
        { code: 'edu', display: 'Educational Institute' },
        { code: 'reli', display: 'Religious Institution' },
        { code: 'crs', display: 'Clinical Research Sponsor' },
        { code: 'cg', display: 'Community Group' },
        { code: 'bus', display: 'Non-Healthcare Business' },
        { code: 'other', display: 'Other' }
    ];

    constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.isNew = false;
            this.loading = true;
            this.fhir.getOrganization(this.id).subscribe({
                next: (res: any) => {
                    const r = res;
                    this.name = r.name || '';

                    if (r.identifier && r.identifier.length > 0) {
                        this.identifierValue = r.identifier[0].value || '';
                        this.identifierSystem = r.identifier[0].system || '';
                    }

                    if (r.type && r.type.length > 0 && r.type[0].coding && r.type[0].coding.length > 0) {
                        this.typeCode = r.type[0].coding[0].code || '';
                        this.typeDisplay = r.type[0].coding[0].display || '';
                    }

                    if (r.telecom && r.telecom.length > 0) {
                        this.telecomValue = r.telecom[0].value || '';
                        this.telecomUse = r.telecom[0].use || 'work';
                    }

                    if (r.address && r.address.length > 0) {
                        this.addressLine = (r.address[0].line && r.address[0].line.length > 0) ? r.address[0].line[0] : '';
                        this.addressCity = r.address[0].city || '';
                        this.addressPostalCode = r.address[0].postalCode || '';
                        this.addressCountry = r.address[0].country || '';
                    }

                    this.loading = false;
                }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
            });
        }
    }

    onTypeChange() {
        const selected = this.organizationTypes.find(t => t.code === this.typeCode);
        if (selected) {
            this.typeDisplay = selected.display;
        } else {
            this.typeDisplay = '';
        }
    }

    save() {
        const organization: any = {
            resourceType: 'Organization',
            name: this.name,
            identifier: [{
                use: 'official',
                system: this.identifierSystem,
                value: this.identifierValue
            }],
            type: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/organization-type',
                    code: this.typeCode,
                    display: this.typeDisplay
                }]
            }],
            telecom: [{
                system: 'phone',
                value: this.telecomValue,
                use: this.telecomUse
            }],
            address: [{
                use: 'work',
                line: [this.addressLine],
                city: this.addressCity,
                postalCode: this.addressPostalCode,
                country: this.addressCountry
            }]
        };

        if (this.isNew) {
            this.fhir.createOrganization(organization).subscribe({ next: () => this.router.navigate(['/organizations']), error: (e) => this.error = e.message || 'Create failed' });
        } else if (this.id) {
            this.fhir.updateOrganization(this.id, organization).subscribe({ next: () => this.router.navigate(['/organizations']), error: (e) => this.error = e.message || 'Update failed' });
        }
    }

    remove() {
        if (!this.id) return;
        if (!confirm('Delete this organization?')) return;
        this.fhir.deleteOrganization(this.id).subscribe({ next: () => this.router.navigate(['/organizations']), error: (e) => this.error = e.message || 'Delete failed' });
    }

    cancel() { this.router.navigate(['/organizations']); }
}
