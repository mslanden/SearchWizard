# SearchWizard — AI Agent Instructions

> This file is the first thing any AI assistant must read before touching this codebase.

## Required Reading — Do This First

Before proposing or making ANY change, read all three documents:

1. [`docs/PROJECT.md`](docs/PROJECT.md) — Central project brain: goals, architecture,
   current status, constraints, terminology, and assumptions.
2. [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architectural decisions log. Understand
   why things are the way they are before changing them.
3. [`docs/SETUP.md`](docs/SETUP.md) — How to run and build the app locally.

**Do not skip this step.** These documents are the shared memory of the project and
protect against context loss across sessions, crashes, or reboots.

---

## Collaboration Rules

- **Ask for clarification only when truly blocking.** If a requirement is ambiguous
  but a reasonable assumption can be made, make it, implement it, and document the
  assumption in the Assumptions section of `docs/PROJECT.md`.
- **Document assumptions explicitly.** Any assumption made during a change must be
  recorded in `docs/PROJECT.md`.
- **Update docs alongside code.** Any change that affects architecture, behavior,
  workflow, or environment configuration must also update the relevant documentation.
  Code and docs must stay in sync.
- **Always work on `staging` first.** Never push directly to `main` without explicit
  user approval. All development and testing happens on the `staging` branch.
- **Never use broad string replacement** in JSX/JS files. Always target the exact
  full JSX element or surrounding context to avoid corrupting JavaScript identifiers
  and variable names that may share words with UI text.
- **Supabase schema changes are high-risk.** Always discuss with the user before
  modifying tables, RLS policies, or stored procedures.
- **Do not touch API keys or credentials** in any environment without explicit
  instruction from the user.

---

## Environments

| Environment | Branch | Frontend URL | Backend URL |
|-------------|--------|--------------|-------------|
| Production  | `main` | Vercel (auto-deploy) | https://searchwizard-production.up.railway.app |
| Staging     | `staging` | https://search-wizard-git-staging-scott-texeiras-projects.vercel.app | https://searchwizard-staging.up.railway.app |

### Staging Workflow

1. Make all changes on the `staging` branch (or a feature branch merged into `staging`)
2. Vercel auto-deploys staging — review and test at the staging URL
3. When the user approves, merge `staging` → `main` to go live

---

## Quick Architecture Reference

| Layer | Stack | Hosting |
|-------|-------|---------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS | Vercel |
| Backend | Python 3.11, FastAPI | Railway |
| Database / Auth / Storage | Supabase (Postgres + Auth + Storage) | Supabase Cloud |
| LLM | Claude 3.5 Sonnet (primary), OpenAI + Gemini (fallbacks) | API |
| Document Parsing | LlamaParse premium → fast → PyMuPDF → basic fallback | API + local |
| Caching | Redis (optional, in-memory fallback) | Railway |

See `docs/PROJECT.md` for full architecture detail, data flow, and component map.
