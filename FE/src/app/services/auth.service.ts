import { Injectable } from '@angular/core';
import { Roles } from './roles';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

const authConfig: AuthConfig = {
  issuer: 'http://localhost:8081/realms/public-realm',
  redirectUri: window.location.origin,
  clientId: 'clinic-fe',
  responseType: 'code',
  scope: 'openid profile email roles',
  showDebugInformation: true
};

@Injectable()
export class AuthService {
  private activePatientId: string | null = null;
  private chatServiceUrl = 'http://localhost:3001';

  constructor(private oauthService: OAuthService, private http: HttpClient) {
    this.oauthService.configure(authConfig);
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  login() {
    this.oauthService.initCodeFlow();
  }

  logout() {
    this.oauthService.logOut();
    sessionStorage.removeItem('patientId');
    sessionStorage.removeItem('availablePatientIds');
    this.activePatientId = null;
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  getIdentityClaims(): any {
    return this.oauthService.getIdentityClaims();
  }

  /**
   * Get the authenticated user's IAM ID (subject).
   */
  getUserId(): string | null {
    const claims = this.getIdentityClaims();
    return claims?.sub || null;
  }

  /**
   * Get all FHIR patient IDs accessible to the logged-in user (family members).
   * Fetches from backend mapping table.
   */
  getAvailablePatientIds(): Observable<string[]> {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('User not authenticated');
      return of([]);
    }

    // Check cache first
    const cached = sessionStorage.getItem('availablePatientIds');
    if (cached) {
      return of(JSON.parse(cached));
    }

    // Fetch from backend
    return this.http.get<any>(`${this.chatServiceUrl}/api/users/${userId}/patients`).pipe(
      tap((response) => {
        if (response.success && response.patientIds) {
          sessionStorage.setItem('availablePatientIds', JSON.stringify(response.patientIds));
        }
      }),
      catchError((error) => {
        console.error('Failed to fetch patient IDs:', error);
        return of([]);
      })
    );
  }

  /**
   * Get the primary/active patient ID synchronously (from cache).
   * Use getPrimaryPatientObservable() for async fetch.
   */
  getPatientId(): string | null {
    // Return active if set
    if (this.activePatientId) {
      return this.activePatientId;
    }

    // Check sessionStorage
    const stored = sessionStorage.getItem('patientId');
    if (stored) {
      this.activePatientId = stored;
      return stored;
    }

    return null;
  }

  /**
   * Get primary patient as Observable (async).
   * Fetches from backend or returns cached value.
   */
  getPrimaryPatientObservable(): Observable<string | null> {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('User not authenticated');
      return of(null);
    }

    const patientId = this.getPatientId();
    if (patientId) {
      return of(patientId);
    }

    // Fetch primary patient from backend
    return this.http.get<any>(`${this.chatServiceUrl}/api/users/${userId}/patients/primary`).pipe(
      tap((response) => {
        if (response.success && response.primaryPatientId) {
          this.activePatientId = response.primaryPatientId;
          sessionStorage.setItem('patientId', response.primaryPatientId);
        }
      }),
      catchError((error) => {
        console.warn('Failed to fetch primary patient:', error);
        return of(null);
      })
    );
  }

  /**
   * Set the active patient ID (for switching between family members).
   * Updates backend and local state.
   */
  setActivePatientId(patientId: string): Observable<boolean> {
    const userId = this.getUserId();
    if (!userId) {
      return of(false);
    }

    // Update backend
    return this.http.put<any>(
      `${this.chatServiceUrl}/api/users/${userId}/patients/${patientId}/primary`,
      {}
    ).pipe(
      tap((response) => {
        if (response.success) {
          this.activePatientId = patientId;
          sessionStorage.setItem('patientId', patientId);
        }
      }),
      catchError((error) => {
        console.error('Failed to set primary patient:', error);
        return of(false);
      })
    );
  }

  /**
   * Add a new patient mapping for the current user.
   * Called after creating a new FHIR patient.
   */
  addPatientMapping(patientId: string, isPrimary: boolean = false): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      console.error('User not authenticated');
      return of(null);
    }

    return this.http.post<any>(
      `${this.chatServiceUrl}/api/users/${userId}/patients`,
      { patientId, isPrimary }
    ).pipe(
      tap((response) => {
        if (response.success) {
          // Clear cache so it's refreshed on next call
          sessionStorage.removeItem('availablePatientIds');
          if (isPrimary) {
            this.activePatientId = patientId;
            sessionStorage.setItem('patientId', patientId);
          }
        }
      }),
      catchError((error) => {
        console.error('Failed to add patient mapping:', error);
        return of(error);
      })
    );
  }

  /**
   * Get the access token for making API calls.
   */
  getAccessToken(): string | null {
    return this.oauthService.getAccessToken() || null;
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // atob works in browser; handle padding
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch (e) {
      return {};
    }
  }

  /**
   * Extract roles from identity claims. Supports Keycloak style `realm_access.roles`
   * and generic `roles` claim.
   */
  getRoles(): string[] {
    const claims: any = this.getIdentityClaims() || {};
    const roles = new Set<string>();

    // ID token / identity claims
    if (claims.realm_access && Array.isArray(claims.realm_access.roles)) {
      claims.realm_access.roles.forEach((r: string) => roles.add(r));
    }
    if (Array.isArray(claims.roles)) {
      claims.roles.forEach((r: string) => roles.add(r));
    }
    if (claims.resource_access) {
      for (const key of Object.keys(claims.resource_access)) {
        const ra = claims.resource_access[key];
        if (ra && Array.isArray(ra.roles)) {
          ra.roles.forEach((r: string) => roles.add(r));
        }
      }
    }

    // Access token may contain resource_access or realm_access as well
    const access = this.oauthService.getAccessToken();
    if (access) {
      const payload = this.decodeJwt(access) || {};
      if (payload.realm_access && Array.isArray(payload.realm_access.roles)) {
        payload.realm_access.roles.forEach((r: string) => roles.add(r));
      }
      if (payload.resource_access) {
        for (const key of Object.keys(payload.resource_access)) {
          const ra = payload.resource_access[key];
          if (ra && Array.isArray(ra.roles)) {
            ra.roles.forEach((r: string) => roles.add(r));
          }
        }
      }
    }

    return Array.from(roles);
  }

  hasRole(role: Roles | string): boolean {
    return this.getRoles().includes(role as string);
  }

  hasAnyRole(roles: Array<Roles | string>): boolean {
    const my = this.getRoles();
    return roles.some(r => my.includes(r as string));
  }
}
