import axios from 'axios';

export class KeycloakAdminService {
  private baseUrl: string;
  private realm: string;
  private adminUser?: string;
  private adminPassword?: string;

  constructor() {
    this.baseUrl = process.env.KEYCLOAK_URL || 'http://localhost:8081';
    this.realm = process.env.KEYCLOAK_REALM || 'public-realm';
    this.adminUser = process.env.KEYCLOAK_ADMIN_USER || process.env.KC_BOOTSTRAP_ADMIN_USERNAME;
    this.adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
  }

  private async getAdminToken(): Promise<string | null> {
    if (!this.adminUser || !this.adminPassword) {
      return null;
    }
    const url = `${this.baseUrl}/realms/master/protocol/openid-connect/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'admin-cli');
    params.append('username', this.adminUser);
    params.append('password', this.adminPassword);

    const resp = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data: any = resp.data || {};
    return data.access_token || null;
  }

  async assignRealmRoleToUser(userId: string, roleName: string): Promise<boolean> {
    try {
      const token = await this.getAdminToken();
      if (!token) {
        console.warn('Keycloak admin credentials not configured; skipping role assignment');
        return false;
      }

      // Fetch role representation
      const roleResp = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/roles/${encodeURIComponent(roleName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const role = roleResp.data;

      // Assign role to user
      await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
        [role],
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      return true;
    } catch (err: any) {
      console.warn('Failed to assign Keycloak role:', err?.message || err);
      return false;
    }
  }
}
