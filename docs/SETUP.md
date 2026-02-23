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
- `projects` — project records (user_id, title, client, date, description, background_color, artifact_count)
- `artifacts` — uploaded artifacts linked to projects
- `candidates` — candidate profiles
- `interviewers` — interviewer profiles
- `project_outputs` — generated document metadata
- `user_roles` — user role and approval status (user_id, role, is_approved)

### Stored Procedures (required for auth)
- `get_user_status_for_auth(user_id)` — returns user role and approval status
- `check_is_admin(user_id)` — returns boolean

### Storage Buckets
- `company-artifacts`
- `role-artifacts`
- `candidate-artifacts`
- `process-artifacts`
- `project-outputs`
- `golden-examples`

### RLS Policies
Projects and artifacts are filtered by `user_id`. Ensure RLS is enabled and
policies restrict each user to their own data.

---

## Branching and Deployment

| Branch | Deploys To | Use For |
|--------|-----------|---------|
| `staging` | Vercel staging + Railway staging | All development and testing |
| `main` | Vercel production + Railway production | Live site only — merge from staging after approval |

**Never commit directly to `main`.** Always work on `staging` or a feature branch,
test on the staging site, and merge to `main` only with user approval.
