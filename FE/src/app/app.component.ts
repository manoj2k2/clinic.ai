import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Roles } from './services/roles';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  mobileMenuOpen = false;
  public Roles = Roles;

  constructor(public auth: AuthService) { }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
