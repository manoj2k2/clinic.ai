import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-role-editor',
  template: `
    <div class="editor-container">
      <div class="editor-card">
        <div class="page-header">
          <h2 *ngIf="isNew">Create Practitioner Role</h2>
          <h2 *ngIf="!isNew">Edit Practitioner Role</h2>
        </div>

        <div *ngIf="loading" class="loading">Loading...</div>
        <div *ngIf="error" class="error-msg">{{error}}</div>

        <form *ngIf="!loading" (ngSubmit)="save()">
          
          <div class="form-section">
            <div class="form-section-title">References</div>
            <div class="form-field">
              <label>Practitioner Reference</label>
              <app-resource-selector resourceType="Practitioner"
               placeholder="Search practitioners"
                (selectedId)="onPractitionerSelected($event)"></app-resource-selector>
              <div *ngIf="practitionerRef" >Selected: {{practitionerRef}}</div>
            </div>
            <div class="form-field">
              <label>Organization Reference</label>
               <app-resource-selector resourceType="Organization"
               placeholder="Search organizations" 
               (selectedId)="onOrganizationSelected($event)"></app-resource-selector>
              <div *ngIf="organizationRef" >Selected: {{organizationRef}}</div>
           
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Role Details</div>
            <div class="form-row">
              <div class="form-field">
                <label>Role Code</label>
                <select [(ngModel)]="roleCode" name="roleCode" (change)="onRoleChange()">
                  <option value="">-- Select Role --</option>
                  <option *ngFor="let r of roleOptions" [value]="r.code">{{r.display}}</option>
                </select>
              </div>
              <div class="form-field">
                <label>Specialty</label>
                <select [(ngModel)]="specialtyCode" name="specialtyCode" (change)="onSpecialtyChange()">
                  <option value="">-- Select Specialty --</option>
                  <option *ngFor="let s of specialtyOptions" [value]="s.code">{{s.display}}</option>
                </select>
              </div>
            </div>
            
            <div class="form-field">
              <label>Active</label>
              <select [(ngModel)]="active" name="active">
                <option [value]="true">Yes</option>
                <option [value]="false">No</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Availability</div>
            <div class="form-field">
              <label>Availability Exceptions</label>
              <textarea [(ngModel)]="availabilityExceptions" name="availabilityExceptions" rows="3" placeholder="e.g. Unavailable on public holidays"></textarea>
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
  styles: [ ]
})
export class PractitionerRoleEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  error: string | null = null;

  // Form fields
  practitionerRef = '';
  organizationRef = '';
  roleCode = '';
  roleDisplay = '';
  specialtyCode = '';
  specialtyDisplay = '';
  active = true;
  availabilityExceptions = '';

  roleOptions = [
    { code: 'doctor', display: 'Doctor' },
    { code: 'nurse', display: 'Nurse' },
    { code: 'pharmacist', display: 'Pharmacist' },
    { code: 'researcher', display: 'Researcher' },
    { code: 'teacher', display: 'Teacher' },
    { code: 'ict', display: 'ICT professional' }
  ];

  specialtyOptions = [
    { code: 'cardiology', display: 'Cardiology' },
    { code: 'dermatology', display: 'Dermatology' },
    { code: 'family-practice', display: 'Family Practice' },
    { code: 'gastroenterology', display: 'Gastroenterology' },
    { code: 'general-practice', display: 'General Practice' },
    { code: 'pediatrics', display: 'Pediatrics' }
  ];

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  onPractitionerSelected(id: string) {
    // store as a full reference used by PractitionerRole.practitioner.reference
    this.practitionerRef = id ? `Practitioner/${id}` : '';
  }
  onOrganizationSelected(id: string) {
    // store as a full reference used by PractitionerRole.organization.reference
    this.organizationRef = id ? `Organization/${id}` : '';
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    
    // Check for query params to pre-fill
    this.route.queryParams.subscribe(params => {
      if (params['organization']) {
        this.organizationRef = params['organization'];
      }
      if (params['practitioner']) {
        this.practitionerRef = params['practitioner'];
      }
    });

    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getPractitionerRole(this.id).subscribe({
        next: (res: any) => {
          const r = res;
          this.active = r.active !== false;
          this.practitionerRef = r.practitioner?.reference || '';
          this.organizationRef = r.organization?.reference || '';
          this.availabilityExceptions = r.availabilityExceptions || '';

          if (r.code && r.code.length > 0 && r.code[0].coding && r.code[0].coding.length > 0) {
            this.roleCode = r.code[0].coding[0].code || '';
            this.roleDisplay = r.code[0].coding[0].display || '';
          }

          if (r.specialty && r.specialty.length > 0 && r.specialty[0].coding && r.specialty[0].coding.length > 0) {
            this.specialtyCode = r.specialty[0].coding[0].code || '';
            this.specialtyDisplay = r.specialty[0].coding[0].display || '';
          }

          this.loading = false;
        },
        error: (e) => {
          this.error = e.message || 'Failed to load role';
          this.loading = false;
        }
      });
    }
  }

  onRoleChange() {
    const selected = this.roleOptions.find(r => r.code === this.roleCode);
    if (selected) {
      this.roleDisplay = selected.display;
    }
  }

  onSpecialtyChange() {
    const selected = this.specialtyOptions.find(s => s.code === this.specialtyCode);
    if (selected) {
      this.specialtyDisplay = selected.display;
    }
  }

  save() {
    const role: any = {
      resourceType: 'PractitionerRole',
      active: this.active,
      practitioner: this.practitionerRef ? { reference: this.practitionerRef } : undefined,
      organization: this.organizationRef ? { reference: this.organizationRef } : undefined,
      availabilityExceptions: this.availabilityExceptions || undefined,
      code: this.roleCode ? [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/practitioner-role',
          code: this.roleCode,
          display: this.roleDisplay
        }]
      }] : [],
      specialty: this.specialtyCode ? [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/practice-setting-code',
          code: this.specialtyCode,
          display: this.specialtyDisplay
        }]
      }] : []
    };

    if (this.isNew) {
      this.fhir.createPractitionerRole(role).subscribe({
        next: () => this.router.navigate(['/practitioner-roles']),
        error: (e) => this.error = e.message || 'Create failed'
      });
    } else if (this.id) {
      this.fhir.updatePractitionerRole(this.id, role).subscribe({
        next: () => this.router.navigate(['/practitioner-roles']),
        error: (e) => this.error = e.message || 'Update failed'
      });
    }
  }

  remove() {
    if (!this.id) return;
    if (!confirm('Delete this role?')) return;
    this.fhir.deletePractitionerRole(this.id).subscribe({
      next: () => this.router.navigate(['/practitioner-roles']),
      error: (e) => this.error = e.message || 'Delete failed'
    });
  }

  cancel() {
    this.router.navigate(['/practitioner-roles']);
  }
}
