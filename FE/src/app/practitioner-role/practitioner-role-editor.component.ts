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
              <input type="text" [(ngModel)]="practitionerRef" name="practitionerRef" placeholder="Practitioner/123" />
            </div>
            <div class="form-field">
              <label>Organization Reference</label>
              <input type="text" [(ngModel)]="organizationRef" name="organizationRef" placeholder="Organization/123" />
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
  styles: [`
    .editor-container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .editor-card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .page-header { margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
    .page-header h2 { margin: 0; color: #1e293b; font-size: 24px; }
    .form-section { margin-bottom: 32px; }
    .form-section-title { font-size: 18px; font-weight: 600; color: #334155; margin-bottom: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-field { margin-bottom: 16px; }
    .form-field label { display: block; margin-bottom: 8px; font-weight: 500; color: #475569; font-size: 14px; }
    .form-field input, .form-field select, .form-field textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; transition: border-color 0.2s; }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus { outline: none; border-color: #3b82f6; ring: 2px solid #bfdbfe; }
    .btn { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; }
    .btn-primary { background-color: #3b82f6; color: white; }
    .btn-secondary { background-color: #f1f5f9; color: #475569; }
    .btn-danger { background-color: #ef4444; color: white; }
    .loading { text-align: center; padding: 40px; color: #64748b; }
    .error-msg { background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
  `]
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
