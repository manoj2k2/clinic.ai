import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-list',
  template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Practitioners</h3>
      <button type="button" routerLink="/practitioners/new" class="btn btn-primary">Create New Practitioner</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="practitioners?.length; else none" class="card-grid">
      <div *ngFor="let p of practitioners" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{p.resource?.name?.[0]?.text || (p.resource?.name?.[0]?.given?.join(' ') + ' ' + p.resource?.name?.[0]?.family) || p.resource?.id}}</span>
          <span class="badge badge-neutral">ID: {{p.resource?.id}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Qualification:</span>
            <span class="info-value">{{p.resource?.qualification?.[0]?.code?.text || '—'}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/practitioners', p.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No practitioners found.</div>
    </ng-template>
  </div>
  `,
  styles: []
})
export class PractitionerListComponent implements OnInit {
  practitioners: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private fhir: FhirService) { }

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getPractitioners().subscribe({ next: (res: any) => { this.practitioners = res.entry || []; this.loading = false; }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
  }
}