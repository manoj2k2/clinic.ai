import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-role-list',
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Practitioner Roles</h2>
        <button routerLink="/practitioner-roles/new" class="btn btn-primary">Add Role</button>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <div *ngIf="!loading" class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Practitioner</th>
              <th>Organization</th>
              <th>Role</th>
              <th>Specialty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let role of roles">
              <td>{{ getPractitionerName(role) }}</td>
              <td>{{ getOrganizationName(role) }}</td>
              <td>{{ getRoleName(role) }}</td>
              <td>{{ getSpecialtyName(role) }}</td>
              <td class="actions-cell">
                <button [routerLink]="['/practitioner-roles', role.id]" class="btn btn-sm btn-outline">Edit</button>
              </td>
            </tr>
            <tr *ngIf="roles.length === 0">
              <td colspan="5" class="text-center">No practitioner roles found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .data-table th { background-color: #f8fafc; font-weight: 600; color: #475569; }
    .actions-cell { white-space: nowrap; width: 1%; }
    .text-center { text-align: center; color: #64748b; padding: 24px; }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; text-decoration: none; display: inline-block; }
    .btn-primary { background-color: #3b82f6; color: white; }
    .btn-primary:hover { background-color: #2563eb; }
    .btn-outline { background-color: transparent; border: 1px solid #e2e8f0; color: #475569; }
    .btn-outline:hover { background-color: #f8fafc; }
    .btn-sm { padding: 4px 8px; font-size: 14px; }
    .loading { text-align: center; padding: 40px; color: #64748b; }
    .error-msg { background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
  `]
})
export class PractitionerRoleListComponent implements OnInit {
  roles: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(private fhir: FhirService) { }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles() {
    this.loading = true;
    this.fhir.getPractitionerRoles().subscribe({
      next: (res: any) => {
        this.roles = res.entry ? res.entry.map((e: any) => e.resource) : [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load roles';
        this.loading = false;
      }
    });
  }

  getPractitionerName(role: any): string {
    return role.practitioner?.display || role.practitioner?.reference || '-';
  }

  getOrganizationName(role: any): string {
    return role.organization?.display || role.organization?.reference || '-';
  }

  getRoleName(role: any): string {
    if (role.code && role.code.length > 0 && role.code[0].coding && role.code[0].coding.length > 0) {
      return role.code[0].coding[0].display || role.code[0].coding[0].code;
    }
    return '-';
  }

  getSpecialtyName(role: any): string {
    if (role.specialty && role.specialty.length > 0 && role.specialty[0].coding && role.specialty[0].coding.length > 0) {
      return role.specialty[0].coding[0].display || role.specialty[0].coding[0].code;
    }
    return '-';
  }
}
