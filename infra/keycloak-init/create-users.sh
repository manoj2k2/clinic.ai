#!/bin/sh
set -euo pipefail

# Create initial users and assign realm roles.
# Users:
# 1) patient / password: patient / role: patient
# 2) doctor  / password: doctor  / role: practitioner

KEYCLOAK_URL=${KEYCLOAK_URL:-http://keycloak:8080}
KEYCLOAK_REALM=${KEYCLOAK_REALM:-public-realm}
KEYCLOAK_ADMIN_USER=${KEYCLOAK_ADMIN_USER:-admin}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-password}

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

get_user_id() {
  username="$1"
  curl -fsS "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq -r '.[0].id // empty'
}

create_user() {
  username="$1"
  password="$2"
  log "Ensuring user '${username}' exists..."
  user_id=$(get_user_id "$username")
  if [ -z "$user_id" ] || [ "$user_id" = "null" ]; then
    curl -fsS -o /dev/null \
      -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"${username}\",\"enabled\":true}"
    user_id=$(get_user_id "$username")
    log " - created user with id ${user_id}"
  else
    log " - user already exists (id ${user_id})"
  fi

  log " - setting password"
  curl -fsS -o /dev/null \
    -X PUT "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${user_id}/reset-password" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"password\",\"value\":\"${password}\",\"temporary\":false}"

  echo "$user_id"
}

get_role_json() {
  role_name="$1"
  curl -fsS "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${role_name}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" 2>/dev/null
}

assign_realm_role() {
  user_id="$1"
  role_name="$2"
  log " - assigning role '${role_name}'"
  role_json=$(get_role_json "$role_name") || true
  if [ -z "$role_json" ] || [ "$role_json" = "null" ]; then
    log "   ! role '${role_name}' not found; skipping"
    return
  fi
  curl -fsS -o /dev/null \
    -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${user_id}/role-mappings/realm" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "[${role_json}]"
}

wait_for_keycloak
ADMIN_TOKEN=$(get_admin_token)

patient_id=$(create_user "patient" "patient")
assign_realm_role "$patient_id" "patient"

doctor_id=$(create_user "doctor" "doctor")
assign_realm_role "$doctor_id" "practitioner"

log "User bootstrap complete."
