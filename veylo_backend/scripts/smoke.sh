#!/usr/bin/env bash
# Lightweight gateway smoke tests (no OpenAI/Replicate spend).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_ANON_KEY (anon key is fine for these checks)." >&2
  exit 1
fi

echo "[smoke] REST reachable"
curl -sf "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" >/dev/null

expect_401() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer invalid.jwt.token" \
    -H "Content-Type: application/json" \
    -d '{}')"
  if [[ "$code" != "401" && "$code" != "403" ]]; then
    echo "[smoke] FAIL $name expected 401/403 got $code" >&2
    exit 1
  fi
  echo "[smoke] OK $name (auth enforced)"
}

BASE="$SUPABASE_URL/functions/v1"

expect_401 "tag-item" "$BASE/tag-item"
expect_401 "tryon-status" "$BASE/tryon-status"
expect_401 "recommend-items" "$BASE/recommend-items"
expect_401 "style-chat" "$BASE/style-chat"
expect_401 "generate-avatar" "$BASE/generate-avatar"
expect_401 "moderate-image" "$BASE/moderate-image"
expect_401 "feed-create-post" "$BASE/feed-create-post"
expect_401 "feed-list" "$BASE/feed-list"
expect_401 "feed-toggle-like" "$BASE/feed-toggle-like"
expect_401 "feed-add-comment" "$BASE/feed-add-comment"
expect_401 "feed-follow" "$BASE/feed-follow"
expect_401 "gamification-events" "$BASE/gamification-events"

code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/notifications-send" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer invalid" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000","title":"x"}')"
if [[ "$code" != "401" && "$code" != "403" ]]; then
  echo "[smoke] FAIL notifications-send expected 401/403 got $code" >&2
  exit 1
fi
echo "[smoke] OK notifications-send (auth enforced)"

code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/digest-weekly" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')"
if [[ "$code" != "401" && "$code" != "501" ]]; then
  echo "[smoke] FAIL digest-weekly expected 401/501 without cron secret, got $code" >&2
  exit 1
fi
echo "[smoke] OK digest-weekly (cron gate)"

code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/embeddings-backfill" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')"
if [[ "$code" != "401" && "$code" != "501" ]]; then
  echo "[smoke] FAIL embeddings-backfill expected 401/501 without cron secret, got $code" >&2
  exit 1
fi
echo "[smoke] OK embeddings-backfill (cron gate)"

echo "[smoke] All checks passed."
