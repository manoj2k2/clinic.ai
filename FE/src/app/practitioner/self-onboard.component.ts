import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';

@Component({
  selector: 'app-self-onboard',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header"><h2>Self-Onboard as Practitioner</h2></div>

      <div *ngIf="error" class="error-msg">{{error}}</div>
      <div *ngIf="success" class="success-msg">{{success}}</div>

      <form (ngSubmit)="submit()">
        <div class="form-section">
          <div class="form-section-title">Your Practitioner Profile</div>
          <div class="form-row">
            <div class="form-field">
              <label>Given Name</label>
              <input [(ngModel)]="givenName" name="givenName" placeholder="e.g. Aryan" />
            </div>
            <div class="form-field">
              <label>Family Name</label>
              <input [(ngModel)]="familyName" name="familyName" placeholder="e.g. Sahani" />
            </div>
          </div>
          <div class="form-field">
            <label>Email</label>
            <input [(ngModel)]="email" name="email" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Organization</div>
          <div class="form-field">
            <label>Select Existing Organization</label>
            <app-resource-selector resourceType="Organization"
              placeholder="Search organizations"
              (selectedId)="onOrganizationSelected($event)"></app-resource-selector>
            <div *ngIf="selectedOrgId">Selected: Organization/{{selectedOrgId}}</div>
          </div>
          <div class="divider" style="margin: 12px 0; text-align:center">— or create new —</div>
          <div class="form-field">
            <label>New Organization Name</label>
            <input [(ngModel)]="orgName" name="orgName" placeholder="Clinic/Practice Name" />
          </div>
        </div>

        <div class="actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px">
          <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn btn-primary">Register</button>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: []
})
export class SelfOnboardComponent {
  givenName = '';
  familyName = '';
  email = '';
  selectedOrgId: string | null = null;
  orgName = '';

  error: string | null = null;
  success: string | null = null;
  busy = false;

  constructor(
    private fhir: FhirService,
    private auth: AuthService,
    private router: Router,
    @Inject(OnboardingService) private onboarding: OnboardingService
  ) {
    const claims = this.auth.getIdentityClaims();
    const name = (claims?.name || '').toString();
    const parts = name.split(' ');
    this.givenName = parts.length > 0 ? parts[0] : '';
    this.familyName = parts.slice(1).join(' ');
    this.email = (claims?.email || '').toString();
  }

  onOrganizationSelected(id: string) {
    this.selectedOrgId = id || null;
  }

  async submit() {
    if (this.busy) return;
    this.error = null; this.success = null; this.busy = true;
    try {
      // Ensure we have an IAM user ID
      const iamUserId = this.auth.getUserId();
      if (!iamUserId) {
        this.error = 'You must be logged in to self-onboard.';
        this.busy = false; return;
      }

      // Create organization if not selected
      let orgId = this.selectedOrgId;
      if (!orgId) {
        if (!this.orgName) {
          this.error = 'Please select an existing organization or provide a new organization name.';
          this.busy = false; return;
        }
        const orgRes: any = await this.fhir.createOrganization({
          resourceType: 'Organization',
          name: this.orgName
        }).toPromise();
        orgId = orgRes?.id;
      }
      if (!orgId) throw new Error('Failed to resolve organization ID');

      // Create Practitioner from user info
      const practitionerRes: any = await this.fhir.createPractitioner({
        resourceType: 'Practitioner',
        active: true,
        name: [{ use: 'official', given: this.givenName ? [this.givenName] : [], family: this.familyName }],
        telecom: this.email ? [{ system: 'email', value: this.email }] : []
      }).toPromise();
      const practitionerId = practitionerRes?.id;
      if (!practitionerId) throw new Error('Failed to create practitioner');

      // Create PractitionerRole linking practitioner to organization
      await this.fhir.createPractitionerRole({
        resourceType: 'PractitionerRole',
        active: true,
        practitioner: { reference: `Practitioner/${practitionerId}` },
        organization: { reference: `Organization/${orgId}` }
      }).toPromise();

      // Register mapping + assign Keycloak role
      const resp = await this.onboarding.registerPractitioner({
        iamUserId,
        fhirPractitionerId: practitionerId,
        fhirOrganizationId: orgId
      }).toPromise();

      if (resp?.success) {
        this.success = 'You are now registered as a practitioner.';
        // Navigate to practitioner portal
        setTimeout(() => this.router.navigate(['/practitioner-portal']), 800);
      } else {
        this.error = resp?.message || 'Registration partially failed.';
      }
    } catch (e: any) {
      this.error = e?.message || 'Failed to self-onboard.';
    } finally {
      this.busy = false;
    }
  }

  cancel() {
    this.router.navigate(['/']);
  }
}
