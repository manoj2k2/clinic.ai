import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <div class="page-container">
      <section class="hero">
        <h2>Welcome to Clinic.AI</h2>
        <p>Streamline clinical workflows, manage patients, and onboard your clinic in minutes.</p>
        <div class="hero-actions">
          <a routerLink="/self-onboard" class="btn btn-primary">Self-Onboard Your Clinic</a>
          <a routerLink="/guide/self-onboard" class="btn btn-outline">Read the User Guide</a>
        </div>
      </section>

      <section class="features-grid">
        <div class="feature-card">
          <h3>For Practitioners</h3>
          <p>Access your dashboard, appointments, and clinical tools.</p>
          <a routerLink="/practitioner-portal" class="link">Go to Practitioner Portal</a>
        </div>
        <div class="feature-card">
          <h3>For Patients</h3>
          <p>View appointments, records, and interact with the assistant.</p>
          <a routerLink="/patient-portal" class="link">Go to Patient Portal</a>
        </div>
        <div class="feature-card">
          <h3>Assistant</h3>
          <p>Chat with the AI assistant for triage and guidance.</p>
          <a routerLink="/chatbot" class="link">Open Assistant</a>
        </div>
      </section>

      <section class="guide-preview">
        <h3>Quick Start: Self-Onboarding</h3>
        <div class="guide-card">
          <ol>
            <li>Login with your account.</li>
            <li>Open <strong>Self-Onboard</strong> to enter your details.</li>
            <li>Select or create your Organization.</li>
            <li>Submit to finalize and get the practitioner role.</li>
          </ol>
          <div class="actions">
            <a routerLink="/self-onboard" class="btn btn-primary">Start Self-Onboarding</a>
            <a routerLink="/guide/self-onboard" class="btn btn-outline">Read Full Guide</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `.page-container{padding:24px;max-width:1100px;margin:0 auto}`,
    `.hero{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:24px;box-shadow:var(--shadow-sm);}`,
    `.hero h2{margin:0 0 8px}`,
    `.hero-actions{display:flex;gap:12px;margin-top:12px}`,
    `.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px}`,
    `.feature-card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:16px}`,
    `.guide-preview{margin-top:32px}`,
    `.guide-card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:16px}`,
    `.guide-card ol{margin:0 0 12px 20px}`,
    `.actions{display:flex;gap:12px}`
  ]
})
export class HomeComponent {}
