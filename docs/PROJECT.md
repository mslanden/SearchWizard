# SearchWizard — Project Brain

> Central reference document. Keep this up to date. Every AI session and every
> human developer should read this before making changes.

---

## Goal

Build an AI-powered recruitment document generation platform for **Agentica AI**
that allows recruiters to:
- Organise recruitment engagements as **Projects**
- Upload context documents (**Artifacts**) about the company and role
- Add **Candidates** and **Interviewers** with profiles and supporting documents
- Generate polished, structured recruitment documents (job specs, candidate reports,
  company overviews, analyst reports) using an AI agent pipeline
- View, download, and manage generated **Outputs** within each project

---

## Non-Goals

- Not a general-purpose document editor
- Not a public consumer app — invite-only, admin-approval gated
- Not a multi-tenant SaaS (single organisation: Agentica AI)
- No mobile-native app (web only)

---

## Current Architecture

### Major Components

```
User Browser
    │
    ▼
Next.js Frontend (Vercel)
    │  App Router pages + React components
    │  Supabase JS client (auth + DB + storage)
    │  API routes proxy → Railway backend
    │
    ▼
FastAPI Backend (Railway)
    │  Document generation pipeline
    │  File parsing pipeline
    │  Knowledge base injection
    │
    ├── StructureAgent  →  analyzes golden examples → JSON template
    ├── WriterAgent     →  JSON template + KB + artifacts → HTML document
    ├── ImageAnalyzer   →  extracts images/positions from PDFs
    ├── DocumentParser  →  LlamaParse premium → fast → PyMuPDF → fallback
    ├── CacheService    →  Redis (optional) / in-memory fallback
    └── AgentWrapper    →  routes to Anthropic / OpenAI / Gemini
    │
    ▼
Supabase
    │  Postgres: projects, artifacts, candidates, interviewers,
    │            candidate_artifacts, process_artifacts,
    │            project_outputs, user_roles, artifact_types
    │  Auth: Supabase Auth + admin-approval RPC procedures
    │  Storage buckets: company-artifacts, role-artifacts,
    │                   candidate-artifacts, process-artifacts,
    │                   candidate-photos, interviewer-photos,
    │                   project-outputs, golden-examples
```

### Data Flow — Document Generation

1. User selects a Project and clicks **Generate Document**
2. Frontend fetches project artifacts from Supabase storage
3. Frontend calls backend `/api/generate-document` with:
   `{ template_id, project_id, user_id, user_requirements }`
4. **StructureAgent** reads golden example documents → extracts a JSON structure
   (sections, tone, formatting rules, document type)
5. **WriterAgent** combines structure + knowledge base files + project artifacts →
   calls Claude 3.5 Sonnet → returns full styled HTML document
6. HTML is saved to Supabase `project-outputs` storage bucket
7. Output appears in the project's Outputs section; viewed inline via `HtmlDocumentViewer`

### Frontend Route Map

| Route | Purpose |
|-------|---------|
| `/` | Home — project list (grid/list view, sort, create) |
| `/projects/[id]` | Project detail — artifacts, people, outputs, generate |
| `/projects/new_blank` | Create blank project |
| `/login` / `/register` | Auth |
| `/pending-approval` | Waiting for admin approval |
| `/admin` | Admin dashboard — approve/deny users, stats, manage artifact types |
| `/admin/users` / `/admin/activity` | User management, activity log |
| `/admin/artifact-types` | Admin UI to manage artifact type options per category |
| `/profile` / `/settings` | User profile, dark mode toggle |

---

## Key Constraints

| Constraint | Detail |
|-----------|--------|
| Hardcoded backend URL | `https://searchwizard-production.up.railway.app` appears in several frontend files in addition to the env var. Use `NEXT_PUBLIC_BACKEND_URL` env var where possible. |
| `max_tokens=4096` | WriterAgent is capped at 4096 output tokens — long documents may be truncated. Increase if generation is cutting off. |
| CSP per branch | `next.config.js` `connect-src` must include the backend URL for each environment. Staging branch includes staging Railway URL; main does not. |
| Claude model | `claude-sonnet-4-6` (upgraded from deprecated `claude-3-5-sonnet-20241022` Feb 2026). Defined in `backend/agent_wrapper/anthropic.py` and `backend/api.py`. |
| Shared Supabase (staging + production) | Both environments currently share one Supabase project. See `docs/DECISIONS.md` — must be separated before public launch. |
| Admin approval required | `adminApprovalSystem: true` in `features.js`. New users cannot access the app until an admin approves them. Requires `user_roles` table and two Supabase stored procedures: `get_user_status_for_auth` and `check_is_admin`. |
| LLM provider priority | Anthropic → OpenAI → Gemini, determined by which API key env vars are present. Anthropic must always be configured. |
| Mixed JS/TS codebase | Frontend has a mix of `.js`, `.jsx`, `.ts`, `.tsx` files. New files should use TypeScript. |

---

## Current Status

### Implemented and Working
- Core document generation pipeline (StructureAgent → WriterAgent)
- Multi-provider LLM support (Anthropic primary, OpenAI + Gemini fallbacks)
- LlamaParse document parsing (premium and fast modes) with Redis caching
- Project management (create, edit, delete projects)
- Artifact upload (file, URL, or pasted text) for company, role, candidate, and interviewer context
- Artifact type system — DB-driven dropdown menus per category (company, role, candidate, process, golden), with `config.js` fallback when DB is unreachable (Feb 2026)
- Admin UI to manage artifact types at `/admin/artifact-types` — add, edit, delete, reorder (Feb 2026)
- Candidate and Interviewer profiles with photos and supporting artifacts
- Golden Examples (user-uploaded example documents that guide generation style), types now DB-driven
- Admin approval system (pending users, approve/deny, role management)
- Dark mode
- Staging environment (Railway + Vercel) — set up Feb 2026

### Known Technical Debt
- Multiple overlapping artifact upload popup components exist
  (`UnifiedArtifactUploadPopup`, `EnhancedArtifactUploadPopup`, `ArtifactUploadPopup`,
  `CandidateArtifactUploadPopup`, `ProcessArtifactUploadPopup`) — consolidation needed.
  `UnifiedArtifactUploadPopup` is the canonical component for company/role uploads.
- `kb_support.py` and `knowledge_helper.py` serve near-identical purposes — deduplicate
- `/backend/tools/mcp.py` is an empty placeholder
- Knowledge base files (`company-overview.txt`, `product-specs.txt`) are template
  placeholders — only `info-agentica.md` has real content
- One open draft PR: Vercel auto-generated React Server Components CVE security patch
  — review and merge or close
- Candidate/interviewer photo does not appear immediately after add (race condition — photo
  URL is not included in the optimistic state update, appears after page refresh) — Bug #8/#9
- **TypeScript + JS module import rule:** When importing from `.js` API files into `.tsx`
  components, always cast the imported module or method to an explicit interface type.
  With `noImplicitAny: true` in tsconfig, untyped JS imports can produce implicit `any`
  that **fails the Next.js build on Vercel/Railway** without a clear error in the console.
  Pattern: `(module as { method: (arg: Type) => Promise<ReturnType> }).method(arg)`

### What's Next (Priority Order)
1. ✅ Staging environment setup (completed Feb 2026)
2. ✅ Artifact type system — DB-driven dropdowns for all artifact categories (Feb 2026)
3. Review and act on the open CVE security patch PR
4. Make and test significant UI/feature changes on `staging` before pushing to `main`
5. Fix remaining open bugs on staging (see bug log below)
6. Separate Supabase projects (staging vs production) — **required before public launch**
7. Increase `max_tokens` beyond 4096 if document truncation is observed
8. Consolidate duplicate artifact upload popup components
9. Populate knowledge base files with real Agentica AI content

### Open Bug Log (Staging — Feb 2026)

| # | Description | Status | Root Cause |
|---|-------------|--------|-----------|
| 5 | Project deletion fails | Fixed in `bc96062` | FK constraint — `deleteProject` now cascade-deletes all child records first |
| 6/7 | Artifact Type dropdown missing from Company/Role upload forms | Fixed in `4d4f378` | TS2532 errors in `UnifiedArtifactUploadPopup.tsx` (array index `types[0].id` not narrowed after length check) caused silent Next.js build failure; fixed with `?.id ?? ''` |
| 8/9 | Candidate/Interviewer photo not shown immediately after add | Open | Race condition — optimistic state update excludes `photoUrl`; appears after refresh |
| 10 | Candidate artifact upload fails (`input_type` column missing) | Fixed via SQL | `candidate_artifacts` table was missing `input_type` column |
| 11 | Interviewer profile crashes with "Something went wrong" | Fixed in `775140e` | `loadArtifacts` (plain function) in `useEffect` dependency array caused infinite re-render loop → React error boundary; SQL fix was incomplete root cause |
| 12 | Candidate artifact upload fails (`artifacts_count` column missing) | Fixed via SQL | `candidates` and `interviewers` tables were missing `artifacts_count INTEGER` column |
| 13 | Artifact Type dropdown still missing from Company/Role upload forms (post-bc96062) | Fixed in `4d4f378` | Same TS silent build failure as #6/#7; `bc96062` fix introduced 2 new TS2532 errors |
| 14 | Admin `/admin/artifact-types` returns 404 (post-bc96062) | Fixed in `4d4f378` | Same TS silent build failure — admin files existed at correct path but build never deployed |
| 15 | Company/Role artifact TYPE column shows file MIME type instead of label | Fixed in `142c376` | `addCompanyArtifact`/`addRoleArtifact` returned no `type` field; `handleArtifactUpload` used `file_type` (MIME) for optimistic update. Fixed: insert functions now look up label from `artifact_types` and return it; page.tsx now reads `newArtifact.type` |
| 16 | "No file selected" error shown on candidate/interviewer profile after successful artifact upload | Fixed in `519698b` | `handleArtifactUploaded` expected raw form data but popup passed the API result (no `.file`); guard always fired, error set, optimistic update skipped. Fixed: handler now treats argument as already-uploaded record |
| 17 | DATE ADDED column blank after adding a candidate or interviewer artifact | Open | `createdAt` from the API result is not surfaced in the artifact table; current date should be captured at upload time and displayed |
| 18 | Interviewer artifact upload fails with "new row violates row-level security policy" | Open | RLS policy on `process_artifacts` table is blocking inserts; likely missing or misconfigured INSERT policy for authenticated users |
| 19 | Admin Artifact Types page: section headings use short labels | Open — UI polish | `/admin/artifact-types` shows "Company Types", "Role Types", etc. Should read "Company Artifact Types", "Role Artifact Types", "Candidate Artifact Types", "Interviewer Artifact Types", "Golden Example Types" |
| 20 | Company/Role artifact TYPE reverts to "application/pdf" on page refresh | Open | Optimistic update shows correct label (fix #15 working); on refresh `getArtifacts` returns MIME type — either `document_type` is NULL in DB for pre-fix artifacts or the page renders `fileType` instead of `type` when loading from API |

---

## How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- A `.env` file in `/backend` (copy from `.env.example`)
- A `.env.local` file in `/frontend` with Supabase credentials

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```
Backend runs at `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm run dev
```
Frontend runs at `http://localhost:3000`

### Required Environment Variables

**Backend (`/backend/.env`):**
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
LLAMAPARSE_API_KEY=
ENABLE_LLAMAPARSE=true
LLAMAPARSE_PRICING_TIER=premium
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://localhost:6379   # optional
PORT=8000
```

**Frontend (`/frontend/.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Terminology / Definitions

| Term | Definition |
|------|-----------|
| **Project** | A recruitment engagement. Has a title, client, date, description, and contains Artifacts, People, and Outputs. |
| **Artifact** | A context document attached to a Project, Candidate, or Interviewer. Can be a file upload, a URL, or pasted text. Stored in `artifacts` (company/role), `candidate_artifacts`, or `process_artifacts`. Each has a specific `artifact_type` slug (e.g. `resume_cv`) drawn from the `artifact_types` table. |
| **Artifact Type** | A user-visible label for an artifact (e.g. "Resume/CV", "Annual Report"). Stored in the `artifact_types` table, scoped by `category` (`company`, `role`, `candidate`, `process`, `golden`). Managed by admins at `/admin/artifact-types`. Config.js provides a fallback list if the DB is unreachable. |
| **Golden Example** | A user-uploaded example document that the StructureAgent analyzes to understand the desired structure, tone, and formatting of the output. Types are now drawn from `artifact_types` where `category = 'golden'`. |
| **Knowledge Base (KB)** | Static files in `/backend/knowledge_base/` injected into every generation prompt. Contains Agentica AI company info and product specs. |
| **StructureAgent** | Backend AI agent that reads golden examples and extracts a JSON document template (sections, tone, formatting rules). |
| **WriterAgent** | Backend AI agent that takes the JSON template + KB content + project artifacts and generates a complete styled HTML document. |
| **Output** | A generated HTML document produced from a Project. Stored in Supabase `project-outputs` bucket. Viewable inline via `HtmlDocumentViewer`. |
| **AgentWrapper** | Backend abstraction layer that routes LLM calls to Anthropic, OpenAI, or Gemini based on available API keys. |
| **Admin Approval** | New user accounts require explicit admin approval before gaining app access. Controlled by `adminApprovalSystem` feature flag. |

---

## Assumptions

| # | Assumption | Date | Status |
|---|-----------|------|--------|
| 1 | Anthropic API key is always present and is the primary LLM provider | Feb 2026 | Active |
| 2 | LlamaParse is always enabled (`ENABLE_LLAMAPARSE=true`) | Feb 2026 | Active |
| 3 | Redis is optional — in-memory cache fallback is acceptable for now | Feb 2026 | Active |
| 4 | Admin approval system is always on — no plan to disable it | Feb 2026 | Active |
| 5 | All current users are internal Agentica AI team members; no real client data yet | Feb 2026 | Active — reassess at launch |
| 6 | Staging and production share one Supabase project (acceptable pre-launch only) | Feb 2026 | Active — see DECISIONS.md |
