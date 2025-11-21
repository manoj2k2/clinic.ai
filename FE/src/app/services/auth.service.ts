import { Injectable } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';

const authConfig: AuthConfig = {
  issuer: 'http://localhost:8081/realms/public-realm',
  redirectUri: window.location.origin,
  clientId: 'clinic-fe',
  responseType: 'code',
  scope: 'openid profile email',
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
}
