# SIF Precursor Detection — Oil India Limited (SIH 2026, PS 26165)

**GOARC Industrial Safety 4.0 Platform — Safety 1.0 Prototype** — Detects Serious Injury & Fatality (SIF) precursors hidden in routine Unsafe Act / Unsafe Condition / Near-Miss reports before they become fatalities.

Live: **Frontend 5173 · Backend 8000 · AI 8001 · PostgreSQL/SQLite 5432** — runs with `docker compose` **or** without Docker (`./start.sh`).

> This README consolidates every discussion from clone → Docker-less setup → SIH ideas → DB/Fix → GOARC redesign → CCTV + Mobile roadmap.

---

## 1. Problem Statement (PS 26165)

OIL files hundreds of free-text safety reports monthly. >80% of SIFs are preceded by weak signals that are never triaged at scale. Manual review delays corrective action, repeats incidents, and risks lives + asset shutdown. The ask: **ingest routine reports, flag SIF precursors, map to IOGP Life-Saving Rules, and give actionable insight before a fatality.**

Example: `Oil leakage detected near drilling equipment` looks like a minor note but is a **Hydrocarbon Release** SIF precursor (fire/explosion). Our system now flags it **High 82%** instead of being overlooked.

## 2. System Architecture

```
                        ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
     Text (Reports) ────▶│  Frontend   │────▶│  Backend    │────▶│    AI       │
                        │  React 19   │     │  FastAPI    │     │  FastAPI    │
CCTV (future) ─────────▶│  Vite 5173  │     │  8000       │     │  8001       │
                        └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
                               │                   │                   │
                        ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
                        │  Phone App  │◀────│ PostgreSQL  │◀────│  Vision     │
                        │  Expo       │     │  SQLite     │     │  YOLOv8     │
                        └─────────────┘     └─────────────┘     └─────────────┘
```

**Ports:** 5173 (Vite) / 8000 (FastAPI) / 8001 (AI) / 5432 (Postgres, Docker) / 8002 (AI Vision, planned)  
**Env:** `VITE_API_URL=http://localhost:8000` (NEXT_PUBLIC alias), `DATABASE_URL` (sqlite:///./sif.db local vs postgresql://postgres:5432 docker), `AI_SERVICE_URL` (http://localhost:8001 vs http://ai:8001).

## 3. Quick Start

### Without Docker (college laptop, no Docker Desktop)

```bash
# from final/OIL-SIF-PRECURSOR
./start.sh
# uses SQLite (backend/sif.db), Python 3.12 venvs, waits for /health, auto-seeds 50 reports
# Frontend: http://localhost:5173  (OIL splash → fade)
# Backend:  http://localhost:8000/docs
# AI:       http://localhost:8001/docs
```

Fixes applied: Python 3.14 → 3.12 (pydantic), `5173` vs `3000`, `blis` binary wheels, `.env` SQLite.

### With Docker

```bash
cp .env.example .env
docker compose up --build
# Frontend: http://localhost:5173  | Backend 8000 | AI 8001 | Postgres 5432
```

## 4. Tech Stack by Group

| Group | Stack | What They Built | Key Files |
|-------|-------|-----------------|-----------|
| **Frontend ×2** | React 19, Vite 8.2, Router 7, Recharts 3.10, Poppins, GOARC #FCAB04/#2C52DB/#1A1E22 | 4 routes + GOARC dark hero + wave 85px, 4-col stats, side-by-side Pie/Bar, Reports CRUD + **CSV bulk (5 MB/5000-row guard)**, Details → Analyze **locked prefill** (readOnly + 5000-char counter), Dashboard 15s poll + storage sync | `pages/*`, `components/*`, `App.css`, `index.css`, `api.js`, `data/reportsData.js`, `vite.config.js` |
| **Backend ×2** | FastAPI 0.110, Pydantic 2, SQLAlchemy 2, httpx, dateutil | 8 endpoints, schemas + crud (IntegrityError retry, ilike on all fields), utils (10 date formats + dateutil), lifespan `create_all` | `main.py`, `crud.py`, `schemas.py`, `utils.py` |
| **Database ×1** | PostgreSQL 16-alpine, SQLite, SQLAlchemy, Alembic (ready) | 8-table schema (reports → classifications/lsr_tags/entities → clusters/batches/users), `StaticPool` vs `pool_pre_ping`, indexes, idempotent `seed.py --force` | `database/init.sql`, `database.py`, `models.py`, `seed.py` |
| **AI ×1** | scikit-learn 1.9, joblib, TF-IDF, YOLOv8 (planned) | Hybrid ML (`sif_model.pkl` + vectorizer) + 7 lexicon rules (Hydrocarbon Release boost 0.82), lazy load, Docker path fix | `main.py`, `analyser.py`, `train_model.py`, `safety_reports.csv` |
| **Docker/DevOps** | Docker, Compose, python:3.11-slim, node:20-alpine | 3 Dockerfiles (EXPOSE 5173, libgomp1), compose 5173:5173 `--host`, healthchecks, anon `/app/.venv`, `.dockerignore`, `start.sh` | `docker-compose.yml`, `Dockerfiles`, `start.sh`, `.dockerignore` |
| **Git** | Git, GitHub PAT, rebase | `feat/* → develop → main` PRs, `.env` gitignored, 15+ pushes `yugantyadav/OIL-SIF-PRECURSOR` | `.gitignore`, `README.md`, `docs/*` |
| **App (new)** | Expo React Native, FCM/APNs | Officer phone app (login, live incidents, detail + clip, ACK, settings) | `mobile/` (planned) |

**GOARC Design (design1.md):** Dark `#1A1E22` hero + blue wash `linear-gradient(90deg,#2C52DB→transparent)` + amber `#FCAB04` pills, white cards `1px #FFEEC6`, Poppins 700 48px, 44px inputs 6px, **Ferrari-like OIL splash** (56×56 #FCAB04, 700ms in →1.4s hold →650ms fade, sessionStorage once).

## 5. Features (Current)

- **Reports:** List (search + category/risk filter), Details (R-006 etc. white GOARC card), **+ Add Report** (manual 7-field form + **Bulk CSV** with 5 MB/5000-row guard, `FormData → POST /api/reports/upload`, template download, progress + auto-refresh via 15s poll).
- **Dashboard:** **Industrial Safety Dashboard** hero (SIF RATE / FLAGGED pills) + 4 stat cards (Total/Acts/Conditions/Near Miss in one line) + **side-by-side Pie (Risk) + Bar (Category)** (flex, stacks at 900px).
- **AI Prediction:** Free-text textarea (5000-char limit + counter) or **locked prefill from Details** (readOnly, only Analyze clickable, Edit manually toggle) → live `POST /api/analyze → 8001 /analyze` → risk Critical/High/Medium/Low + SIF probability + precursors + explanation + actions. Fixed: was hardcoded High 78% for all; now live ML.
- **Leakage Fix:** `Oil leakage…` was Medium 57% low → now **High 82% Hydrocarbon Release** (added `oil leakage/gas leak/hydrocarbon/spill` to `analyser.py` + boost).
- **Navbar:** White 80px sticky, `OIL` 36×36 #FBB102 badge + `SIF Precursor / SAFETY 1.0 PROTOTYPE` (aligned to badge top/bottom, 8px/1.6px tracking, aria-labels).

## 6. Database

**8 tables:** `reports` (id PK String36, report_id UNIQUE R-001, date→28 August 2026, site/location, activity, report_type, risk, status, reported_by, narrative, batch_id) → `classifications` (sif_probability/flag, confidence, model_version hybrid-v1, snippets Text JSON) → `lsr_tags` (rule_name + confidence) → `entities` (activity/location/barrier_failure) → `clusters/report_clusters` (pattern mining) → `batches` → `users` (push_token, role). **Indexes:** `idx_reports_site/date/batch`, `idx_classifications_sif_flag`, `idx_lsr_rule`. 

**Dual engine:** `database.py` — SQLite `StaticPool + check_same_thread False` vs Postgres `pool_pre_ping`. `init.sql` (UUID/JSONB) on first Docker boot; local uses `Base.metadata.create_all`. **Seed:** `seed.py` parses `frontend/src/data/reportsData.js` (50 rows) via regex, idempotent (inserts only missing unless `--force`), `utils.parse_date` 10 formats + `dateutil` fallback (`30 Aug` → `30 August 2026` tested). `next_report_id` with 5× IntegrityError retry avoids race.

## 7. AI Service

`ai/main.py` (`POST /analyze`): validates `narrative`, calls `analyser.analyse_report()` (lazy `_ensure_loaded()` for `sif_model.pkl` 8671 bytes + `vectorizer.pkl` 41KB, dual PATH fix for `/app` vs `project/ai`), returns `sif + lsr_tags + entities`. **Hybrid:** TF-IDF `predict_proba` + 7-rule lexicon (6 IOGP + Hydrocarbon Release) → severity mapping high≥0.80/medium≥0.60/low. Leakage boost `≥0.82` added. `requirements.txt` relaxed to binary wheels to avoid `blis` Cython.

## 8. Docker & DevOps

**Dockerfiles:** `backend` python:3.11-slim + `gcc libpq-dev`, `ai` + `libgomp1`, `frontend` node:20-alpine `EXPOSE 5173` + `npm run dev -- --host 0.0.0.0 --port 5173`. **Compose:** no `version`, `postgres_data` volume, `pg_isready` healthcheck, backend `depends_on: service_healthy`, anonymous `/app/.venv` + `/app/__pycache__` to avoid host shadowing, `vite.config.js` host 0.0.0.0. **start.sh:** Python 3.12 venvs, wait-for-health `curl /health`, auto `seed.py`, trap kill. **Secrets:** `.env` gitignored, `.env.example` committed, PAT injected via `https://token@github` then reset. Fixed: Flask 3.14 on 8000, port 3000→5173, Cython build, CORS, 405 route.

## 9. Git Workflow

```bash
git clone https://github.com/yugantyadav/OIL-SIF-PRECURSOR.git
git checkout -b feat/your-task
# ... code ...
git push -u origin feat/your-task  # PAT: ghp_... via https://token@github
# Open PR → develop → DevOps merges to main
# Pull: git pull --rebase (resolve ai/requirements.txt conflict to >=1.9.0 + joblib)
```

## 10. API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/analyze` | narrative (+ optional report_id) → AI SIF + persist |
| GET/POST | `/api/reports` | list (ilike search + sif_only) / create (AI-derived risk) |
| GET | `/api/reports/{id}` | detail + classifications/lsr_tags/entities |
| POST | `/api/reports/upload` | CSV bulk (flexible headers) → batch |
| POST | `/api/reports/analyze-batch` | run AI on pending batch rows |
| GET | `/api/dashboard/stats` | total/by_category/by_risk/by_status/by_site/lsr_counts |

**Health:** `/health`, `/health/db` (SELECT 1), `/health/ai` (httpx to 8001).

## 11. Datasets

- **First CSV** `data/reports_50.csv` (and `~/Downloads/reports_template (1).csv`): 50 rows `R-101`–`R-150` mapped from `reportsData.js` (headers: report_id,date,category,description,risk,status,location,reportedBy).
- **New CSV** `data/reports_new_50.csv` (and `~/Downloads/reports_new_50.csv`): 50 fresh OIL incidents `R-201`–`R-250` (welder hot work, gas cloud, corroded pipeline, rigger under casing, etc.).

## 12. SIH Selection Ideas (Judges)

Explainable AI snippets, similar-incident finder (embeddings), risk heatmap, automated safety bulletin PDF, LLM root-cause chain, 9-rule severity matrix, mobile voice-to-report.

## 13. Remodel Plan (Next Phase)

**Summary:** Keep reports (simplify to 3 fields: description/where/supervised_by → AI drafts full report → Submit/Edit), add **CCTV page** (`/cctv`: upload clip or sample + YOLO boxes + zone polygon + severity Warning/Serious/Critical), **immutable log** (`report_logs` append-only, no DELETE API, History timeline), **auto-alert** (Critical → FCM push to officer + speaker mock → ACK in 60s else escalate). Text + CCTV share DB (`source: MANUAL/CCTV`). See `docs/New_Project-Ideas.pdf` (overview) and `docs/New_Project-Ideas_Detailed.pdf` (50-bullet per-group build sheet covering PPE, worker ID, zone, proximity, fall, fire, severity, escalation, evidence, architecture, demo flow, predictive safety).

**Per-group next:** App (Expo + FCM, 6 tasks), Frontend (/cctv + History), Backend (report_logs + AI risk + push fan-out), Database (report_logs + source enum), AI (ai/vision.py YOLOv8 + ByteTrack + pose), Docker (ai-vision 8002), Git (4 feat branches → v0.4), QA (2 canned clips).

## 14. Scalability, Security, Hypotheticals

**Bottleneck:** sync `analyze-batch` loops sequentially (~4 min/500 rows). **Scale to 100k–1M:** LB + Postgres replicas + idx + Redis cache for /stats + Celery workers + CDN + GPU AI + cursor pagination.  
**Security:** On-prem inference (no external LLM), .env gitignored, ORM (no raw SQL), 5 MB/5000-row + 5000-char guards. Next: JWT/RBAC + HTTPS + audit log.  
**Hypotheticals:** AI down → fallback low-prob + warning, still stores; DB down → 503 + localStorage offline + 15s poll retry; huge CSV → client block; overlong/HTML → 5000 limit + Pydantic; port 8000 busy (Flask) → killed; AI cold start → lazy load guarded.

## 15. PDFs Generated

- `docs/Hackathon_Judge_QA.pdf` (23 KB) — 20 judge Q&A + group table, GOARC, leakage fix.
- `docs/Hackathon_Brief.pdf` (12 KB) — Brief with Database deep-dive.
- `docs/DevOps_Database.pdf` (9.9 KB) — DevOps + Database complete knowledge base.
- `docs/New_Project-Ideas.pdf` (13 KB) — Remodel overview + per-group To-Do.
- `docs/New_Project-Ideas_Detailed.pdf` (16 KB) — Detailed build sheet (PPE → predictive safety).
- `docs/New_Project-Ideas.pdf` vs Detailed kept separately.

## 16. Demo Script (60s text + 60s CCTV)

1. Reports → + Add → 3 fields → AI draft High 82% → Submit → table + History +1. 2. CCTV → upload clip → boxes → zone flash → fall 2s → Critical Hydrocarbon Release → dual-phone FCM push + speaker Audio → ACK → Dashboard Ack + timer stops → History proves immutable.

## 17. License

Proprietary — SIH 2026 submission for Oil India Limited.
