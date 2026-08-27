# SIF Precursor Detection — Oil India Limited (SIH 2026, PS 26165)

AI/NLP engine to detect Serious Injury & Fatality (SIF) precursors in OIL's UA/UC, near-miss, and incident reports. Auto-classifies SIF-potential, tags IOGP Life-Saving Rules, and surfaces recurring precursor patterns.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│    AI       │
│  (Next.js)  │     │  (FastAPI)  │     │  (Transformers)│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

**Ports:**
- Frontend: 3000
- Backend API: 8000
- AI Service: 8001
- PostgreSQL: 5432

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone & Configure
```bash
git clone <repo-url>
cd OIL-SIF-PRECURSOR
cp .env.example .env
# Edit .env if needed
```

### 2. Run with Docker (Recommended)
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- AI Service: http://localhost:8001
- API Docs: http://localhost:8000/docs

### 3. Generate Demo Data
```bash
# Install faker if running locally
pip install faker

# Generate 600 synthetic OIL-style reports
python data/seed_reports.py
```

### 4. Demo Workflow
1. Open http://localhost:3000
2. Go to **Analyze** tab → paste a safety report → click **Analyze**
3. Or go to **Analyze** → **Bulk CSV Upload** → upload `data/safety_reports.csv`
4. View **Dashboard** for SIF density rankings, LSR distribution
5. Go to **Reports** to drill down into individual analyses

## Project Structure

```
OIL-SIF-PRECURSOR/
├── frontend/          # Next.js 14 + Tailwind + Recharts
├── backend/           # FastAPI + SQLAlchemy + PostgreSQL
├── ai/                # FastAI NLP service (transformers, GLiNER, sentence-transformers)
├── database/          # SQL schema (init.sql)
├── data/              # Seed scripts & demo CSV
├── docs/              # Architecture, API specs
├── docker-compose.yml # Multi-container orchestration
├── .env.example       # Environment template
└── .gitignore
```

## API Endpoints

### Backend (port 8000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/health/db` | Database connectivity |
| POST | `/api/analyze` | Analyze single report |
| POST | `/api/reports/upload` | Upload CSV batch |
| POST | `/api/reports/analyze-batch` | Trigger batch analysis |
| GET | `/api/reports` | List reports (filterable) |
| GET | `/api/dashboard/stats` | Dashboard KPIs & charts |

### AI Service (port 8001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| POST | `/analyze` | Full NLP analysis (SIF + LSR + entities) |

## AI Pipeline Details

**A) SIF Classifier** (ensemble):
- Stage 1: Curated lexicon + energy-severity heuristics (DEKRA/EEI precursor model)
- Stage 2: Zero-shot NLI (`facebook/bart-large-mnli`) → "serious injury or fatality potential" vs "minor injury"
- Weighted ensemble → probability + flag

**B) LSR Tagger** (hybrid):
- Keyword lexicon per IOGP Report 459 rule (9 rules, 2021 revision)
- Zero-shot NLI against official rule descriptions
- Merged → multi-label tags with confidence

**C) Pattern Mining**:
- GLiNER for entity extraction (activity, location, equipment, chemical, barrier_failure)
- Sentence-transformers embeddings + KMeans/HDBSCAN clustering
- Recurring precursor clusters with example snippets

## IOGP Life-Saving Rules (2021)
1. Bypassing Safety Controls
2. Confined Space
3. Driving
4. Energy Isolation
5. Hot Work
6. Line of Fire
7. Safe Mechanical Lifting
8. Work Authorisation
9. Working at Height

## Development

### Local without Docker
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# AI
cd ../ai
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8001

# Frontend
cd ../frontend
npm install
npm run dev
```

### Database
```bash
# Run migrations (if using alembic)
cd backend
alembic upgrade head
```

### Tests
```bash
cd backend && pytest
cd ../ai && pytest
```

## Demo Checklist (Pre-Judging)

- [ ] `docker compose up --build` works on fresh machine
- [ ] `data/safety_reports.csv` exists (run `python data/seed_reports.py`)
- [ ] Dashboard loads with KPIs, charts
- [ ] Single report analysis returns SIF + LSR + entities
- [ ] Bulk CSV upload + analyze works
- [ ] Report drill-down shows explanation snippets
- [ ] Offline fallback: backup demo video recorded
- [ ] `.env` not committed; `.env.example` present

## Deployment

### Cloud (AWS/GCP/Azure free tier)
```bash
# Build images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Push to registry
docker tag sif-frontend <registry>/sif-frontend:latest
docker push <registry>/sif-frontend:latest
# ... repeat for backend, ai

# Deploy via Cloud Run / ECS / App Service
```

### Environment Variables (Production)
```env
POSTGRES_DB=sif_db
POSTGRES_USER=sif_user
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://...
AI_SERVICE_URL=https://ai-service.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Team Roles

| Role | Responsibility |
|------|----------------|
| Backend (×2) | API, DB, orchestration, integration |
| Frontend (×2) | Dashboard, UI/UX, charts, report views |
| AI/ML (×1) | NLP models, SIF/LSR logic, clustering |
| DevOps (×1) | Docker, CI/CD, deployment, env mgmt |
| Product/Pitch (×1) | Research, deck, demo script, Q&A |

## Key Differentiators for Judges

1. **Explainable AI** — every SIF flag shows *why* (highlighted trigger phrases)
2. **Methodology anchor** — mirrors Sci Reports 2024 PSIF paper (BERT+XGBoost) cited in PS
3. **Complete pipeline** — SIF detection + 9 LSR tagging + precursor clustering in one dashboard
4. **OIL-specific** — synthetic data mimics Assam oil-field terminology (GGS, H2S, LOTO, PTW)
5. **Production-ready** — Docker, health checks, offline fallback, seed script for instant demo

## License

Proprietary — SIH 2026 submission for Oil India Limited.