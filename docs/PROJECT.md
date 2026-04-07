# SearchWizard — Project Overview

> Central reference document. Keep this up to date. Every AI session and every
> human developer should read this before making changes.

---

## Goal

Build an AI-powered recruitment document generation platform for **SearchWizard.ai**
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
- Not a multi-tenant SaaS (single organisation: SearchWizard.ai)
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
    │  Golden example analysis pipeline (V3 — multi-stage async blueprint pipeline)
    │  File parsing pipeline
    │
    ├── pipeline/             (blueprint pipeline — see Data Flow: Blueprint Pipeline)
    │   ├── preprocessor.py       →  Stage A: file bytes → Intermediate Document Model (IDM)
    │   ├── ocr_enricher.py       →  Stage A.5: Vision OCR enrichment for sparse PDFs (<500 chars/page)
    │   ├── semantic_analyzer.py  →  Stage B: IDM → ContentStructureSpec (Claude tool use + Vision)
    │   ├── layout_analyzer.py    →  Stage C: IDM → LayoutSpec (algorithmic + Claude fallback)
    │   ├── visual_style_analyzer.py  →  Stage D: IDM → VisualStyleSpec (PyMuPDF + Claude Vision)
    │   ├── blueprint_assembler.py    →  Stage E: merge B+C+D → JSONBlueprint
    │   └── pipeline_runner.py        →  orchestrator (asyncio.gather for B/C/D concurrency)
    ├── brain/                (Project Brain — semantic artifact retrieval for V3 generation)
    │   ├── embedder.py           →  OpenAI text-embedding-3-small; embed_and_store()
    │   ├── artifact_fetcher.py   →  fetch all artifacts for a generation task (company/role/candidate/process)
    │   ├── knowledge_graph.py    →  Supabase FK traversal: project → entities
    │   ├── relevance_ranker.py   →  cosine similarity scoring; keyword fallback
    │   ├── prompt_builder.py     →  assemble section-aware generation prompt
    │   └── brain.py              →  orchestrator: build_brain_context() + call_claude()
    ├── StructureAgent  →  analyzes uploaded golden examples → template_prompt + visual_data (V2, kept)
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

### Data Flow — Document Generation (V3 — Project Brain)

1. User opens **Generate Document** popup; selects a V3 template, optionally selects a candidate
   and/or interviewer, adds requirements, clicks **Generate by Magic** or **Preview Prompt**
2. Frontend `useDocumentGenerationV3` hook calls `POST /api/generate-document/v3`
   (`preview_only: false` for direct generation; `preview_only: true` for preview)
3. Backend `generate_document_v3_endpoint` runs the **Project Brain** pipeline:
   - **Fetch blueprint** from `golden_examples.blueprint` (raises 400 if null — V3 required)
   - **Fetch all artifacts** for the project (company + role + candidate + process, per selection)
   - **Build entity context** from project/candidate/interviewer DB records
   - **Rank artifacts** against blueprint section intents via OpenAI embeddings (cosine similarity)
     + keyword fallback when embeddings are absent
   - **Assemble section-aware prompt**: each section gets its top-3 matched artifacts as context
4. If `preview_only=true`: returns `{prompt, selected_artifacts}` — shown in `PromptPreviewModal`
5. Otherwise: calls `claude-sonnet-4-6` with assembled prompt → HTML document
6. Frontend saves HTML to Supabase `project-outputs` bucket
7. Output appears in the project's Outputs section

**Proactive processing on upload:** Each artifact upload fires a non-blocking call to
`POST /api/artifacts/process` which: (1) calls Claude Sonnet to generate a `summary` and
extract `tags` (stored in the artifact row), then (2) re-generates the 1536-dim OpenAI
embedding from the enriched text (`name + type + summary + tags + processed_content`).
Artifacts with no `processed_content` (e.g. image uploads) are embedded from name + type only.
Backfill for existing artifacts: `POST /api/brain/process-artifacts` (admin endpoint).
The legacy `POST /api/artifacts/embed` endpoint is kept for backward compat (embedding only, no summary/tags).

### Data Flow — Document Generation (V2 — legacy, kept for backward compat)

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

### Data Flow — Golden Example Upload (V2 — legacy, kept for backward compat)

1. User uploads a file via the Golden Examples popup
2. Backend stores the file in the `golden-examples` Supabase storage bucket
3. **StructureAgent** runs Claude Vision on the first 2 pages of the PDF → produces
   `visual_data` (layout, typography, colour, spacing as JSON)
4. Backend extracts up to 15,000 chars of text from the document
5. A second Claude call uses that text to produce `template_prompt`
   (a structured instruction block that guides later document generation)
6. `template_prompt` and `visual_data` are stored in the `golden_examples` DB row

### Data Flow — Blueprint Pipeline (V3)

V3 replaces the single-pass analysis with an async multi-stage pipeline that produces
a structured **JSON Blueprint** stored in the `golden_examples.blueprint` JSONB column.

1. User uploads a file via the Golden Examples popup
2. Frontend POSTs to `POST /api/templates/v3` (multipart form)
3. Backend: stores file in `golden-examples` bucket, inserts a DB record with
   `status='processing'`, dispatches `run_pipeline_and_store` as a FastAPI `BackgroundTask`
4. Backend returns **HTTP 202** immediately: `{"template_id": "...", "status": "processing"}`
5. Frontend starts polling `GET /api/templates/{id}/status` every **4 seconds**
6. In the background the pipeline stages run:
   - **Stage A** (sync): `preprocessor.py` → `build_idm()` converts file bytes to the
     Intermediate Document Model (IDM) — page blocks, span-level style metadata, bboxes
   - **Stage A.5** (async, PDF only): `ocr_enricher.py` — checks average chars/page; if
     below 500 chars/page (sparse PDF, e.g. design-heavy InDesign/Illustrator export where
     headings are vector/outlined text invisible to any text extractor), renders all pages
     to PNG at 108 DPI and calls Claude Vision to extract all visible text; OCR blocks are
     appended to the IDM so all downstream stages see the complete document content
   - **Stages B, C, D** (concurrent via `asyncio.gather`):
     - B `semantic_analyzer.py` → `ContentStructureSpec` (sections, intents, rhetorical patterns)
       via Claude tool use; for PDF uploads also passes rendered page images (up to 8 pages,
       72 DPI) alongside extracted text so Claude identifies document structure from both
       visual layout and semantic content — the primary strategy for design-heavy PDFs
     - C `layout_analyzer.py` → `LayoutSpec` (margins, columns, spacing — algorithmic for PDFs, Claude fallback for DOCX)
     - D `visual_style_analyzer.py` → `VisualStyleSpec` (typography tokens, colour palette — IDM metadata + Claude Vision on rendered PNG pages)
   - **Stage E** (sync): `blueprint_assembler.py` merges B+C+D → `JSONBlueprint`
7. On success: `blueprint` JSONB and `status='ready'` written to DB
8. On failure: `status='error'` + `processing_error` written; frontend shows error badge
9. Frontend poll detects `status='ready'`, refreshes list, shows BlueprintViewer (3-tab: Content Structure / Layout / Visual Style)
10. Document generation prefers `blueprint` when present; falls back to `template_prompt` + `visual_data` for old records

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
| `max_tokens` per endpoint | `backend/api.py` uses named constants: `VISION_MAX_TOKENS=2000`, `TEMPLATE_MAX_TOKENS=3000`, `GENERATION_MAX_TOKENS=16000`. Raised from 8000 → 16000 (Mar 2026) after multi-section documents were confirmed to truncate. `call_claude` now logs `stop_reason` + `output_tokens` on every generation run. |
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
- Persistent header navigation — Projects / Transcription / Templates text links + Help icon (Apr 2026)
- Project header simplification — trash icon delete with styled confirmation modal; description display; compact client · date layout (Apr 2026)
- **Andro AI Chat** — fully operational project-context AI assistant (Apr 2026):
  - "Ask Andro" button opens a 2/3-screen modal overlay (expandable to 90%), with multi-turn conversation, auto-growing textarea, loading bubble
  - System prompt assembled per-turn: Andro persona (from `app_settings` DB table) + all artifact summaries + top-5 semantically ranked full-content artifacts (OpenAI embedding + cosine similarity)
  - File attachments: native OS file picker, content read client-side and included inline
  - Project Vault picker: popover with search + checkboxes over all project artifacts; selected artifacts included by ID (backend fetches full content)
  - Web search: opt-in chip; when active passes `tools=[{"type":"web_search_20250305","name":"web_search"}]` to Claude — citations included in response
  - Document creation: Andro wraps HTML in `<andro-document filename="...">` tags; backend detects and returns as `{response, document}`; frontend renders inline `📄 Download` chip
  - Markdown rendering via `marked` (CommonJS — avoids Next.js ESM bundling issues with react-markdown v10)
  - Backend: `POST /api/chat` + `GET /api/projects/{id}/artifacts` in `backend/api.py`; `build_chat_context()` in `backend/brain/brain.py`
  - Modal close is X-button only — backdrop click disabled to prevent accidental in-session history loss
- Project description persistence — fixed on both create and edit flows (Apr 2026)
- Document DNA Blueprint Pipeline (V3) — async multi-stage golden example analysis (Feb 2026)
- Project Brain V3 document generation — semantic artifact retrieval, section-aware prompt assembly, candidate/interviewer targeting, Preview Prompt mode (Feb 2026)

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
4. ✅ Document DNA Blueprint Pipeline (V3) — async multi-stage golden example analysis (Feb 2026)
   - ✅ Stage A.5 Vision OCR enricher — recovers text from design-heavy PDFs (<500 chars/page avg) so all stages see complete content (Mar 2026)
   - ✅ Stage B Vision pass — multimodal section detection for PDFs where headings are vector/outlined text invisible to PyMuPDF (Mar 2026)
   - ✅ Heading detection prompt rewritten — four explicit signals (font size, embedded heading pattern, standalone short blocks, semantic recognition) (Mar 2026)
   - ✅ Prompt schema bias removed from `_STRUCTURE_TOOL` — example field values no longer name specific section types (Mar 2026)
5. ✅ Project Brain — semantic artifact retrieval for V3 document generation (Feb 2026)
   - ✅ Migration 8 applied (pgvector + embedding columns on all artifact tables)
   - ✅ Existing artifact embeddings backfilled via `POST /api/brain/generate-embeddings`
   - ✅ End-to-end V3 generation tested and verified on staging
6. Review and act on the open CVE security patch PR
7. Make and test significant UI/feature changes on `staging` before pushing to `main`
8. ✅ Artifact Processing Pipeline — Claude Sonnet generates `summary` + `tags` on upload; embedding re-run from enriched text (Mar 2026)
   - ✅ `POST /api/artifacts/process` — fire-and-forget enrichment endpoint (replaces `/api/artifacts/embed` for new uploads)
   - ✅ `POST /api/brain/process-artifacts` — admin backfill endpoint
   - ✅ `brain/artifact_fetcher.py` — `key_topics` now derived from `tags` (no DB column needed)
   - Backfill existing artifacts via `POST /api/brain/process-artifacts` after deploying to staging
9. Fix Bug #36 (BlueprintViewer popup closes on any click — tabs and scroll inaccessible)
10. Fix Bug #37 (old V2 popup flashes briefly before V3 popup appears on "Generate New")
11. Fix Bug #22 (Generate New Document dropdown lists file names instead of types)
12. Fix Bug #35 (company artifact URL upload fails with pattern mismatch error)
13. Editable prompt in `PromptPreviewModal` — allow user to override Brain-assembled prompt before generation
14. ✅ **Download output documents** — "Download" button in Outputs table and "Download DOCX" button in HtmlDocumentViewer header. Backend `GET /api/outputs/{id}/download-docx` converts stored HTML to DOCX via pandoc (pypandoc). nixpacks.toml added to backend to install pandoc on Railway. (Mar 2026)
15. Separate Supabase projects (staging vs production) — **required before public launch**
16. Populate knowledge base files with real SearchWizard.ai content
17. Remove `WriterAgent` file (`backend/agents/writer_agent.py`) — no longer imported
18. Centralise the Claude model string into `ANTHROPIC_MODEL` constant or env var
20. ✅ **Display project description on main project page** — Description now displayed in the project header card beneath the title. Client name and date compacted to a single line with `·` separator. Fixed description persistence on both create and edit flows. (Apr 2026)
21. ✅ **Persistent top-level navigation** — Header now has Projects / Transcription / Templates text links and a Help icon (?) before the icon buttons. Transcription and Templates are placeholders (`href="#"`) pending implementation. (Apr 2026)
22. ✅ **Project header simplification** — Removed "← Back to projects" link and standalone red Delete Project button from the project detail page. Delete moved into the project header card as a trash icon (gray → red on hover) next to the pencil. Triggers a styled `BasePopup` confirmation modal instead of the browser-native `confirm()` dialog. (Apr 2026)
23. ✅ **Andro AI Chat** — Fully operational project AI assistant (Apr 2026). Modal overlay, multi-turn conversation, file attachments, project vault picker, opt-in web search with citations, document creation + inline download, markdown rendering. Backend `POST /api/chat` + `GET /api/projects/{id}/artifacts`; `build_chat_context()` in `brain/brain.py`; Andro persona stored in `app_settings` table.
24. **Andro chat history persistence** — Chat sessions currently exist only in React state and are lost on modal close or page refresh. Future work: persist chat history per project in Supabase (new `chat_messages` table or similar), allow users to resume prior sessions, and provide a UI to browse/search past conversations. No design decisions made yet — log only.
19. **Continuation generation for long documents** — when `stop_reason == 'max_tokens'` is detected (Claude hit the 16,000-token ceiling mid-document), automatically make a follow-up Claude call seeding the conversation with the truncated HTML and asking it to continue from where it left off, appending the result. This allows arbitrarily long documents to be generated gracefully without manual intervention. Requires: detecting truncation in `call_claude`, extracting the last complete HTML element as the resume point, and looping until `stop_reason == 'end_turn'` or a max-iteration guard is hit.

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
| 22 | "Generate New Document" dropdown lists Golden Example file names instead of types | **Fixed (Mar 2026)** | `useDocumentGenerationV3.js` now fetches `artifact_types` (category='golden') alongside templates and attaches a `typeLabel` to each. Dropdown shows e.g. "Role Specification — Egon Zehnder Role Spec v2". |
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
| 36 | BlueprintViewer popup closes on any click — user cannot switch tabs (Layout / Visual Style) or scroll | **Fixed (Mar 2026)** | Confirmed fixed by user. |
| 37 | Clicking "Generate New" briefly flashes the old V2 popup before the V3 popup appears | Open | Fix attempted (loading=true initial state) but issue still present. Do not fix until further investigation. |
| 38 | "Generate New Document" popup remains open after user clicks "Generate by Magic" — should close immediately and show only the floating generating card | Open | Fix attempted (setIsGenerating before await) but issue still present. Do not fix until further investigation. |
| 39 | Floating generating card shows "(Dismiss to cancel)" — label is misleading since dismissing only stops polling and the document still saves | **Fixed (Mar 2026)** | Text changed to "(Keep open for live updates)". |
| 40 | Outputs table Type column shows the internal type ID (e.g. "role_specification") instead of the user-friendly label (e.g. "Role Specification"). | **Fixed (Mar 2026)** | Backend `_run_generation_job` now looks up `artifact_types` table to store the friendly label in `output_type`. Frontend `getProjectOutputs` also applies a slug-to-label formatter as a retroactive fallback for existing DB rows. |
| 41 | Project Details "Description" field is not saved — reopening "Edit Project" shows a blank Description field | **Fixed (Apr 2026)** | Three root causes: (1) `updateProject` in `supabase.js` silently dropped `description` — never mapped into `updateData`. (2) `createProject` also omitted `description` from the insert payload. (3) `CreateProjectPopup` built `formattedProject` without `description`, discarding the form value before it reached the API. All three fixed. |
| — | "Edit Project Details" Description textarea showed existing text in gray (`text-gray-500`), making it indistinguishable from placeholder text — users could accidentally delete real data | **Fixed (Apr 2026)** | Changed all input/textarea fields in `ProjectHeaderEditPopup` from `text-gray-500` to `text-gray-900`; added a proper `placeholder` attribute to the description textarea. |
| 42 | Cannot add or change a Candidate's profile picture in "Edit Candidate Profile" — clicking the photo icon overlay does not open the file chooser. Likely affects Interviewers as well — fix in both places when addressed. | Open | Not yet investigated. |
| 43 | Production artifacts uploaded before Apr 2026 have empty `processed_content` — Andro cannot read their text content. | **Root cause identified (Apr 2026)** | `NEXT_PUBLIC_BACKEND_URL` on production Vercel was missing the `https://` protocol prefix. The fire-and-forget `POST /api/artifacts/process` call in `projectApi.js` uses the same env var — so on production the call was hitting the wrong URL and silently failing (frontend `.catch()` only logs to console). New uploads work correctly now that the env var is fixed. **Action required:** Run `POST /api/brain/process-artifacts` (admin backfill endpoint) to reprocess all existing production artifacts with empty `processed_content`. |

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
| **Knowledge Base (KB)** | Static files in `/backend/knowledge_base/` injected into every generation prompt. Contains SearchWizard.ai company info and product specs. |
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
| 5 | All current users are internal SearchWizard.ai team members; no real client data yet | Feb 2026 | Active — reassess at launch |
| 6 | Staging and production share one Supabase project (acceptable pre-launch only) | Feb 2026 | Active — see DECISIONS.md |
