import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-list',
  template: `
  <div class="practitioner-container">
    <div style="display:flex; align-items:center; gap:12px;">
      <h3 style="margin:0">Practitioners</h3>
      <div style="margin-left:auto">
        <button type="button" routerLink="/practitioners/new">Create New Practitioner</button>
      </div>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error">{{error}}</div>

    <div *ngIf="practitioners?.length; else noItems" class="practitioner-list">
      <div *ngFor="let p of practitioners" class="practitioner-card">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <div>
            <div class="practitioner-name">{{p.resource?.name?.[0]?.text || (p.resource?.name?.[0]?.given?.join(' ') + ' ' + p.resource?.name?.[0]?.family) || p.resource?.id}}</div>
            <div class="practitioner-meta">Role: {{p.resource?.qualification?.[0]?.code?.text || '—'}}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center">
            <button type="button" [routerLink]="['/practitioners', p.resource?.id]">Edit</button>
            <div class="practitioner-id">ID: {{p.resource?.id}}</div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #noItems>
      <div class="no-items">No practitioners found.</div>
    </ng-template>
  </div>
  `,
  styles: [
    `
    .practitioner-container { padding: 12px; }
    .practitioner-list { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap:12px }
    .practitioner-card { border:1px solid #e0e0e0; padding:10px; border-radius:6px }
    .practitioner-name { font-weight:600 }
    .practitioner-meta { color:#666; font-size:13px }
    .practitioner-id { font-size:12px; color:#888 }
    `
  ]
})
export class PractitionerListComponent implements OnInit {
  practitioners: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private fhir: FhirService) {}

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getPractitioners().subscribe({
      next: (res: any) => {
        this.practitioners = res.entry || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load practitioners';
        this.loading = false;
      }
    });
  }
}
