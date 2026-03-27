# SearchWizard — New Mac Setup & Project Onboarding

> Complete setup guide for a new MacBook Pro running macOS Tahoe 26.4+.
> Assumes the full `/Users/stexeira/search-wizard` directory has already been
> transferred to the new machine. A Claude Code session reading this document should
> have everything needed to start working immediately.

---

## Table of Contents

1. [System Prerequisites](#1-system-prerequisites)
2. [GitHub — Reconnect the Repo](#2-github--reconnect-the-repo)
3. [Backend — Local Setup](#3-backend--local-setup)
4. [Frontend — Local Setup](#4-frontend--local-setup)
5. [Running the App Locally](#5-running-the-app-locally)
6. [VS Code Extensions](#6-vs-code-extensions)
7. [Claude Code CLI](#7-claude-code-cli)
8. [Vercel — Frontend Hosting](#8-vercel--frontend-hosting)
9. [Railway — Backend Hosting](#9-railway--backend-hosting)
10. [Supabase — Database, Auth & Storage](#10-supabase--database-auth--storage)
11. [Opportunities Unlocked by macOS Tahoe](#11-opportunities-unlocked-by-macos-tahoe)
12. [Version Reference](#12-version-reference)

---

## 1. System Prerequisites

### 1.1 Homebrew

Install [Homebrew](https://brew.sh) first — everything else depends on it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the post-install instructions to add Homebrew to your PATH (printed at the end
of the installer — typically requires adding a line to `~/.zprofile`).

### 1.2 Core Runtimes & CLI Tools

```bash
brew install \
  node@20 \
  python@3.11 \
  python@3.13 \
  go \
  gh \
  gnu-sed
```

After Node installs:
```bash
brew link node@20 --force --overwrite
```

> - `python@3.11` — required for the FastAPI backend
> - `gh` — GitHub CLI (used for PR and issue workflows)
> - `gnu-sed` — GNU-compatible `sed`; macOS ships BSD sed which behaves differently

### 1.3 Media & Document Processing

```bash
brew install ffmpeg
```

Installs with its full dependency tree (libvpx, x264, x265, opus, lame, svt-av1, etc.).

### 1.4 Supporting Libraries

```bash
brew install \
  openssl@3 \
  sqlite \
  readline \
  xz \
  zstd \
  ca-certificates
```

---

## 2. GitHub — Reconnect the Repo

The repo directory is already on disk. You only need to authenticate and verify the
remote is correctly set.

### 2.1 Authenticate the GitHub CLI

```bash
gh auth login
```

Choose: GitHub.com → HTTPS → authenticate via browser.

### 2.2 Configure Git identity

```bash
git config --global user.name "Scott Texeira"
git config --global user.email "your@email.com"
```

### 2.3 Verify the remote

From the project root (`/Users/stexeira/search-wizard`):

```bash
git remote -v
```

Expected output:
```
origin  https://github.com/mslanden/SearchWizard.git (fetch)
origin  https://github.com/mslanden/SearchWizard.git (push)
```

### 2.4 Branches

| Branch | Purpose |
|--------|---------|
| `staging` | All development — always work here first |
| `main` | Production — merge from staging only after user approval |

**Never commit directly to `main`.** The current active branch for development is `staging`.

### 2.5 Fetch latest

```bash
git fetch origin
git checkout staging
git pull origin staging
```

---

## 3. Backend — Local Setup

The backend is a Python 3.11 FastAPI application. All backend files live in
`/Users/stexeira/search-wizard/backend/`.

### 3.1 Install Python dependencies

```bash
cd /Users/stexeira/search-wizard/backend
pip3.11 install --upgrade pip
pip3.11 install -r requirements.txt
```

> PyMuPDF may require system libraries. If the install fails, run:
> `brew install freetype harfbuzz jpeg-turbo openjpeg` then retry.

### 3.2 Create the backend `.env` file

```bash
cp .env.example .env
```

Then edit `backend/.env` and fill in all values (see [Section 10](#10-supabase--database-auth--storage)
for Supabase credentials and the service URLs below):

```env
# LLM — Required
ANTHROPIC_API_KEY=sk-ant-...

# LLM — Optional fallbacks
OPENAI_API_KEY=sk-...          # Also required for Project Brain embeddings
GEMINI_API_KEY=...

# Document parsing — Required
LLAMAPARSE_API_KEY=llx-...
ENABLE_LLAMAPARSE=true
LLAMAPARSE_PRICING_TIER=premium   # or "fast"

# Supabase — Required (shared project; both staging + production use same values for now)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis — Optional (app falls back to in-memory cache if absent)
REDIS_URL=redis://localhost:6379

# Server
PORT=8000
```

**Where to find these values:**
- `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com) → API Keys
- `OPENAI_API_KEY` — [platform.openai.com](https://platform.openai.com) → API Keys
- `LLAMAPARSE_API_KEY` — [cloud.llamaindex.ai](https://cloud.llamaindex.ai)
- Supabase credentials — Supabase dashboard → Project Settings → API (see Section 10)

---

## 4. Frontend — Local Setup

The frontend is a Next.js 16 app. All frontend files live in
`/Users/stexeira/search-wizard/frontend/`.

### 4.1 Install Node dependencies

```bash
cd /Users/stexeira/search-wizard/frontend
npm install
```

### 4.2 Create the frontend `.env.local` file

There is no `.env.example` for the frontend. Create `frontend/.env.local` manually:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

> `NEXT_PUBLIC_BACKEND_URL` points to your local backend when developing locally.
> On Vercel staging it is set to the Railway staging URL; on Vercel production it is
> set to the Railway production URL.

---

## 5. Running the App Locally

Open two terminal windows/tabs:

**Terminal 1 — Backend:**
```bash
cd /Users/stexeira/search-wizard/backend
uvicorn api:app --reload --port 8000
```
Backend available at: `http://localhost:8000`

**Terminal 2 — Frontend:**
```bash
cd /Users/stexeira/search-wizard/frontend
npm run dev
```
Frontend available at: `http://localhost:3000`

The frontend talks to the local backend via `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`.
The backend talks to the shared Supabase cloud project (staging + production share one
Supabase instance until public launch — see ADR-001 in `docs/DECISIONS.md`).

---

## 6. VS Code Extensions

Install via the Extensions panel or run all at once:

```bash
code --install-extension anthropic.claude-code
code --install-extension eamodio.gitlens
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.debugpy
code --install-extension ms-python.vscode-python-envs
code --install-extension ms-azuretools.vscode-containers
code --install-extension ms-dotnettools.vscode-dotnet-runtime
code --install-extension openai.chatgpt
```

| Extension | Purpose |
|-----------|---------|
| `anthropic.claude-code` | Claude Code CLI integration |
| `eamodio.gitlens` | Enhanced Git history and blame |
| `ms-python.python` | Python language support |
| `ms-python.vscode-pylance` | Python IntelliSense |
| `ms-python.debugpy` | Python debugger |
| `ms-python.vscode-python-envs` | Python environment management |
| `ms-azuretools.vscode-containers` | Docker/container support |
| `ms-dotnettools.vscode-dotnet-runtime` | .NET runtime (VS Code internal dependency) |
| `openai.chatgpt` | ChatGPT integration |

---

## 7. Claude Code CLI

Claude Code is installed as a VS Code extension (above), which also installs the CLI.
Verify:

```bash
claude --version
```

If not found, follow the [Claude Code installation docs](https://docs.anthropic.com/en/docs/claude-code).

**Important project instructions:** The file `CLAUDE.md` at the project root is
automatically read by Claude Code at the start of every session. It references three
required documents Claude must read before making any changes:
- `docs/PROJECT.md` — architecture, data flows, constraints, bug log
- `docs/DECISIONS.md` — architectural decision log
- `docs/SETUP.md` — local dev setup reference

---

## 8. Vercel — Frontend Hosting

The frontend is auto-deployed to Vercel via GitHub branch pushes.

### 8.1 Environments

| Branch | Vercel Environment | URL |
|--------|-------------------|-----|
| `staging` | Preview | `https://search-wizard-git-staging-scott-texeiras-projects.vercel.app` |
| `main` | Production | Vercel production URL (auto-assigned) |

### 8.2 How deployments work

- Pushing to `staging` → Vercel auto-deploys the staging preview
- Pushing to `main` → Vercel auto-deploys production
- No manual Vercel CLI interaction is needed for normal deployments

### 8.3 Vercel environment variables to configure

Log in at [vercel.com](https://vercel.com) → SearchWizard project → Settings → Environment Variables.

Each environment (Production / Preview / Development) needs:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_BACKEND_URL` | Railway backend URL for that environment |

Set `NEXT_PUBLIC_BACKEND_URL` per environment:
- **Production** → `https://searchwizard-production.up.railway.app`
- **Preview (staging branch)** → `https://searchwizard-staging.up.railway.app`

> **CSP note:** The `frontend/next.config.js` `connect-src` directive on the `staging`
> branch explicitly includes the staging Railway backend URL. The `main` branch version
> does NOT include it. This is intentional — see ADR-006 in `docs/DECISIONS.md`.

### 8.4 Vercel CLI (optional)

If you need to trigger deploys or inspect logs from the terminal:
```bash
npm install -g vercel
vercel login
```

---

## 9. Railway — Backend Hosting

The FastAPI backend runs on Railway with two separate environments.

### 9.1 Environments

| Environment | Branch trigger | URL |
|-------------|---------------|-----|
| Production | `main` | `https://searchwizard-production.up.railway.app` |
| Staging | `staging` | `https://searchwizard-staging.up.railway.app` |

### 9.2 How deployments work

Railway auto-deploys when GitHub pushes to the linked branch. The backend uses
`nixpacks` as the build system (`backend/railway.toml`) and starts via:
```
python start.py
```

A `nixpacks.toml` is present in the backend to install `pandoc` (used for HTML → DOCX
conversion). No manual Railway CLI interaction is needed for normal deployments.

### 9.3 Railway environment variables to configure

Log in at [railway.app](https://railway.app) → SearchWizard project → select the service
(staging or production) → Variables tab.

Both environments need the same set of variables as `backend/.env`:

```
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
LLAMAPARSE_API_KEY
ENABLE_LLAMAPARSE=true
LLAMAPARSE_PRICING_TIER=premium
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
REDIS_URL                         (optional)
PORT=8000
CORS_ALLOWED_ORIGINS              (see below)
```

`CORS_ALLOWED_ORIGINS` must include the Vercel frontend URL(s) for that environment:
- **Staging**: `https://search-wizard-git-staging-scott-texeiras-projects.vercel.app`
- **Production**: the production Vercel URL

> If a new Vercel preview URL is generated (e.g. for a feature branch), add it to
> `CORS_ALLOWED_ORIGINS` on the staging Railway service.

### 9.4 Railway CLI (optional)

```bash
brew install railway
railway login
```

View logs: `railway logs` (inside the project directory with the correct project linked).

---

## 10. Supabase — Database, Auth & Storage

Both staging and production currently share **one Supabase project** (see ADR-001 in
`docs/DECISIONS.md`). This must be separated into two projects before public launch.

### 10.1 Finding your credentials

Log in at [supabase.com](https://supabase.com) → SearchWizard project → Project Settings → API:

| Credential | Where used |
|-----------|-----------|
| **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` | backend `.env`, frontend `.env.local`, Vercel, Railway |
| **service_role (secret)** → `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | backend `.env`, frontend `.env.local`, Vercel, Railway |

> The `anon` key is **not** used by this project — the service role key is used throughout.

### 10.2 Required tables

| Table | Description |
|-------|-------------|
| `projects` | Recruitment engagements |
| `artifacts` | Company and role context documents |
| `candidate_artifacts` | Documents attached to candidates |
| `process_artifacts` | Documents attached to interviewers |
| `candidates` | Candidate profiles |
| `interviewers` | Interviewer profiles |
| `project_outputs` | Generated document metadata |
| `user_roles` | User approval status and roles |
| `artifact_types` | Admin-configurable artifact type options |
| `golden_examples` | Uploaded example documents + JSON Blueprints |

### 10.3 Required stored procedures (auth)

These RPCs must exist or the admin approval system will not function:

- `get_user_status_for_auth(user_id)` — returns user role and approval status
- `check_is_admin(user_id)` — returns boolean

### 10.4 Required storage buckets

Create these in Supabase → Storage if they don't exist:

- `company-artifacts`
- `role-artifacts`
- `candidate-artifacts`
- `process-artifacts`
- `candidate-photos`
- `interviewer-photos`
- `project-outputs`
- `golden-examples`

### 10.5 Required extensions

Enable in Supabase → Database → Extensions:
- **pgvector** — required for Project Brain embedding storage and similarity search
  (available on Supabase Pro plan)

### 10.6 Schema migration history

All migrations below have been applied to the current shared Supabase project. If a new
Supabase project is ever created (e.g. to split staging from production per ADR-001),
run all of these in order via the Supabase SQL Editor.

```sql
-- 1. Add document_type to artifacts
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS document_type TEXT;

-- 2. Create artifact_types table
CREATE TABLE IF NOT EXISTS artifact_types (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE artifact_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read artifact types" ON artifact_types FOR SELECT USING (true);
CREATE POLICY "Service role can manage artifact types" ON artifact_types FOR ALL USING (true);

-- 3. Add missing columns to candidate_artifacts
ALTER TABLE candidate_artifacts ADD COLUMN IF NOT EXISTS artifact_type TEXT;
ALTER TABLE candidate_artifacts ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'file';
ALTER TABLE candidate_artifacts ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE candidate_artifacts ADD COLUMN IF NOT EXISTS processed_content TEXT;
ALTER TABLE candidate_artifacts ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE candidate_artifacts ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- 4. Add missing columns to process_artifacts
ALTER TABLE process_artifacts ADD COLUMN IF NOT EXISTS artifact_type TEXT;
ALTER TABLE process_artifacts ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'file';
ALTER TABLE process_artifacts ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE process_artifacts ADD COLUMN IF NOT EXISTS processed_content TEXT;
ALTER TABLE process_artifacts ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE process_artifacts ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- 5. Add artifacts_count to candidates and interviewers
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS artifacts_count INTEGER DEFAULT 0;
ALTER TABLE interviewers ADD COLUMN IF NOT EXISTS artifacts_count INTEGER DEFAULT 0;

-- 6. RLS policies for process_artifacts
-- Always drop all existing policies first to avoid conflicts:
DROP POLICY IF EXISTS "Users can insert own process artifacts" ON process_artifacts;
DROP POLICY IF EXISTS "Users can view own process artifacts" ON process_artifacts;
DROP POLICY IF EXISTS "Users can delete own process artifacts" ON process_artifacts;
-- Check for any others: SELECT policyname FROM pg_policies WHERE tablename = 'process_artifacts';
CREATE POLICY "Users can insert own process artifacts"
  ON process_artifacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own process artifacts"
  ON process_artifacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own process artifacts"
  ON process_artifacts FOR DELETE USING (auth.uid() = user_id);
ALTER TABLE process_artifacts ENABLE ROW LEVEL SECURITY;

-- 7. Blueprint pipeline columns on golden_examples
-- NOTE: Run the full block — partial application (blueprint + status only) causes
-- silent pipeline crashes when the missing timestamp columns are written to.
ALTER TABLE golden_examples
  ADD COLUMN IF NOT EXISTS blueprint             JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status               TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS processing_error     TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS golden_examples_status_idx
  ON golden_examples (status) WHERE status != 'ready';

-- 8. Project Brain — pgvector embeddings + metadata stubs
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE artifacts
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS summary   TEXT,
  ADD COLUMN IF NOT EXISTS tags      TEXT[];
CREATE INDEX IF NOT EXISTS artifacts_embedding_idx
  ON artifacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE candidate_artifacts
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS summary   TEXT,
  ADD COLUMN IF NOT EXISTS tags      TEXT[];
CREATE INDEX IF NOT EXISTS candidate_artifacts_embedding_idx
  ON candidate_artifacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE process_artifacts
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS summary   TEXT,
  ADD COLUMN IF NOT EXISTS tags      TEXT[];
CREATE INDEX IF NOT EXISTS process_artifacts_embedding_idx
  ON process_artifacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

After applying Migration 8 on a new DB, backfill embeddings for existing artifacts:
```bash
curl -X POST https://<backend-url>/api/brain/process-artifacts \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<admin_user_id>"}'
```

### 10.7 Admin user setup

After registering the first user account, grant admin access via Supabase SQL Editor:

```sql
INSERT INTO user_roles (user_id, role, is_active)
VALUES ('<your-user-uuid>', 'admin', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = true;
```

Find your user UUID in Supabase → Authentication → Users.

---

## 11. Opportunities Unlocked by macOS Tahoe

The following were previously deferred or unavailable due to system-level constraints.
No code changes are recommended now — these are options worth reconsidering.

### poppler (PDF rendering system library)

```bash
brew install poppler
```

**Background:** `pdf2image` (listed in `backend/requirements.txt`) requires `poppler`
as a system dependency to convert PDF pages to images. It was avoided in **ADR-011**
for Railway because adding system packages to Railway requires `nixpacks.toml` config
and increases build complexity.

`poppler` was also absent from the local machine, meaning `pdf2image` has never been
functional locally. The codebase worked around this entirely — all PDF-to-image
rendering now uses **PyMuPDF directly**, and `pdf2image` is never actually imported
anywhere despite being listed in `requirements.txt`.

**What this unlocks on the new Mac:**
- `brew install poppler` will install cleanly on macOS Tahoe
- `pdf2image` would become functional locally for the first time
- Does **not** change the Railway situation — poppler remains a system dependency
  to avoid there unless a `nixpacks.toml` entry is added

**Recommended action:** Consider removing `pdf2image==1.17.0` and `PyPDF2==3.0.1` from
`backend/requirements.txt` — both are dead dependencies (never imported; PyMuPDF
handles all PDF work). Discuss before making the change.

### Tesseract OCR

```bash
brew install tesseract
```

**Background:** Tesseract was explicitly rejected in **ADR-014** in favour of Claude
Vision OCR, because it requires a system package on Railway (same nixpacks issue as
poppler), and Claude Vision handles design fonts and complex layouts more accurately.

**What this unlocks:** Tesseract installs cleanly on macOS Tahoe and could be used
locally to benchmark OCR quality against Claude Vision Stage A.5. No change to the
Railway/production pipeline is implied.

**Recommended action:** Install only if you want to run local comparison tests.

---

## 12. Version Reference

Current machine versions at time of writing (March 2026):

| Tool | Version |
|------|---------|
| macOS | Tahoe 26.4 |
| Node | v24.13.0 |
| npm | 11.6.2 |
| Python (system) | 3.14.3 |
| Python (backend) | 3.11.x |
| Go | 1.25.7 |
| GitHub CLI (`gh`) | 2.86.0 |
| ffmpeg | 8.0.1 |
