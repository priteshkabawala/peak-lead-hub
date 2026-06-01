#!/usr/bin/env bash
#
# End-to-end smoke test for PeaK Lead Hub auth + data access.
# Runs the exact flow the app performs: login -> fetch profile -> read data.
#
# Usage:
#   ./scripts/smoke-test.sh                       # uses .env.local
#   TEST_EMAIL=you@x.com TEST_PASSWORD=pw ./scripts/smoke-test.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load env from .env.local if present
if [ -f "$ROOT/.env.local" ]; then
  set -a; . "$ROOT/.env.local"; set +a
fi

URL="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL not set}"
ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?NEXT_PUBLIC_SUPABASE_ANON_KEY not set}"
EMAIL="${TEST_EMAIL:-priteshkabawala@gmail.com}"
PASSWORD="${TEST_PASSWORD:-PeaK@2026!}"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; echo "     $2"; exit 1; }

echo "== PeaK Lead Hub smoke test =="
echo "Target: $URL"
echo

# 1. Login
LOGIN=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
  -H 'Content-Type: application/json' -H "apikey: $ANON" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
[ -n "$TOKEN" ] && pass "login succeeds" || fail "login failed" "$LOGIN"

USER_ID=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")

# 2. Profile fetch (this is where RLS recursion would surface)
PROFILE=$(curl -s "$URL/rest/v1/profiles?select=name,role,active&id=eq.$USER_ID" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN")
echo "$PROFILE" | grep -q '"role"' \
  && pass "profile fetch works (no RLS recursion)" \
  || fail "profile fetch failed" "$PROFILE"

# 3. Leads read
LEADS=$(curl -s "$URL/rest/v1/leads?select=id&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN")
echo "$LEADS" | grep -q '"id"' \
  && pass "leads read works" \
  || fail "leads read failed" "$LEADS"

# 4. Audit log read
AUDIT=$(curl -s "$URL/rest/v1/audit_logs?select=id&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN")
echo "$AUDIT" | grep -qE '^\[' \
  && pass "audit_logs read works" \
  || fail "audit_logs read failed" "$AUDIT"

# 5. Wrong password rejected
BAD=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
  -H 'Content-Type: application/json' -H "apikey: $ANON" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"definitely-wrong\"}")
echo "$BAD" | grep -qi 'invalid' \
  && pass "wrong password is rejected" \
  || fail "wrong password was NOT rejected" "$BAD"

echo
echo "All checks passed. 🎉"
