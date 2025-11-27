import { Injectable } from '@angular/core';
import { Roles } from './roles';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';

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
  constructor(private oauthService: OAuthService) {
    this.oauthService.configure(authConfig);
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  login() {
    this.oauthService.initCodeFlow();
  }

  logout() {
    this.oauthService.logOut();
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  getIdentityClaims(): any {
    return this.oauthService.getIdentityClaims();
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
    console.log('Access Token:', access);
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
