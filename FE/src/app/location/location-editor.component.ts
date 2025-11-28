import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-location-editor',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Location</h2>
        <h2 *ngIf="!isNew">Edit Location</h2>
      </div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        <div class="form-field">
          <label>Name</label>
          <input [(ngModel)]="location.name" name="name" />
        </div>

        <div class="form-field">
          <label>Identifier</label>
          <input [(ngModel)]="identifierValue" name="identifier" placeholder="e.g. LOC-001" />
        </div>

        <div class="form-field">
          <label>Mode</label>
          <select [(ngModel)]="location.mode" name="mode">
            <option value="">(unset)</option>
            <option value="instance">instance</option>
            <option value="kind">kind</option>
          </select>
        </div>

        <div class="form-field">
          <label>Address</label>
          <input [(ngModel)]="addressLine" name="addressLine" placeholder="Street address" />
        </div>

        <div class="form-field">
          <label>Managing Organization</label>
          <app-resource-selector resourceType="Organization" placeholder="Search orgs" (selectedId)="onOrgSelected($event)"></app-resource-selector>
          <div *ngIf="location.managingOrganization">Selected: {{ location.managingOrganization.reference }}</div>
        </div>

        <div class="actions" style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px">
          <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
          <button *ngIf="!isNew" type="button" class="btn btn-danger" (click)="remove()">Delete</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
      <div *ngIf="loading">Loading...</div>
    </div>
  </div>
  `
})
export class LocationEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  location: any = { resourceType: 'Location' };
  identifierValue = '';
  addressLine = '';

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getLocation(this.id).subscribe({ next: (res: any) => {
        this.location = res;
        this.identifierValue = (res.identifier && res.identifier[0] && res.identifier[0].value) || '';
        this.addressLine = res.address?.line?.join(' ') || '';
        this.loading = false;
      }, error: (e)=> { this.loading = false; } });
    }
  }

  onOrgSelected(id: string) {
    this.location.managingOrganization = id ? { reference: `Organization/${id}` } : undefined;
  }

  save() {
    if (this.identifierValue) {
      this.location.identifier = [{ value: this.identifierValue }];
    }
    if (this.addressLine) {
      this.location.address = { line: [this.addressLine] };
    }

    if (this.isNew) {
      this.fhir.createLocation(this.location).subscribe({ next: () => this.router.navigate(['/locations']), error: (e)=> this.loading=false });
    } else if (this.id) {
      this.fhir.updateLocation(this.id, this.location).subscribe({ next: () => this.router.navigate(['/locations']), error: (e)=> this.loading=false });
    }
  }

  remove() {
    if (!this.id) return;
    if (!confirm('Delete this location?')) return;
    this.fhir.deleteLocation(this.id).subscribe({ next: () => this.router.navigate(['/locations']), error: (e)=> this.loading=false });
  }

  cancel() { this.router.navigate(['/locations']); }
}
