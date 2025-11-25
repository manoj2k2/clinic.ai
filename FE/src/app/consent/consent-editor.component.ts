import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-consent-editor',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Consent</h2>
        <h2 *ngIf="!isNew">Edit Consent</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        
        <div class="form-section">
          <div class="form-section-title">Basic Information</div>
          <div class="form-row">
            <div class="form-field">
              <label>Patient Reference</label>
              <input type="text" [(ngModel)]="patientRef" name="patientRef" placeholder="Patient/f001" />
            </div>
            <div class="form-field">
              <label>Status</label>
              <select [(ngModel)]="status" name="status">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="entered-in-error">Entered in Error</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Date Time</label>
              <input type="date" [(ngModel)]="dateTime" name="dateTime" />
            </div>
            <div class="form-field">
              <label>Organization Reference</label>
              <input type="text" [(ngModel)]="organizationRef" name="organizationRef" placeholder="Organization/f001" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Scope & Category</div>
          <div class="form-row">
            <div class="form-field">
              <label>Scope Code</label>
              <input type="text" [(ngModel)]="scopeCode" name="scopeCode" placeholder="patient-privacy" />
            </div>
            <div class="form-field">
              <label>Category Code</label>
              <input type="text" [(ngModel)]="categoryCode" name="categoryCode" placeholder="59284-0" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Policy & Attachment</div>
          <div class="form-field">
            <label>Policy Rule Code</label>
            <input type="text" [(ngModel)]="policyRuleCode" name="policyRuleCode" placeholder="OPTIN" />
          </div>
          <div class="form-field">
            <label>Source Attachment Title</label>
            <input type="text" [(ngModel)]="sourceAttachmentTitle" name="sourceAttachmentTitle" placeholder="Terms of consent..." />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Provision</div>
          <div class="form-row">
            <div class="form-field">
              <label>Type</label>
              <select [(ngModel)]="provisionType" name="provisionType">
                <option value="deny">Deny</option>
                <option value="permit">Permit</option>
              </select>
            </div>
            <div class="form-field">
              <label>Actor Role</label>
              <input type="text" [(ngModel)]="provisionActorRole" name="provisionActorRole" placeholder="PRCP" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Actor Reference</label>
              <input type="text" [(ngModel)]="provisionActorRef" name="provisionActorRef" placeholder="Organization/f001" />
            </div>
            <div class="form-field">
              <label>Actions (comma separated)</label>
              <input type="text" [(ngModel)]="provisionActions" name="provisionActions" placeholder="access, correct" />
            </div>
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
export class ConsentEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  error: string | null = null;

  // Form fields
  patientRef = '';
  status = 'active';
  dateTime = '';
  organizationRef = '';
  scopeCode = 'patient-privacy';
  categoryCode = '59284-0';
  policyRuleCode = 'OPTIN';
  sourceAttachmentTitle = '';

  provisionType = 'deny';
  provisionActorRole = 'PRCP';
  provisionActorRef = '';
  provisionActions = 'access, correct';

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getConsent(this.id).subscribe({
        next: (res: any) => {
          const r = res;
          this.patientRef = r.patient?.reference || '';
          this.status = r.status || 'active';
          this.dateTime = r.dateTime ? r.dateTime.split('T')[0] : '';
          this.organizationRef = r.organization?.[0]?.reference || '';

          this.scopeCode = r.scope?.coding?.[0]?.code || '';
          this.categoryCode = r.category?.[0]?.coding?.[0]?.code || '';
          this.policyRuleCode = r.policyRule?.coding?.[0]?.code || '';
          this.sourceAttachmentTitle = r.sourceAttachment?.title || '';

          if (r.provision) {
            this.provisionType = r.provision.type || 'deny';
            this.provisionActorRole = r.provision.actor?.[0]?.role?.coding?.[0]?.code || '';
            this.provisionActorRef = r.provision.actor?.[0]?.reference?.reference || '';
            this.provisionActions = r.provision.action?.map((a: any) => a.coding?.[0]?.code).join(', ') || '';
          }

          this.loading = false;
        }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
      });
    }
  }

  save() {
    const consent: any = {
      resourceType: 'Consent',
      status: this.status,
      scope: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: this.scopeCode
        }]
      },
      category: [{
        coding: [{
          system: 'http://loinc.org',
          code: this.categoryCode
        }]
      }],
      patient: {
        reference: this.patientRef,
        display: 'P. van de Heuvel'
      },
      dateTime: this.dateTime,
      organization: [{
        reference: this.organizationRef
      }],
      sourceAttachment: {
        title: this.sourceAttachmentTitle
      },
      policyRule: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: this.policyRuleCode
        }]
      },
      provision: {
        type: this.provisionType,
        actor: [{
          role: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: this.provisionActorRole
            }]
          },
          reference: {
            reference: this.provisionActorRef
          }
        }],
        action: this.provisionActions.split(',').map(s => ({
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/consentaction',
            code: s.trim()
          }]
        }))
      }
    };

    if (this.isNew) {
      this.fhir.createConsent(consent).subscribe({ next: () => this.router.navigate(['/consents']), error: (e) => this.error = e.message || 'Create failed' });
    } else if (this.id) {
      this.fhir.updateConsent(this.id, consent).subscribe({ next: () => this.router.navigate(['/consents']), error: (e) => this.error = e.message || 'Update failed' });
    }
  }

  remove() {
    if (!this.id) return;
    if (!confirm('Delete this consent?')) return;
    this.fhir.deleteConsent(this.id).subscribe({ next: () => this.router.navigate(['/consents']), error: (e) => this.error = e.message || 'Delete failed' });
  }

  cancel() { this.router.navigate(['/consents']); }
}
