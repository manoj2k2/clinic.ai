import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Roles } from './roles';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const required: Array<Roles | string> = route.data && route.data['roles'] ? route.data['roles'] : [];
    if (!required || required.length === 0) {
      return true;
    }
    if (this.auth.hasAnyRole(required)) {
      return true;
    }
    // Not authorized — redirect to home or login
    return this.router.parseUrl('/');
  }
}
