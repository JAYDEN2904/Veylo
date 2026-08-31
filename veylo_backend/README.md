# Veylo Backend (Supabase)

Postgres schema, Row Level Security, Edge Functions (Deno), and Storage live under `supabase/`.

**Project ref:** `igeyjmcfklymyeaahmtw`  
**Region:** eu-west-1

## Prerequisites

- **Node/npm** — repo scripts run the CLI via `npx supabase` (no global install required).
- **Docker** — optional, for `supabase start` local stack only.

## CLI authentication (required once)

The CLI needs a **Supabase account token** (not your anon key):

```bash
npm run backend:login
```

That stores credentials locally (browser flow). **Alternatively**, create an access token in [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) and run:

```bash
export SUPABASE_ACCESS_TOKEN='your-token-here'
```

(CI uses `SUPABASE_ACCESS_TOKEN`; never commit it.)

## Link & deploy

From repo root:

```bash
npm run backend:login   # once per machine (skip if token env is set)
npm run backend:link    # once — binds CLI to the hosted project
npm run backend:push    # apply migrations to linked remote
npm run backend:fns:deploy
npm run backend:types   # regenerate src/types/database.types.ts (needs login)
```

Or from this folder:

```bash
cd veylo_backend
npx supabase link --project-ref igeyjmcfklymyeaahmtw
npx supabase db push
npx supabase functions deploy
```

## Troubleshooting `db push`: migration history mismatch

If you see **Remote migration versions not found in local migrations directory**, the hosted DB recorded migrations whose timestamps **do not match** the filenames in `supabase/migrations/` (for example remote `20260421…` vs local `20260420120000…`). Supabase blocks push until history aligns.

**Back up or snapshot before changing migration history** if this database matters.

### Baseline fix when remote schema already matches repo baseline SQL

From repo root:

```bash
cd veylo_backend
```

**1.** Drop orphaned remote-only version rows (use exactly the versions the CLI suggested):

```bash
npx supabase migration repair --status reverted 20260421003525 20260421004832 20260421005011 20260421005046
```

**2.** Record your **local** baseline migrations as already applied (updates history only — does not re-run SQL):

```bash
npx supabase migration repair --status applied 20260420120000 20260420120001 20260420130000
```

**3.** Push the rest from repo root:

```bash
cd ..
npm run backend:push
```

If step 3 errors with **already exists**, your remote schema does not match these migration files — stop, compare schema in the Dashboard, or use `npx supabase db pull` and reconcile.

### Inspect history

```bash
cd veylo_backend && npx supabase migration list --linked
```

More context: [Managing environments / migrations](https://supabase.com/docs/guides/cli/managing-environments).

## Secrets (hosted)

Dashboard → Project Settings → Edge Functions → Secrets, or:

```bash
cd veylo_backend
npx supabase secrets set \
  OPENAI_API_KEY=sk-... \
  GCP_PROJECT_ID=your-gcp-project \
  GCP_LOCATION=us-central1 \
  GCP_SA_CLIENT_EMAIL=vertex-sa@your-project.iam.gserviceaccount.com \
  GCP_SA_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n' \
  OPENWEATHER_API_KEY=... \
  CRON_SECRET=$(openssl rand -hex 32) \
  --project-ref igeyjmcfklymyeaahmtw
```

**Google Vertex AI setup:** Enable the Vertex AI API on your GCP project. Create a service account with **Vertex AI User** (`roles/aiplatform.user`). Paste the JSON private key into `GCP_SA_PRIVATE_KEY` (keep `\n` line breaks). Models used: `virtual-try-on-001` (try-on), `imagen-3.0-capability-001` (avatars).

Optional: `SENTRY_EDGE_DSN`, `EXPO_ACCESS_TOKEN`.

`SUPABASE_*` keys are injected automatically — do not set manually.

## Cron jobs (`pg_cron` + `pg_net`)

Migration `20260507100900_pg_cron.sql` attempts to enable extensions and documents scheduling. On hosted Supabase, enable **pg_cron** and **pg_net** in Dashboard → Database → Extensions if the migration warns.

Scheduled Edge Functions (`digest-weekly`, `embeddings-backfill`) expect header:

`x-cron-secret: <CRON_SECRET>` (same value as the secret above).

Alternatively use Dashboard **Scheduled Functions** to invoke those URLs on a timer.

## Documentation

- [supabase/API.md](./supabase/API.md) — full HTTP/RPC reference + curl smoke tests.

## Smoke test

```bash
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
npm run backend:smoke
```

See `scripts/smoke.sh` for steps and assertions.

## Security hardening (2026-07-27)

### Rate limits + spend caps

All user-facing Edge Functions call `guardEndpoint` (user + IP fixed-window limits). Paid AI endpoints also enforce:

- **Global daily spend cap** — sum of `api_usage.cost_usd` for the UTC day; default `$10` via `DAILY_SPEND_CAP_USD`.
- **Per-user daily op caps** — try-on 20, avatar 5, tag-item 60, embeddings 100 (env-overridable).

Paid endpoints **fail closed** if the limiter/ledger is unavailable (prefer temporary unavailability over unbounded spend).

Set optional secrets:

```bash
npx supabase secrets set DAILY_SPEND_CAP_USD=10 --project-ref igeyjmcfklymyeaahmtw
```

### Manual Dashboard steps (cannot be done from migrations)

1. **Auth → Attack Protection** — enable [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) (HaveIBeenPwned).
2. **Auth rate limits** — review login/signup/OTP limits under Authentication → Rate Limits.
3. Optional: enable CAPTCHA for signup.
4. **Confirm sign up email template (OTP)** — Authentication → Email Templates → **Confirm sign up**.
   - Subject: `Your Veylo verification code`
   - Body must include `{{ .Token }}` (6-digit code). Do **not** rely on `{{ .ConfirmationURL }}` (opens Site URL / localhost and leaves the app).

```html
<h2>Confirm your Veylo account</h2>
<p>Your verification code is:</p>
<p style="font-size:24px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>Enter this code in the Veylo app. It expires in about an hour.</p>
```

The app verifies with `supabase.auth.verifyOtp({ type: 'signup' })` on `EmailVerificationScreen`.

### RLS probe

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... \
RLS_PROBE_EMAIL_A=... RLS_PROBE_PASSWORD_A=... \
RLS_PROBE_EMAIL_B=... RLS_PROBE_PASSWORD_B=... \
node veylo_backend/scripts/rls-probe.mjs
```

Create two dedicated test users first. The script asserts cross-user isolation, storage prefix isolation, `user_stats` write lock, and revoked SECURITY DEFINER RPCs.

### Deferred

- Load testing (budget) — see root `TASKS.md`.
- Server-side verification of `gamification-events` payloads (rate-limited only for now).
- Moving `vector` / `pg_net` out of `public` schema (disruptive).
