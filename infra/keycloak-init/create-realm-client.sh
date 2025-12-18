#!/bin/sh
set -euo pipefail

# Bootstrap Keycloak realm and SPA client.
# Creates realm (if missing) and client clinic-fe with localhost:4200 redirects.

KEYCLOAK_URL=${KEYCLOAK_URL:-http://keycloak:8080}
KEYCLOAK_REALM=${KEYCLOAK_REALM:-public-realm}
KEYCLOAK_ADMIN_USER=${KEYCLOAK_ADMIN_USER:-admin}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-password}
KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-clinic-fe}
SPA_URL=${SPA_URL:-http://localhost:4200}

log() { printf "%s\n" "$*"; }

wait_for_keycloak() {
  log "Waiting for Keycloak at ${KEYCLOAK_URL} ..."
  until curl -fsS "${KEYCLOAK_URL}/realms/master" >/dev/null 2>&1; do
    sleep 3
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

realm_exists() {
  curl -fsS -o /dev/null -w "%{http_code}" \
    "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" 2>/dev/null
}

create_realm() {
  log "Creating realm '${KEYCLOAK_REALM}'..."
  curl -fsS -o /dev/null \
    -X POST "${KEYCLOAK_URL}/admin/realms" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"realm\":\"${KEYCLOAK_REALM}\",\"enabled\":true}"
}

client_exists() {
  curl -fsS "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq 'length > 0'
}

create_client() {
  log "Creating client '${KEYCLOAK_CLIENT_ID}' for SPA ${SPA_URL} ..."
  curl -fsS -o /dev/null \
    -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @- <<EOF
{
  "clientId": "${KEYCLOAK_CLIENT_ID}",
  "enabled": true,
  "protocol": "openid-connect",
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "serviceAccountsEnabled": false,
  "bearerOnly": false,
  "rootUrl": "${SPA_URL}",
  "redirectUris": ["${SPA_URL}/*", "${SPA_URL}"],
  "webOrigins": ["${SPA_URL}", "${SPA_URL}/*"],
  "attributes": {
    "pkce.code.challenge.method": "S256",
    "post.logout.redirect.uris": "${SPA_URL}/*"
  }
}
EOF
}

wait_for_keycloak
ADMIN_TOKEN=$(get_admin_token)

if [ "$(realm_exists)" -ne 200 ]; then
  create_realm
else
  log "Realm '${KEYCLOAK_REALM}' already exists."
fi

if client_exists | grep -q true; then
  log "Client '${KEYCLOAK_CLIENT_ID}' already exists."
else
  create_client
fi

log "Realm and client bootstrap complete."
