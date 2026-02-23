# SearchWizard — Project Documentation

## Architecture Overview

SearchWizard is an AI-powered recruitment document generation platform built for Agentica AI.

| Layer | Stack | Hosting |
|-------|-------|---------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS | Vercel |
| Backend | Python 3.11, FastAPI | Railway |
| Database / Auth / Storage | Supabase | Supabase Cloud |
| LLM | Claude 3.5 Sonnet (primary), OpenAI, Gemini (fallbacks) | API |
| Document Parsing | LlamaParse (premium → fast), PyMuPDF, fallback | API + local |
| Caching | Redis (optional, falls back to in-memory) | Railway |

---

## Environments

### Production
- **Frontend:** Vercel (auto-deploys from `main` branch)
- **Backend:** https://searchwizard-production.up.railway.app
- **Branch:** `main`

### Staging
- **Frontend:** https://search-wizard-git-staging-scott-texeiras-projects.vercel.app
- **Backend:** https://searchwizard-staging.up.railway.app
- **Branch:** `staging`
- **Vercel env var:** `NEXT_PUBLIC_BACKEND_URL` scoped to Preview → staging branch

#### Staging Workflow
1. Make changes on the `staging` branch (or merge a feature branch into `staging`)
2. Vercel auto-deploys to the staging URL
3. Review and test on the staging site
4. When satisfied, merge `staging` into `main` to push live

---

## Architectural Decisions

### Supabase: Shared Between Production and Staging (Feb 2026)

**Decision:** The staging environment currently shares the same Supabase project
(database, auth, and storage) as production.

**Rationale:** At the time of this decision, the app has not yet launched publicly.
All current users are internal Agentica AI team members and data is non-production.
The risk of staging operations affecting real data is considered acceptable at this stage.

**⚠️ Future Requirement — MUST address before public launch:**
When the app goes live with real production users and real client data, staging MUST
be migrated to a separate Supabase project. This requires:
- Creating a new Supabase project for staging
- Migrating the schema (tables, RLS policies, stored procedures) to the new project
- Creating separate storage buckets in the staging Supabase project
- Updating Vercel staging environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` (staging-specific)
  - `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (staging-specific)
- Updating Railway staging environment variables with staging Supabase credentials

---

## Key Environment Variables

### Frontend (Vercel)
| Variable | Production | Staging |
|----------|-----------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Production Railway URL | `https://searchwizard-staging.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Shared (same project) | Shared (same project) — see note above |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Shared | Shared — see note above |

### Backend (Railway)
- `ANTHROPIC_API_KEY` — Primary LLM provider (Claude 3.5 Sonnet)
- `OPENAI_API_KEY` — Fallback LLM provider
- `GEMINI_API_KEY` — Fallback LLM provider
- `LLAMAPARSE_API_KEY` — Document parsing
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — Database
- `REDIS_URL` — Caching (optional; falls back to in-memory if unavailable)
- `PORT` — Server port (set automatically by Railway)

---

## Important Notes for AI Assistants

- **This is a live site.** All changes to `main` are immediately deployed to production via Vercel and Railway.
- **Always use the `staging` branch** for developing and testing changes before pushing to `main`.
- **When making text changes in JSX/JS files**, always target the exact full JSX element or surrounding context — never use broad string replacement, as variable names and other code may contain the same words as UI text.
- **Never push directly to `main`** without explicit user approval.
- **Supabase schema changes** are high-risk — always discuss with the user before modifying tables, RLS policies, or stored procedures.
