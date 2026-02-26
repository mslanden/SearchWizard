# SearchWizard — Local Development Setup

> For deployed environment details, see `docs/PROJECT.md`.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | Use pyenv or system Python |
| Node.js | 18+ | Use nvm recommended |
| npm | 9+ | Comes with Node |
| Git | Any | |
| Redis | Any | Optional — app falls back to in-memory cache |

You also need API keys for: Anthropic (required), LlamaParse (required for parsing),
Supabase (required), and optionally OpenAI and Gemini.

---

## Clone the Repo

```bash
git clone https://github.com/mslanden/SearchWizard.git
cd SearchWizard
```

---

## Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your API keys (see variable list below)

# Run the development server
uvicorn api:app --reload --port 8000
```

Backend is available at: `http://localhost:8000`

### Backend Environment Variables (`/backend/.env`)

```env
ANTHROPIC_API_KEY=sk-ant-...         # Required — primary LLM
OPENAI_API_KEY=sk-...                # Optional — fallback LLM
GEMINI_API_KEY=...                   # Optional — fallback LLM
LLAMAPARSE_API_KEY=llx-...           # Required — document parsing
ENABLE_LLAMAPARSE=true
LLAMAPARSE_PRICING_TIER=premium      # or "fast"
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
REDIS_URL=redis://localhost:6379     # Optional
PORT=8000
```

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create local env file
cp .env.example .env.local 2>/dev/null || touch .env.local
# Edit .env.local with the values below

# Run the development server
npm run dev
```

Frontend is available at: `http://localhost:3000`

### Frontend Environment Variables (`/frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Build (Production)

```bash
# Frontend
cd frontend
npm run build
npm start

# Backend
cd backend
uvicorn api:app --host 0.0.0.0 --port 8000
```

---

## Supabase Setup

The app requires the following Supabase setup:

### Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `projects` | Project records | `user_id`, `title`, `client`, `date`, `description`, `background_color`, `artifact_count` |
| `artifacts` | Company and role artifacts linked to projects | `project_id`, `artifact_type` (`'company'`/`'role'`), `document_type` (specific type slug), `input_type`, `name`, `file_url`, `file_path`, `source_url`, `processed_content` |
| `candidate_artifacts` | Artifacts linked to candidates | `candidate_id`, `artifact_type` (slug), `input_type`, `name`, `file_url`, `file_path`, `source_url`, `processed_content`, `file_type`, `file_size` |
| `process_artifacts` | Artifacts linked to interviewers | `interviewer_id`, `artifact_type` (slug), `input_type`, `name`, `file_url`, `file_path`, `source_url`, `processed_content`, `file_type`, `file_size` |
| `candidates` | Candidate profiles | `project_id`, `name`, `role`, `company`, `email`, `phone`, `photo_url`, `artifacts_count` |
| `interviewers` | Interviewer profiles | `project_id`, `name`, `position`, `company`, `email`, `phone`, `photo_url`, `artifacts_count` |
| `project_outputs` | Generated document metadata | `project_id`, `name`, `output_type`, `file_url`, `file_path` |
| `user_roles` | User role and approval status | `user_id`, `role`, `is_active` |
| `artifact_types` | Admin-configurable artifact type options | `id` (TEXT slug, PK), `category`, `name`, `sort_order`, `is_active` |

### Stored Procedures (required for auth)
- `get_user_status_for_auth(user_id)` — returns user role and approval status
- `check_is_admin(user_id)` — returns boolean

### Storage Buckets
- `company-artifacts`
- `role-artifacts`
- `candidate-artifacts`
- `process-artifacts`
- `candidate-photos`
- `interviewer-photos`
- `project-outputs`
- `golden-examples`

### RLS Policies
Projects and artifacts are filtered by `user_id`. Ensure RLS is enabled and
policies restrict each user to their own data.

The `artifact_types` table requires:
- RLS enabled
- `SELECT` policy: `USING (true)` — all authenticated users can read types
- `ALL` policy for service role — admin API uses service role key for writes

### Schema Migration History

The following migrations have been applied to the shared Supabase project (Feb 2026).
When separating staging and production Supabase projects, these must be applied to both.

```sql
-- 1. Add document_type to artifacts (stores specific type slug for company/role artifacts)
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS document_type TEXT;

-- 2. Create artifact_types table (DB-driven type dropdown options)
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

-- 6. RLS policies for process_artifacts (fixes interviewer artifact upload failure)
-- NOTE: user_id column is UUID type — no cast needed.
-- If this migration has been run before, conflicting policies may still exist.
-- Always drop ALL existing policies before recreating them:
DROP POLICY IF EXISTS "Users can insert own process artifacts" ON process_artifacts;
DROP POLICY IF EXISTS "Users can view own process artifacts" ON process_artifacts;
DROP POLICY IF EXISTS "Users can delete own process artifacts" ON process_artifacts;
-- Also run: SELECT policyname FROM pg_policies WHERE tablename = 'process_artifacts';
-- and drop any additional policies not listed above, then run:
CREATE POLICY "Users can insert own process artifacts"
  ON process_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own process artifacts"
  ON process_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own process artifacts"
  ON process_artifacts FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE process_artifacts ENABLE ROW LEVEL SECURITY;
```

---

## Branching and Deployment

| Branch | Deploys To | Use For |
|--------|-----------|---------|
| `staging` | Vercel staging + Railway staging | All development and testing |
| `main` | Vercel production + Railway production | Live site only — merge from staging after approval |

**Never commit directly to `main`.** Always work on `staging` or a feature branch,
test on the staging site, and merge to `main` only with user approval.
