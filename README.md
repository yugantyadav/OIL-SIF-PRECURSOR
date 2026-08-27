# SIF Precursor Detection — Oil India Limited (SIH 2026, PS 26165)

**Minimal scaffold** — team implements business logic, DevOps wires it together.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│    AI       │
│  (Next.js)  │     │  (FastAPI)  │     │  (FastAPI)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

**Ports:** Frontend 3000 | Backend 8000 | AI 8001 | PostgreSQL 5432

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env

# 2. Run all services
docker compose up --build

# 3. Access
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# AI Service: http://localhost:8001
```

## Team Work

| Folder | Owner | Implement |
|--------|-------|-----------|
| `backend/` | Backend ×2 | REST endpoints, DB models, orchestration |
| `ai/` | AI/ML ×1 | SIF classifier, LSR tagger, pattern mining |
| `frontend/` | Frontend ×2 | Dashboard, report table, upload/analyze UI |
| `database/` | Backend/DevOps | SQL schema, migrations |
| `data/` | AI/ML | Seed scripts, demo datasets |
| `docs/` | All | Architecture decisions, API specs |

## Git Workflow

```bash
# Feature work
git checkout -b feat/your-task
# ... code ...
git push -u origin feat/your-task
# Open PR → develop

# DevOps merges to develop → main for demo
```

## DevOps Responsibilities

- `docker-compose.yml` orchestration
- `.env` management (never commit secrets)
- CI/CD (GitHub Actions)
- Deployment (cloud free tier)
- Health checks, backup/restore scripts

## Key Endpoints (Backend implements)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/analyze` | Single report → AI |
| POST | `/api/reports/upload` | Bulk CSV upload |
| POST | `/api/reports/analyze-batch` | Trigger batch analysis |
| GET | `/api/reports` | List/filter reports |
| GET | `/api/dashboard/stats` | KPIs + chart data |

## AI Service (implements `/analyze`)

Returns:
```json
{
  "sif": { "sif_probability": 0.87, "sif_flag": true, "confidence_level": "high", "explanation_snippets": ["suspended load", "no permit"] },
  "lsr_tags": [{ "rule_name": "Line of Fire", "confidence": 0.92, "matched_keywords": ["suspended load"] }],
  "entities": [{ "entity_type": "activity", "entity_value": "valve replacement", "confidence": 0.88 }]
}
```

## IOGP Life-Saving Rules (9 rules, 2021)

1. Bypassing Safety Controls
2. Confined Space
3. Driving
4. Energy Isolation
5. Hot Work
6. Line of Fire
7. Safe Mechanical Lifting
8. Work Authorisation
9. Working at Height

## License

Proprietary — SIH 2026 submission for Oil India Limited.