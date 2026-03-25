# New Mac Setup — SearchWizard Dev Environment

> Reference for setting up a new MacBook Pro (macOS Tahoe 26.4+) to match the current dev environment.

---

## 1. Package Manager

Install [Homebrew](https://brew.sh) first — everything else depends on it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 2. Core Runtimes & CLI Tools

```bash
brew install \
  node@20 \
  python@3.11 \
  python@3.13 \
  go \
  gh \
  gnu-sed
```

> **Notes:**
> - `node@20` is the active Node version (v24.x via the current install — check `node --version` on old machine and pin accordingly). After install: `brew link node@20 --force --overwrite`
> - `python@3.11` is required for the FastAPI backend
> - `gh` is the GitHub CLI used for PR/issue workflows
> - `gnu-sed` provides GNU-compatible `sed` (macOS default is BSD)

---

## 3. Media & Document Processing

```bash
brew install ffmpeg
```

Installs with its full dependency tree (libvpx, x264, x265, opus, lame, svt-av1, etc.).

---

## 4. Supporting Libraries

These are pulled in as dependencies but worth noting if anything breaks:

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

## 5. Python Environment (Backend)

After installing Python 3.11:

```bash
pip3.11 install --upgrade pip
```

Then from the project backend directory, install project dependencies:

```bash
cd backend/   # or wherever requirements.txt lives
pip3.11 install -r requirements.txt
```

Key packages used by the backend (installed via requirements.txt):
- `fastapi` + `uvicorn`
- `anthropic` (Claude API)
- `openai`, `google-generativeai` (fallbacks)
- `supabase`
- `llama-parse`
- `pymupdf` (fitz) — replaces PyPDF2
- `redis`

---

## 6. Node / npm

npm global packages currently in use:

```bash
npm install -g npm@latest
```

No other global npm packages are required — project deps are local via `package.json`.

---

## 7. VS Code Extensions

Install via the Extensions panel or run:

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
| `ms-dotnettools.vscode-dotnet-runtime` | .NET runtime (VS Code dependency) |
| `openai.chatgpt` | ChatGPT integration |

---

## 8. Claude Code CLI

Claude Code is installed as a VS Code extension (above), but also confirm the CLI is available:

```bash
claude --version
```

If not found, install per [Anthropic's Claude Code docs](https://docs.anthropic.com/en/docs/claude-code).

---

## 9. Environment Variables

You will need to re-configure the following secrets (do **not** store these in the repo):

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `LLAMA_CLOUD_API_KEY`
- `REDIS_URL` (optional — falls back to in-memory)

Set these in your shell profile (`~/.zprofile` or equivalent) or in a `.env` file local to each service.

---

## 10. GitHub Access

Authenticate the GitHub CLI:

```bash
gh auth login
```

Ensure you have access to the SearchWizard repo and that your SSH key or token is configured.

---

## 11. Opportunities Unlocked by macOS Tahoe

The following were previously deferred or unavailable due to system-level constraints. No code changes are recommended here — these are options now worth reconsidering.

---

### poppler (PDF rendering system library)

```bash
brew install poppler
```

**Background:** `pdf2image` (a Python library in `backend/requirements.txt`) requires `poppler` as a system dependency to convert PDF pages to images. This was explicitly avoided in **ADR-011** for the Railway backend deployment because adding system packages to Railway requires a `nixpacks.toml` config and increases build complexity.

However, `poppler` was also absent from the local machine — meaning `pdf2image` has never been functional locally either. The codebase worked around this entirely: all PDF-to-image rendering now uses **PyMuPDF directly** (no poppler required), and `pdf2image` is never actually imported anywhere in the codebase despite being listed in `requirements.txt`.

**What this unlocks on the new Mac:**
- `brew install poppler` will install cleanly on macOS Tahoe (no compatibility issues)
- `pdf2image` would become functional locally for the first time, enabling local testing of poppler-based PDF rendering if ever desired
- This does **not** change the Railway deployment situation — poppler remains a system dependency to avoid there unless a `nixpacks.toml` is added

**Recommended action (when ready):**
- Consider removing `pdf2image==1.17.0` and `PyPDF2==3.0.1` from `backend/requirements.txt` — both are dead dependencies (never imported; PyMuPDF handles all PDF work). Discuss with the team before making the change.
- If poppler-based rendering is ever needed locally for testing, install it then. No urgency.

---

### Tesseract OCR

```bash
brew install tesseract
```

**Background:** Tesseract was considered and explicitly rejected as the OCR engine in **ADR-014** in favour of Claude Vision, because Tesseract requires a `tesseract-ocr` system package on Railway (same nixpacks complexity as poppler), and Claude Vision handles design fonts and complex multi-column layouts more accurately.

**What this unlocks on the new Mac:**
- Tesseract installs cleanly via Homebrew on macOS Tahoe
- Could be used locally to benchmark OCR quality against Claude Vision Stage A.5
- No change to the Railway/production pipeline is implied — Claude Vision OCR remains the correct choice there

**Recommended action:** Install only if you want to run local comparison tests. Not required for normal development.

---

## Version Reference (current machine at time of writing)

| Tool | Version |
|------|---------|
| macOS | Darwin 21.6.0 (upgrading to Tahoe 26.4) |
| Node | v24.13.0 |
| npm | 11.6.2 |
| Python | 3.14.3 (system), 3.11.x (backend) |
| Go | 1.25.7 |
| gh | 2.86.0 |
| ffmpeg | 8.0.1 |
