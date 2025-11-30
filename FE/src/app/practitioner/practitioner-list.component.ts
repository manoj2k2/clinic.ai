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
      <div *ngFor="let p of practitioners">
        <app-practitioner-card [practitioner]="p.resource"></app-practitioner-card>
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