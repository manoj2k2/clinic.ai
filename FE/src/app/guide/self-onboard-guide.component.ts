import { Component } from '@angular/core';

@Component({
  selector: 'app-self-onboard-guide',
  template: `
    <div class="guide-card">
      <ol>
        <li>Log in using your Keycloak account (top-right Login).</li>
        <li>Go to <strong>Self-Onboard</strong> and fill your practitioner details.</li>
        <li>Select an existing Organization or create a new one.</li>
        <li>Submit to create your FHIR Practitioner and PractitionerRole.</li>
        <li>We attach you to one Organization and assign the <em>practitioner</em> role.</li>
        <li>Access the <strong>Practitioner Portal</strong> to manage your clinic.</li>
      </ol>
      <div class="actions">
        <a routerLink="/self-onboard" class="btn btn-primary">Start Self-Onboarding</a>
      </div>
    </div>
  `,
  styles: [
    `.guide-card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:16px}`,
    `.guide-card ol{margin:0 0 12px 20px}`,
    `.actions{display:flex;justify-content:flex-end}`
  ]
})
export class SelfOnboardGuideComponent {}
