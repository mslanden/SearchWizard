# SearchWizard — Architecture Decision Log

> Record of key technical and architectural decisions, the reasoning behind them,
> and any future actions they require. New decisions should be appended here.

---

## ADR-001 — Shared Supabase for Staging and Production (Feb 2026)

**Status:** Active (temporary)

**Decision:**
The staging environment shares the same Supabase project (database, auth, storage)
as production.

**Reasoning:**
At time of decision, the app has not launched publicly. All users are internal
Agentica AI team members and all data is non-production/test data. The setup effort
and cost of a separate Supabase project is not justified at this stage.

**Consequences:**
- Test data from staging operations may appear in the same database as production data
- No risk to real user data because there are no real production users yet

**⚠️ Required Future Action — Before Public Launch:**
When real production users and real client data are present, staging MUST be migrated
to a separate Supabase project. Steps required:
1. Create a new Supabase project for staging
2. Recreate schema: all tables, RLS policies, stored procedures
3. Recreate storage buckets
4. Update Vercel staging environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (staging-specific value)
   - `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (staging-specific value)
5. Update Railway staging environment variables with staging Supabase credentials

---

## ADR-002 — Staging Environment Architecture (Feb 2026)

**Status:** Active

**Decision:**
Use a branch-based staging environment:
- GitHub `staging` branch → auto-deploys to Vercel preview deployment
- Railway `staging` environment → separate backend instance
- `NEXT_PUBLIC_BACKEND_URL` env var scoped to `staging` branch in Vercel

**Reasoning:**
- Allows testing UI and backend changes live (on Vercel/Railway infrastructure)
  without requiring a local dev environment
- Vercel branch deployments are automatic and free
- Railway environments allow isolated backend instances within one project

**Staging URL:**
`https://search-wizard-git-staging-scott-texeiras-projects.vercel.app`

---

## ADR-003 — Anthropic Claude as Primary LLM (Feb 2026)

**Status:** Active

**Decision:**
The backend uses `claude-sonnet-4-6` as the primary LLM for document generation
(upgraded from deprecated `claude-3-5-sonnet-20241022` — see ADR-007), with OpenAI
and Gemini as fallbacks determined by env var presence.

**Current cap:** `max_tokens=4096` in `agent_wrapper/anthropic.py`; individual API
endpoints in `api.py` use lower caps (2000–4000) depending on the call type.

**Known limitation:**
4096 tokens may truncate long documents. If generation is observed to be cut off,
increase `max_tokens` in `/backend/agents/writer_agent.py`.

---

## ADR-004 — Admin Approval System Always On (Feb 2026)

**Status:** Active

**Decision:**
The `adminApprovalSystem` feature flag in `/frontend/src/lib/features.js` is set to
`true` and treated as permanently enabled. New users cannot access the app until an
admin approves them.

**Reasoning:**
The app is invite-only for Agentica AI. Open registration without approval would be
a security risk.

**Requirement:**
Supabase must have the `user_roles` table and two stored procedures
(`get_user_status_for_auth`, `check_is_admin`) deployed. Without these, the admin
approval UI will display a setup warning banner.

---

## ADR-005 — LlamaParse as Primary Document Parser (Feb 2026)

**Status:** Active

**Decision:**
Document parsing uses a four-tier fallback chain:
1. LlamaParse Premium (OCR, merged cells, visual hierarchy)
2. LlamaParse Fast
3. PyMuPDF (local, no API cost)
4. Basic text extraction fallback

Results are cached in Redis (or in-memory) for 7 days to avoid redundant API calls.

**Reasoning:**
LlamaParse Premium provides the highest quality extraction for complex PDFs
(recruitment documents often have complex layouts). The fallback chain ensures
the app remains functional even if the LlamaParse API is unavailable.

---

## ADR-006 — Staging CSP Must Include Staging Backend URL (Feb 2026)

**Status:** Active

**Decision:**
The `next.config.js` Content Security Policy `connect-src` directive on the `staging`
branch explicitly includes `https://searchwizard-staging.up.railway.app` in addition
to the production backend URL.

**Reasoning:**
The browser's CSP blocked all outbound fetch requests to the staging Railway backend,
producing a "Failed to fetch" error identical to a CORS failure. Adding the staging
backend URL to `connect-src` in `next.config.js` on the `staging` branch resolved it.

**Important:** The production `next.config.js` (`main` branch) should NOT include the
staging URL. This change lives on `staging` only.

**Pattern for future environments:**
Any new environment (e.g. QA, preview) must add its backend URL to `connect-src` in
`next.config.js` on its respective branch, AND add its frontend URL to the
`CORS_ALLOWED_ORIGINS` env var on its Railway backend service.

---

## ADR-007 — Upgrade Claude Model from claude-3-5-sonnet-20241022 to claude-sonnet-4-6 (Feb 2026)

**Status:** Active

**Decision:**
All references to `claude-3-5-sonnet-20241022` in the backend have been updated to
`claude-sonnet-4-6` on both `staging` and `main` branches.

**Reasoning:**
The Anthropic API returned a 404 `not_found_error` for `claude-3-5-sonnet-20241022`,
indicating the model has been deprecated. Document generation was failing on staging
(and would have failed on production) until this was corrected.

**Files updated:**
- `backend/agent_wrapper/anthropic.py`
- `backend/api.py` (3 occurrences)

**Note:** When Anthropic releases future model updates, both files must be updated
together. Consider centralising the model name into a single constant or environment
variable (`ANTHROPIC_MODEL`) to make future upgrades a one-line change.

---

## ADR-008 — DB-Driven Artifact Types with Config.js Fallback (Feb 2026)

**Status:** Active

**Decision:**
Artifact type dropdown options (e.g. "Resume/CV", "Annual Report") are sourced from
the `artifact_types` Supabase table, not hardcoded in frontend components. A
`config.js` fallback list is used when the DB is unreachable or returns empty.

**`artifact_types` table schema:**
```
id          TEXT PRIMARY KEY  -- slug, e.g. 'resume_cv' (NOT UUID)
category    TEXT NOT NULL     -- 'company'|'role'|'candidate'|'process'|'golden'
name        TEXT NOT NULL     -- display label, e.g. 'Resume/CV'
description TEXT
sort_order  INTEGER DEFAULT 0
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ DEFAULT now()
```

**Why TEXT primary key (slug), not UUID:**
The slug is stored directly in artifact records (`artifact_type` column). This makes
the stored value human-readable and joinable by label lookup without a JOIN. UUIDs
would require a JOIN to resolve display labels, adding query complexity.

**Admin management:**
Types are managed via the `/admin/artifact-types` page (add, edit, sort order, delete).
The API is at `/api/admin/artifact-types` (GET/POST/PATCH/DELETE), protected by admin
role check using the Supabase service role key.

**Affected tables and columns:**
- `artifacts` — added `document_type TEXT` (the specific type slug; `artifact_type`
  stores the category: `company` or `role`)
- `candidate_artifacts` — `artifact_type` stores the slug; also added `input_type`,
  `source_url`, `processed_content`, `file_type`, `file_size` columns (Feb 2026)
- `process_artifacts` — same columns added as `candidate_artifacts` (Feb 2026)

**Files:**
- `frontend/src/lib/api/config.js` — fallback type lists
- `frontend/src/lib/api/storageApi.js` — `getArtifactTypes(category)` — DB first, config fallback
- `frontend/src/app/admin/artifact-types/page.js` — admin UI
- `frontend/src/app/api/admin/artifact-types/route.js` — admin CRUD API

---

## ADR-009 — TypeScript Strict Imports from JS Modules (Feb 2026)

**Status:** Active

**Decision:**
When importing from `.js` API files into `.tsx` components, always provide an
explicit type cast on the imported module or method. Never rely on TypeScript's
inferred type from an untyped JS module in contexts where the result is passed
to a callback or used in a generic.

**Reasoning:**
The frontend tsconfig has `"noImplicitAny": true`. TypeScript with `allowJs: true`
can infer types from JS modules, but in some patterns (async `.then()` callbacks,
generics) TypeScript falls back to implicit `any`, which fails the Next.js production
build on Vercel and Railway **without a clear build error in the Railway/Vercel UI**.
This caused a silent build failure that left stale code deployed for multiple bug-fix
cycles before the root cause was identified.

**Required pattern:**
```ts
// BAD — may produce implicit 'any' → build failure
import { someApi } from '../../lib/api/someApi';
someApi.getItems(arg).then((items) => { ... });

// GOOD — explicit cast eliminates implicit 'any'
import { someApi } from '../../lib/api/someApi';
(someApi as { getItems: (arg: string) => Promise<ItemType[]> })
  .getItems(arg)
  .then((items) => { ... });
```

**Detection:** If a fix is pushed to staging and both the new code AND a new page/route
from the same commit don't appear after Railway/Vercel rebuild, suspect a silent TS
build failure caused by this pattern. Check the Vercel/Railway build logs explicitly.
