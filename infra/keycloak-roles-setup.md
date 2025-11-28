# Keycloak: Configure Roles for `public-realm` and `clinic-fe` client

This document contains step-by-step instructions to create realm-level and client-level roles in Keycloak, assign them to users or clients, and configure token mappers so roles appear in ID/access tokens. Replace placeholders (like admin password, user ids) with values for your environment.

Roles to create (matches `FE/src/app/services/roles.ts`):

- `patient`
- `practitioner`
- `admin`
- `clinician`
- `staff`
- `billing`
- `researcher`
- `auditor`

These can be created as realm roles (recommended for cross-client roles) or as client roles under the `clinic-fe` client when you need client-scoped roles.

---

## Assumptions

- Keycloak is reachable at `http://localhost:8081` and the realm exists: `public-realm`.
- You have an admin user (`admin`) with a known password, or access to the Keycloak admin UI.
- The client `clinic-fe` exists in the realm and represents your SPA.

If you run Keycloak in Docker Compose, the container name often is `keycloak` or `kc`. Adjust accordingly.

---

## 1) Quick UI steps (Admin Console)

1. Open Admin Console: `http://localhost:8081/` and log in as `admin`.
2. From the left menu select `Realms` → `public-realm`.

### Create realm roles
3. Go to `Roles` → `Add Role`.
4. For each role name from the list above, add a role (e.g., `practitioner`). Optionally add a description.

### Create client roles (optional)
5. Go to `Clients`, open the `clinic-fe` client, then choose `Roles` tab.
6. Add roles that should be client-scoped (if you prefer client-level roles rather than realm roles).

### Assign roles to users
7. Go to `Users`, open the test user, go to the `Role Mappings` tab.
8. From `Available Roles` choose either `Realm Roles` or the client (under `Client Roles`), then `Add selected`.

### Make roles available in tokens
9. For realm roles: Keycloak will include them in the `realm_access.roles` claim by default in the token (ID/access) when the client has the role scope enabled.
10. For client roles that you want in `resource_access`, ensure the `clinic-fe` client has `Full Scope Allowed` enabled or add a mapper:

    - In the `clinic-fe` client, go to `Client Scopes` or `Mappers`.
    - Add a mapper of type `User Client Role` (protocol `openid-connect`), name it `client-roles`, token claim name `resource_access`, and make it `Add to ID token` / `Add to access token`.

11. Save changes.

---

## 2) CLI (kcadm.sh) commands

If you prefer scripts, `kcadm.sh` (Keycloak admin CLI) is useful. Example assumes container `keycloak` and Keycloak distribution path `/opt/keycloak/bin/kcadm.sh`.

Authenticate (run from host):

```powershell
# enter the container and run kcadm
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8081/auth --realm master --user admin --password "<ADMIN-PASSWORD>"
```

Create a realm role:

```powershell
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh create roles -r public-realm -s name=practitioner -s description="Practitioner role"
```

Create multiple roles by repeating the previous command with different names (patient, admin, etc.).

Create a client role (get client internal id first):

```powershell
# get client internal id for clientId=clinic-fe
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh get clients -r public-realm -q clientId=clinic-fe
# from the returned JSON note the "id" value (UUID)

# create a client role
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh create clients/<CLIENT_UUID>/roles -r public-realm -s name=clinic-user
```

Assign a realm role to a user (get user id first):

```powershell
# find user id
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh get users -r public-realm -q username=jane

# assign role (replace USER_ID and ROLE_JSON)
docker exec -i keycloak /opt/keycloak/bin/kcadm.sh create users/USER_ID/role-mappings/realm -r public-realm -f - <<'EOF'
[{"id":"<ROLE-ID>","name":"practitioner"}]
EOF
```

To find a role's id:

```powershell
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh get roles -r public-realm
```

---

## 3) REST API (curl) examples

Get admin access token:

```bash
# Replace password and host as needed
ADMIN_PW="<ADMIN-PASSWORD>"
TOKEN=$(curl -s -X POST "http://localhost:8081/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=${ADMIN_PW}&grant_type=password&client_id=admin-cli" | jq -r .access_token)
```

Create a realm role:

```bash
curl -s -X POST "http://localhost:8081/admin/realms/public-realm/roles" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"practitioner","description":"Practitioner role"}'
```

Create a client role (get client internal id first):

```bash
# find client internal id
CLIENT_ID=$(curl -s -X GET "http://localhost:8081/admin/realms/public-realm/clients?clientId=clinic-fe" -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')

curl -s -X POST "http://localhost:8081/admin/realms/public-realm/clients/${CLIENT_ID}/roles" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"clinic-user","description":"Clinic FE scoped role"}'
```

Assign realm role to a user:

```bash
# find user id
USER_ID=$(curl -s -X GET "http://localhost:8081/admin/realms/public-realm/users?username=jane" -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')

# find role representation
ROLE_JSON=$(curl -s -X GET "http://localhost:8081/admin/realms/public-realm/roles/practitioner" -H "Authorization: Bearer ${TOKEN}")

curl -s -X POST "http://localhost:8081/admin/realms/public-realm/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "[${ROLE_JSON}]"
```

---

## 4) Ensure roles are included in tokens

- Realm roles will appear in `realm_access.roles` by default.
- Client roles typically appear under `resource_access.{clientId}.roles`. If they do not appear, ensure:
  - Client `clinic-fe` has `Full Scope Allowed` turned on (in client settings), or
  - Add mappers to the client: `User Realm Role` or `User Client Role` mappers and set `Add to ID token` and `Add to access token`.

Example: create a mapper (REST):

```bash
# Create a user client role mapper to include client roles in tokens
curl -s -X POST "http://localhost:8081/admin/realms/public-realm/clients/${CLIENT_ID}/protocol-mappers/models" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"client-roles-mapper",
    "protocol":"openid-connect",
    "protocolMapper":"oidc-usermodel-client-role-mapper",
    "consentRequired":false,
    "config":{
      "multivalued":"true",
      "userinfo.token.claim":"false",
      "id.token.claim":"true",
      "access.token.claim":"true",
      "claim.name":"resource_access",
      "jsonType.label":"JSON"
    }
  }'
```

Note: mapper config keys vary depending on Keycloak version; the Admin Console UI is the easiest place to create mappers correctly.

---

## 5) Common troubleshooting

- If roles are not present in token, inspect the raw token (https://jwt.io) or decode locally: `echo $TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson'`.
- Make sure the user has the role assigned (check `Role Mappings` in the Admin Console).
- For client roles, ensure you're checking `resource_access` claim with the right clientId key.

---

## 6) Example quick script (bash)

This script creates the realm roles used in the FE app.

```bash
#!/usr/bin/env bash
set -e
ADMIN_PW="<ADMIN-PASSWORD>"
TOKEN=$(curl -s -X POST "http://localhost:8081/realms/master/protocol/openid-connect/token" -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin&password=${ADMIN_PW}&grant_type=password&client_id=admin-cli" | jq -r .access_token)
for r in patient practitioner admin clinician staff billing researcher auditor; do
  echo "Creating role: $r"
  curl -s -X POST "http://localhost:8081/admin/realms/public-realm/roles" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"name\":\"${r}\"}" || true
done
echo "Roles ensured."
```

---

If you want, I can:

- Add a PowerShell version of the quick script suitable for Windows.
- Add a tailored script that creates client roles under `clinic-fe` instead of realm roles.
- Create example curl commands to add roles to a specific test user that exists in your Keycloak instance.

Place this file under version control and follow the instructions for your chosen method (UI vs CLI vs REST). Replace passwords and IDs with your environment values.
