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
    │  Direct fetch to Railway backend (no Next.js proxy for generation)
    │
    ▼
FastAPI Backend (Railway)
    │  Document generation pipeline (V2 — direct Claude API call)
    │  Golden example analysis pipeline
    │  File parsing pipeline
    │
    ├── StructureAgent  →  analyzes uploaded golden examples → template_prompt + visual_data
    ├── ImageAnalyzer   →  extracts images/layout from PDF golden examples
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

### Data Flow — Document Generation (V2)

1. User selects a Project and clicks **Generate Document**
2. Frontend popup (`GenerateDocumentPopup`) collects `templateId` + `userRequirements`
3. `useDocumentGeneration` hook calls backend `/api/generate-document` directly
   (no Next.js proxy — direct fetch to Railway)
4. Backend `generate_document_v2` handler:
   - Fetches the selected golden example record from `golden_examples` table
     (includes `template_prompt` and `visual_data` generated at upload time)
   - Fetches up to 3 company artifacts, 3 role artifacts, 5 candidates, 3 interviewers
     from Supabase for context
   - Builds a single generation prompt combining:
     `template_prompt` + company/role context + candidate/interviewer info +
     `visual_data` (JSON) + user requirements
   - Calls `claude-sonnet-4-6` with `max_tokens=8000`
5. Returns HTML document to the frontend
6. Frontend saves HTML to Supabase `project-outputs` bucket and inserts metadata row
7. Output appears in the project's Outputs section; viewed inline via `HtmlDocumentViewer`

### Data Flow — Golden Example Upload

1. User uploads a file via the Golden Examples popup
2. Backend stores the file in the `golden-examples` Supabase storage bucket
3. **StructureAgent** runs Claude Vision on the first 2 pages of the PDF → produces
   `visual_data` (layout, typography, colour, spacing as JSON)
4. Backend extracts up to 15,000 chars of text from the document
5. A second Claude call uses that text to produce `template_prompt`
   (a structured instruction block that guides later document generation)
6. `template_prompt` and `visual_data` are stored in the `golden_examples` DB row

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
| Backend URL env var | Use `NEXT_PUBLIC_BACKEND_URL` for all frontend → backend calls. Fallback to `https://searchwizard-production.up.railway.app` remains in `analyze-file` and `analyze-structure` API routes (by design — these are Next.js server-side routes). |
| `max_tokens` per endpoint | `backend/api.py` uses named constants: `VISION_MAX_TOKENS=2000`, `TEMPLATE_MAX_TOKENS=3000`, `GENERATION_MAX_TOKENS=8000`. If generation is observed to truncate, raise `GENERATION_MAX_TOKENS`. |
| CSP per branch | `next.config.js` `connect-src` must include the backend URL for each environment. Staging branch includes staging Railway URL; main does not. |
| Claude model | `claude-sonnet-4-6` (upgraded from deprecated `claude-3-5-sonnet-20241022` Feb 2026). Defined in `backend/agent_wrapper/anthropic.py` and 3 direct calls in `backend/api.py`. See ADR-007. |
| Shared Supabase (staging + production) | Both environments currently share one Supabase project. See `docs/DECISIONS.md` — must be separated before public launch. |
| Admin approval required | `adminApprovalSystem: true` in `features.js`. New users cannot access the app until an admin approves them. Requires `user_roles` table and two Supabase stored procedures: `get_user_status_for_auth` and `check_is_admin`. |
| LLM provider priority | Anthropic → OpenAI → Gemini, determined by which API key env vars are present. Anthropic must always be configured. |
| Mixed JS/TS codebase | Frontend has a mix of `.js`, `.jsx`, `.ts`, `.tsx` files. New files should use TypeScript. |
| Golden example content limit | `MAX_TEMPLATE_CONTENT_CHARS = 15000` in `api.py` — only the first 15,000 chars of an uploaded golden example file are used to generate `template_prompt`. Previously 3,000 chars; raised Feb 2026. |

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
- Knowledge base files (`company-overview.txt`, `product-specs.txt`) are template
  placeholders — only `info-agentica.md` has real content
- `kb_support.py` still exists; it was the sibling of the now-deleted `knowledge_helper.py`
  — review whether `kb_support.py` is actively used or can also be deleted
- `WriterAgent` (`backend/agents/writer_agent.py`) is no longer imported by `api.py`;
  the legacy `/generate-document` endpoint that used it was deleted. The file can be
  removed unless it's needed for a future use case
- The Claude model string `claude-sonnet-4-6` appears in 3 places in `api.py` and once
  in `agent_wrapper/anthropic.py` — consider centralising into a single `ANTHROPIC_MODEL`
  constant or env var (noted in ADR-007)
- One open draft PR: Vercel auto-generated React Server Components CVE security patch
  — review and merge or close
- **TypeScript + JS module import rule:** When importing from `.js` API files into `.tsx`
  components, always cast the imported module or method to an explicit interface type.
  With `noImplicitAny: true` in tsconfig, untyped JS imports can produce implicit `any`
  that **fails the Next.js build on Vercel/Railway** without a clear error in the console.
  Pattern: `(module as { method: (arg: Type) => Promise<ReturnType> }).method(arg)`

### What's Next (Priority Order)
1. ✅ Staging environment setup (completed Feb 2026)
2. ✅ Artifact type system — DB-driven dropdowns for all artifact categories (Feb 2026)
3. ✅ Code review cleanup — dead code deleted, constants extracted, components consolidated (Feb 2026, commit `86f4227`)
4. Review and act on the open CVE security patch PR
5. Make and test significant UI/feature changes on `staging` before pushing to `main`
6. Fix Bug #22 (Generate New Document dropdown lists file names instead of types) — requires scoping before fixing
7. Separate Supabase projects (staging vs production) — **required before public launch**
8. Populate knowledge base files with real Agentica AI content
9. Remove `WriterAgent` file (`backend/agents/writer_agent.py`) — no longer imported
10. Centralise the Claude model string into `ANTHROPIC_MODEL` constant or env var

### Open Bug Log (Staging — Feb 2026)

| # | Description | Status | Root Cause |
|---|-------------|--------|-----------|
| 5 | Project deletion fails | Fixed in `bc96062` | FK constraint — `deleteProject` now cascade-deletes all child records first |
| 6/7 | Artifact Type dropdown missing from Company/Role upload forms | Fixed in `4d4f378` | TS2532 errors in `UnifiedArtifactUploadPopup.tsx` (array index `types[0].id` not narrowed after length check) caused silent Next.js build failure; fixed with `?.id ?? ''` |
| 8/9 | Candidate/Interviewer photo not shown immediately after add | Fixed in `133bd78` | Optimistic update used `newCandidate.photo_url` (snake_case) but API already runs `transformDatabaseObject` which converts to `photoUrl`; fixed to use `newCandidate.photoUrl` |
| 10 | Candidate artifact upload fails (`input_type` column missing) | Fixed via SQL | `candidate_artifacts` table was missing `input_type` column |
| 11 | Interviewer profile crashes with "Something went wrong" | Fixed in `775140e` | `loadArtifacts` (plain function) in `useEffect` dependency array caused infinite re-render loop → React error boundary; SQL fix was incomplete root cause |
| 12 | Candidate artifact upload fails (`artifacts_count` column missing) | Fixed via SQL | `candidates` and `interviewers` tables were missing `artifacts_count INTEGER` column |
| 13 | Artifact Type dropdown still missing from Company/Role upload forms (post-bc96062) | Fixed in `4d4f378` | Same TS silent build failure as #6/#7; `bc96062` fix introduced 2 new TS2532 errors |
| 14 | Admin `/admin/artifact-types` returns 404 (post-bc96062) | Fixed in `4d4f378` | Same TS silent build failure — admin files existed at correct path but build never deployed |
| 15 | Company/Role artifact TYPE column shows file MIME type instead of label | Fixed in `142c376` | `addCompanyArtifact`/`addRoleArtifact` returned no `type` field; `handleArtifactUpload` used `file_type` (MIME) for optimistic update. Fixed: insert functions now look up label from `artifact_types` and return it; page.tsx now reads `newArtifact.type` |
| 16 | "No file selected" error shown on candidate/interviewer profile after successful artifact upload | Fixed in `519698b` | `handleArtifactUploaded` expected raw form data but popup passed the API result (no `.file`); guard always fired, error set, optimistic update skipped. Fixed: handler now treats argument as already-uploaded record |
| 17 | DATE ADDED column blank after adding a candidate or interviewer artifact | Fixed in `6ab85ef` | `getCandidateArtifacts`/`getInterviewerArtifacts` did not include `dateAdded`; `transformDatabaseObject` maps `created_at` → `dateCreated` (not `dateAdded`). Fixed: both getters now explicitly set `dateAdded: artifact.created_at` |
| 18 | Interviewer artifact upload fails with "new row violates row-level security policy" | **Fixed (Feb 2026)** | Root cause: `interviewerApi.js` uploaded to path `interviewer_${interviewerId}` but the `process-artifacts` storage bucket RLS policy requires the path to start with `${user.id}/`. The error "new row violates row-level security policy" was from `storage.objects`, not the `process_artifacts` DB table (the previous SQL fix was addressing the wrong layer). Fix: changed storage path to `${user.id}/interviewer_${interviewerId}` — consistent with `candidateApi.js` pattern. The DB-level RLS policies applied earlier are also correct and should be retained. |
| 19 | Admin Artifact Types page: section headings use short labels | Fixed in `6ab85ef` | Updated CATEGORIES labels to full names; removed hardcoded " Types" suffix from section heading |
| 20 | Company/Role artifact TYPE reverts to "application/pdf" on page refresh | Fixed in `6ab85ef` | `projectUtils.ts` was reading `artifact.fileType` (MIME) instead of `artifact.type` (label returned by `getArtifacts`). Fixed for both company and role artifact maps |
| 21 | TYPE column rendered as a highlighted badge/bubble instead of plain text | Fixed in `6ab85ef` | `ArtifactsSection.tsx` replaced pill-styled `<span>` with plain text matching the date column style |
| 22 | "Generate New Document" dropdown lists Golden Example file names instead of types | Open | The document type dropdown in the Generate popup shows the names of individual uploaded Golden Example files (e.g. "KPMG Role Specification"). It should instead list the Golden Example types from the `artifact_types` table (`category = 'golden'`), e.g. "Role Specification", "Company Briefing". Requires functional change to generation flow — do not fix until scoped |
| 23 | Editing an existing Interviewer profile fails with "Cannot read properties of undefined (reading 'photoUrl')" | Fixed in `133bd78` | `updateInterviewer` called with only 2 args (`interviewerId, data`) but function expects 3 (`projectId, interviewerId, data`); missing `state.project.id` caused `updatedData` to be `undefined` inside the function, returning `undefined`, then `updatedInterviewer.photoUrl` crashed |
| 24 | "Add New Candidate" photo upload UI differs from "Add New Interviewer" — UI polish | Fixed in `133bd78` | Replaced `SecureFileUpload` drag-and-drop component with a simple `<label>` + `<input type="file">` button matching `InterviewerAddPopup` style |
| 25 | "Edit Candidate Profile" and "Edit Interviewer Profile" popups have no Delete button | Fixed in `133bd78` | Added `DELETE_CANDIDATE`/`DELETE_INTERVIEWER` reducer cases, `deleteCandidate`/`deleteInterviewer` actions, delete handlers in `page.tsx`, and "Delete Profile" button (red, left-aligned) to both edit popup footers |
| 26 | "Edit Candidate Profile" and "Edit Interviewer Profile" popups redundantly show artifacts table | Fixed in `133bd78` (re-fixed regression in `b445ce2`) | Removed artifacts section from the edit form view only (`isEditProfile = true`); artifacts table + Add Artifact button remain visible in display view (`isEditProfile = false`); initial fix over-removed and broke the display view |
| 27 | "Error Loading Project" briefly flashes when opening a project from My Projects | Fixed in `133bd78` | Changed error guard to `if (hasError \|\| (!state.project && !state.loading))` so loading state takes precedence; added TS narrowing guard `if (!state.project) return null` after |
| 28 | Golden Examples table: TYPE shown as colored bubble; FEATURES column has no value | Fixed in `133bd78` | Removed `rounded-full` badge styling from TYPE column (now plain text); removed FEATURES `<th>` and `<td>` from `GoldenExamplesPopup.jsx` |
| 29 | Saving an edited Interviewer profile crashes with "Error Loading Project" — "Could not find the 'updated_at' column of 'interviewers' in the schema cache" | Fixed in `8ce0b58` | Removed `updated_at: new Date().toISOString()` from `updateFields` in `interviewerApi.js` — the `interviewers` table has no `updated_at` column |
| 34 | Golden Examples popup: "View File" button returns 400 — "querystring must have required property 'token'" | Fixed in `8ce0b58` | Replaced `<a href={example.url}>` with a `handleViewFile` button that extracts the storage path from the stored URL and calls `supabase.storage.from('golden-examples').createSignedUrl(filePath, 3600)` to generate a fresh 1-hour signed URL on each click |
| 33 | Uploading a Markdown (.md) file as a Candidate artifact fails — "mime type application/octet-stream is not supported" | Fixed in `8ce0b58` | Added extension-based fallback in `GoldenExamplesPopup.jsx` file validation: if MIME type is not in `allowedTypes` but file extension is in `allowedExtensions` (pdf, doc, docx, txt, md, json, csv, etc.), the file is accepted. macOS reports `.md` files as `application/octet-stream` which triggered the rejection |
| 32 | ARTIFACTS count in Candidates table always shows 0 — does not increment on add or decrement on delete | Fixed in `8ce0b58` | Added `INCREMENT/DECREMENT_CANDIDATE/INTERVIEWER_ARTIFACT_COUNT` reducer actions in `useProjectReducer.ts` + types. Wired `onArtifactAdded` callbacks from `page.tsx` → `ProjectPopups.tsx` → `CandidateEditPopup`/`InterviewerEditPopup`. Each popup calls `onArtifactAdded(id)` after a successful artifact upload, immediately updating the displayed count in the React state without requiring a page reload |
| 31 | Artifact tables: no visible scrollbar when content overflows — rightmost columns (including delete button) are cut off and not obviously reachable | Fixed in `8ce0b58` | Changed `overflow-x-auto` to `overflow-x-scroll` in `ArtifactsSection.tsx`; wrapped the `<table>` in `<div className="overflow-x-scroll">` in `CandidatesSection.jsx` and `InterviewersSection.jsx` (those had no wrapper at all) — scrollbar is now always visible |
| 30 | Adding a Company artifact via URL input fails — "Source URL is required for URL artifacts" | Fixed in `8ce0b58` | `UnifiedArtifactUploadPopup.tsx` was spreading `{ url: url.trim() }` for URL input type, but `projectApi.addCompanyArtifact`/`addRoleArtifact` check `artifactData.sourceUrl`. Fixed by changing the spread key from `url` to `sourceUrl` — matching the `ArtifactUploadData` type definition |
| 35 | Company artifact URL upload fails — "The string did not match the expected pattern" — page crashes to "Error Loading Project" | Open | Two toasts appear simultaneously: green "Company artifact uploaded successfully" (storage upload succeeded) and red "Failed to upload company artifact — The string did not match the expected pattern." The error is from Supabase and indicates a pattern/UUID constraint violation during the DB insert, not a storage failure. Distinct from Bug #30 (different error message; `sourceUrl` key fix is in place). Likely a field receiving a value in the wrong format (e.g. a UUID column receiving a URL string, or vice versa). Do not fix until investigated. |

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
