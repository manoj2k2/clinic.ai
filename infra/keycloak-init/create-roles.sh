#!/bin/sh
set -euo pipefail

# Simple Keycloak bootstrap for realm roles used by the SPA.
# See infra/keycloak-roles-setup.md for details.

KEYCLOAK_URL=${KEYCLOAK_URL:-http://keycloak:8080}
KEYCLOAK_REALM=${KEYCLOAK_REALM:-public-realm}
KEYCLOAK_ADMIN_USER=${KEYCLOAK_ADMIN_USER:-admin}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-password}
KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-clinic-fe}
ROLES="patient practitioner admin clinician staff billing researcher auditor"

log() { printf "%s\n" "$*"; }

wait_for_keycloak() {
  log "Waiting for Keycloak at ${KEYCLOAK_URL} ..."
  until curl -fsS "${KEYCLOAK_URL}/realms/master" >/dev/null 2>&1; do
    sleep 2
  done
  log "Keycloak is reachable."
}

get_admin_token() {
  curl -fsS -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${KEYCLOAK_ADMIN_USER}" \
    -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | jq -r .access_token
}

create_realm_role() {
  role_name="$1"
  curl -fsS -o /dev/null -w "%{http_code}" \
    -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${role_name}\"}" || true
}

wait_for_keycloak
ADMIN_TOKEN=$(get_admin_token)

log "Ensuring realm roles exist in realm '${KEYCLOAK_REALM}'..."
for r in $ROLES; do
  log " - creating role: ${r}"
  create_realm_role "$r"
done

log "Role bootstrap complete."


