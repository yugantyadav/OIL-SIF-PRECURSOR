# SIH MASTER BLUEPRINT — PS 26165: AI/NLP Engine for SIF Precursor Detection (Oil India Limited)

> **Status:** CUSTOMIZED for PS 26165 · Theme: Smart Automation · Org: Oil India Limited (MoPNG)
> Build an NLP system that ingests OIL's free-text UA/UC + near-miss reports and:
> **(a)** classifies SIF-potential vs non-SIF · **(b)** auto-tags IOGP Life-Saving Rules · **(c)** mines recurring precursor patterns into a ranked dashboard.

---

## 0. Master Flow

```
IDEA → RESEARCH → REQUIREMENTS → MVP → SYSTEM DESIGN → PROTOTYPE → DEMO →
FEEDBACK → FULL DEVELOPMENT → TESTING → DEPLOYMENT → FINAL PRESENTATION →
JUDGING → WINNING STRATEGY
```

**Timeline mapping:**

| Window | Stages |
|---|---|
| **Wed (today)** | IDEA → RESEARCH → REQUIREMENTS → MVP → SYSTEM DESIGN + PROTOTYPE start (compressed) |
| Wed–Fri | PROTOTYPE build |
| Sat | DEMO prep + FEEDBACK + code freeze |
| **Sun Aug 30** | Prototype presentation |
| After Sunday → regionals | FULL DEV → TESTING → DEPLOYMENT |
| Before finale | FINAL PRESENTATION → JUDGING prep → WINNING STRATEGY |

---

## 1. Fixed Foundations

### 1.1 Team Roles `[PS-CUSTOMIZE: fill names]`

| Role | People | Owns |
|---|---|---|
| Core Eng ×2 | R1: ____ , R2: ____ | Engine/logic, backend APIs, DB |
| Frontend Eng ×2 | R3: ____ , R4: ____ | Dashboard, UX, integration |
| DevOps/QA | R5: ____ | Docker, CI, seed data, testing, stability |
| Product/Pitch | R6: ____ | Research, deck, demo script, Q&A bank |

### 1.2 Default Stack (swap only if PS forces it) `[PS-CUSTOMIZE if needed]`

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + Tailwind + shadcn/ui | Fast, professional-looking defaults |
| Backend | FastAPI (Python) | Same language as any ML work |
| DB | PostgreSQL (+ Redis if queues needed) | Boring, reliable |
| ML/NLP | HF transformers (DistilBERT / bart-large-mnli zero-shot), sentence-transformers, GLiNER/spaCy NER, XGBoost — inside FastAPI service | Mirrors published PSIF methodology (Sci Reports 2024: BERT+XGBoost) |
| Infra | Docker Compose + GitHub Actions | One-command run, auto CI badge |
| Docs/Diagrams | Notion + Excalidraw/draw.io | Deck-ready diagrams |

---

## 2. Stage-by-Stage Breakdown

Priority legend: 🔴 Critical · 🟡 Important · ⚪ Optional
Gate = must exist before moving to next stage.

### PHASE A — Starting

#### S1. Understand the Problem Statement
- **Do:** Read PS 3×; extract exact ministry/department wording; identify users, inputs, outputs; rewrite PS in your own words (5 sentences max).
- **Produce:** `docs/problem.md` (one-pager: problem, users, constraints, expected outcome).
- **Owner:** R6, reviewed by all.
- **AI tools:** Prompt GPT/Claude: *"Explain this PS like I'm new, list hidden requirements and evaluation hints."*
- **Gate:** Every member can state problem + user in 30 seconds.
- **Postpone:** nothing.
- **P:** 🔴

**[PS-CUSTOMIZE S1] — FILLED**
- **Organization:** Oil India Limited (PS 26165 · Category: Software · Theme: Smart Automation · Ministry: Petroleum & Natural Gas)
- **Users:** OIL HSSE (Health-Safety-Security-Environment) managers, field safety officers at drilling/production sites, plant in-charges, HSE leadership who plan interventions
- **Inputs:** Free-text reports from OIL's HSSE platform — UA (Unsafe Act), UC (Unsafe Condition), near-miss, incident reports. Fields: report_id, date, site/location, activity/department, report_type, free-text narrative
- **Outputs:** per-report SIF-potential flag + confidence score; IOGP LSR tags (9 rules); extracted entities (activity/location/equipment); dashboard ranking sites/activities by SIF-precursor density
- **Hidden requirements:** explainability (WHY a report was flagged); expected ~20–25% SIF-potential rate (calibrate demo data accordingly); must handle noisy informal field English + oil-field abbreviations (LOTO, PTW, PPE, H2S, GGS); batch triage (not real-time) matches current monthly/quarterly manual process; judges will include HSE domain experts → terminology accuracy is scored

#### S2. Research + Competitor Analysis
- **Do:** Find 3–5 existing solutions (startups, govt portals, GitHub projects); find public datasets/APIs; note gaps.
- **Produce:** Comparison table (solution / what it does / gap we fill) + dataset list.
- **Owner:** R6 + R1.
- **Tools:** Web search, Google Scholar, GitHub, Kaggle, data.gov.in.
- **Gate:** One-sentence USP written: *"We are the only ___ that ___."*
- **Postpone:** deep literature review.
- **P:** 🔴 (USP), 🟡 (datasets)

**[PS-CUSTOMIZE S2] — FILLED**
- **Competitors:** VelocityEHS PSIF classifier (commercial, cited IN the PS — mirror its published BERT+XGBoost method, Sci Reports 2024); DEKRA SIF model (consulting methodology, not software); Enablon/Intelex/EcoOnline (generic EHS suites, no SIF focus); OIL's current state = fully manual periodic triage. Note: other SIH teams are building this PS too — GitHub repos already exist → execution quality decides.
- **Datasets:** NIOSH FACE fatality investigation narratives (public, real SIF-positive text — same trick EPRI used); OSHA accident investigation summaries; LLM-generated synthetic UA/UC/near-miss reports calibrated to OIL ops (~25% SIF-potential)
- **Our USP:** *"We are the only solution combining three things OIL asked for in one explainable pipeline — SIF-potential detection, automatic IOGP LSR tagging across all 9 rules, and recurring precursor-pattern mining with drill-down to the exact reports — built for Indian oil-field operations."*

#### S3. Requirements Analysis
- **Do:** List ~10 functional + 5 non-functional requirements; define 2 personas.
- **Produce:** `docs/requirements.md` with MoSCoW tags.
- **Owner:** R6.
- **Gate:** MVP scope agreed by unanimous vote.
- **Postpone:** non-functional detail beyond security/performance one-liners.
- **P:** 🟡

**[PS-CUSTOMIZE S3] — FILLED**
- **Personas:** 1) **HSE Manager** — opens dashboard weekly, sees SIF density by site/activity, plans interventions; 2) **Field Safety Officer** — submits reports, checks if own submission got flagged and why
- **Functional reqs:** 1) CSV/XLSX bulk upload of reports 2) single-report paste+analyze 3) SIF classification with confidence score 4) IOGP LSR multi-tagging (9 rules) 5) entity extraction (activity/location/equipment/barrier) 6) recurring-pattern clustering 7) site & activity SIF-density ranking 8) drill-down table color-coded by SIF flag 9) explanation view (highlighted trigger phrases) 10) human feedback button (correct/wrong flag → retraining data)
- **Non-functional:** batch of 200 reports processed <60s · explainable outputs (no black-box flags) · role-based access (post-Sunday) · PII minimization in stored reports · audit trail

#### S4. Define MVP
- **Do:** Cut to exactly **3 features**: 1 input path, 1 core intelligence step, 1 result visualization. Write success criteria ("demo succeeds if X shows Y in <10s").
- **Produce:** MVP spec + explicit "NOT building before Sunday" list.
- **Owner:** All, decided by lead.
- **Gate:** Written and pinned in repo.
- **Postpone:** everything else (becomes post-Sunday backlog).
- **P:** 🔴

**[PS-CUSTOMIZE S4] — FILLED**
- **Feature 1 (input):** Upload CSV (~200 synthetic OIL-style reports) + paste-a-single-report box
- **Feature 2 (core intelligence):** Per report → SIF-potential probability + flag, auto-tag to IOGP LSRs, extract activity/location entities (ensemble: safety lexicon rules + zero-shot NLI transformer)
- **Feature 3 (result visualization):** Dashboard — KPI cards (total / SIF count / SIF %), sites ranked by SIF-precursor density, LSR distribution chart, drill-down report table
- **Success criteria:** 200-report CSV fully analyzed <60s; every report shows SIF flag + ≥1 LSR tag + highlighted reason phrases; dashboard rankings render correctly offline
- **NOT building before Sunday:** login/auth, admin panel, email/SMS alerts, PDF export, live streaming ingest, mobile app, Hindi/Assamese UI, retraining pipeline (all post-Sunday backlog)

### PHASE B — Planning

#### S5. Architecture + Tech Design
- **Do:** Draw layered diagram (UI → API → Engine → Data + Ops); freeze API contract (OpenAPI stubs); design DB schema; define the **swappable Engine interface** (so PS changes never break outer layers).
- **Produce:** `docs/architecture.md`, `openapi.yaml`, schema SQL/diagram.
- **Owner:** R1 leads, R5 reviews.
- **Tools:** Excalidraw; Claude Code scaffolds repo from diagram.
- **Gate:** Repo skeleton exists; `docker compose up` runs empty shell; CI green.
- **Postpone:** microservices, k8s, caching details.
- **P:** 🔴

```
┌─────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                     │
│   Next.js Dashboard • Input UI • Reports • Demo mode    │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────▼────────────────────────────────┐
│                     API LAYER                           │
│   FastAPI • JWT auth • Task queue                       │
└──────────────┬───────────────────────┬──────────────────┘
               │                       │
┌──────────────▼──────────┐ ┌─────────▼──────────────────┐
│      CORE ENGINE        │ │       DATA LAYER           │
│  ← SWAPPABLE PER PS →   │ │ PostgreSQL • Redis         │
│ [Ingest]→[Preprocess]→  │ │ SEED SCRIPT ★              │
│ [Model/Logic]→[Output]  │ │                            │
└─────────────────────────┘ └────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│           OPS / DEMO RELIABILITY LAYER                  │
│  Docker Compose • Logging • Health checks • Offline     │
│  fallback demo                                          │
└─────────────────────────────────────────────────────────┘
```

**[PS-CUSTOMIZE S5] — FILLED: CORE ENGINE PIPELINE**
- **Ingest:** `POST /api/reports/upload` (CSV/XLSX) + `POST /api/analyze` (single text). Columns: report_id, date, site, activity, report_type (UA/UC/NearMiss/Incident), narrative
- **Preprocess:** lowercase/clean → expand abbreviations (LOTO→lockout-tagout, PTW→permit-to-work, GGS→group gathering station) → dedup → PII strip
- **Model/Logic — three sub-modules:**
  - **A. SIF Classifier:** Stage-1 curated lexicon + energy-severity heuristics (suspended load, H2S, high-pressure, fall height, confined entry...) → Stage-2 zero-shot NLI (`facebook/bart-large-mnli`) or DistilBERT fine-tuned on labeled set → ensemble = SIF probability
  - **B. LSR Tagger:** hybrid — per-rule keyword lexicon + zero-shot NLI against the 9 official IOGP rule descriptions → multi-label output
  - **C. Pattern Mining:** GLiNER/spaCy extracts {activity, location, equipment}; sentence-transformers embeddings + KMeans/HDBSCAN → recurring precursor clusters; barrier-failure lexicon tags (permit absent, guard removed, isolation missing, gas test skipped)
- **Output JSON:** `{sif_probability, sif_flag, lsr_tags[], entities{}, cluster_id, explanation_snippets[]}`
- **DB schema entities:** reports · classifications · lsr_tags · entities · clusters · batches(uploads) · users(post-Sunday)

**[PS-CUSTOMIZE S9] — accuracy targets & compliance**
- Eval: hold out 100 manually-labeled samples (synthetic + FACE-derived); prototype targets: SIF precision ≥0.85 / recall ≥0.80; publish confusion matrix in deck
- Methodology anchor for judges: Sci Reports 2024 PSIF paper (BERT+XGBoost) + DEKRA 20–25% SIF-rate calibration
- Compliance: DPDP Act 2023 basics (data minimization, purpose limitation, retention policy); deployment option: on-prem/OIL-VPC since safety data is sensitive

#### S6. Workflow Setup
- **Do:** Git flow = `main` (protected) ← PRs from feature branches; assign reviewers; daily 15-min standup; shared board (GitHub Projects).
- **Produce:** Board with Sunday-backwards tasks.
- **Owner:** R5.
- **Gate:** First PR merged by each developer.
- **Postpone:** fancy CI (tests-only workflow is enough now).
- **P:** 🟡

### PHASE C — Prototype (before Sunday)

#### S7. Build Order (strict sequence)

| # | Item | Must work? | Mockable? |
|---|---|---|---|
| 1 | Seed/demo dataset generator | Yes — demo dies without data | No |
| 2 | Core engine on 5 sample inputs | Yes — this IS your project | No |
| 3 | API endpoints (contract-compliant) | Yes | Logic yes, shape no |
| 4 | Upload/input screen → result screen | Yes | — |
| 5 | Login/auth | No | Fake session, hardcoded user |
| 6 | Admin/analytics pages | No | Static mock components |
| 7 | PDF export, emails, payments | No | Skip entirely |

- **Produce:** E2E happy path: *upload → process → correct-looking result*.
- **Owners:** R1/R2 engine+API; R3/R4 UI; R5 seed+stability.
- **UI priorities:** clean layout, big readable result, loading spinner, empty/error states, consistent theme. Judges forgive missing pages, not ugly/broken ones.
- **Gate:** Full demo runs on airplane-mode laptop using seed data.
- **P:** items 1–4 🔴, 5–6 🟡, 7 ⚪

#### S8. Demo + Presentation Prep
- **Do:** 10-slide deck (problem+stats → gap → solution demo → architecture → tech → impact/metrics → roadmap → team); 3-minute demo script word-for-word; record backup screen video; 3 timed rehearsals.
- **Produce:** Deck PDF, script, backup video on 2 devices.
- **Owner:** R6 owns, everyone rehearses.
- **Gate:** Rehearsal completes under time limit twice in a row.
- **P:** 🔴

**What judges actually score:**
1. Working proof (live > video > screenshots)
2. Depth of problem understanding (stats, stakeholders)
3. Feasibility / architecture sanity
4. Honest novelty
5. Impact numbers
6. Confident team coordination

**Avoid:** reading slides · live-internet dependency · overclaiming ("100% accurate", "unhackable") · 10 half-built features · ignoring the ministry named in the PS.

### PHASE D — Full Development (post-prototype)

#### S9. Productionize

| Area | Work | P |
|---|---|---|
| Frontend | Real auth (JWT), RBAC, all pages, i18n if govt-facing | 🔴 |
| Backend | Replace mocks, validation, pagination, rate limits | 🔴 |
| Database | Migrations, indexes, backup story | 🟡 |
| Engine/ML | Accuracy eval set, metrics table (precision/recall), model versioning | 🔴 if ML |
| Security | Input sanitization, encryption at rest/in transit, audit logs, secrets vault | 🟡 |
| Testing | Unit (engine) + integration (API) + one E2E test; target 70% on core | 🟡 |
| Performance | Load test happy path; cache hot queries | ⚪ until finale |
| Deployment | Cloud VM free tier (AWS/GCP/Azure student credits), HTTPS domain | 🔴 pre-finale |
| Monitoring | Health endpoint, structured logs, uptime ping, Sentry | 🟡 |

- **Gate for regionals:** deployed URL + metrics table + test suite passing.
- **Postponable:** k8s, multi-region, mobile apps.

**[PS-CUSTOMIZE S9]** — FILLED, see block under S5 (accuracy targets, eval datasets, DPDP compliance).

### PHASE E — Presentation & Evaluation (pre-finale)

#### S10. Final Presentation System
- **Do:** Rebuild deck around deployed product; live demo primary, video fallback; architecture walkthrough rehearsed; innovation framed as USP + quantified improvement; impact = beneficiaries × scale math tied to ministry goals.
- **Produce:** Final deck, demo environment (seeded), Q&A bank (30 answers).
- **Q&A categories:** why this stack / scaling to national load / privacy & DPDP compliance / annual cost / what if real govt data differs / accuracy validation method / individual team contributions.
- **Traps:** vague scalability claims, no cost answer, undefendable exclusivity claims.
- **P:** 🔴

### PHASE F — Winning Strategy (finale)

#### S11. Differentiation
- Live deployed product (most teams demo localhost)
- Published accuracy/performance metrics
- Clean public GitHub with README + architecture docs
- Stakeholder vocabulary matching the PS's department

**Advanced backlog (showcase selectively):**
Mobile/PWA · multilingual UI · analytics module · public API/SDK · govt integration adapters (DigiLocker/ULIP-style — adapt to PS) · compliance pack

**Final demo strategy:** story-driven (user persona journey) → live solve → metrics slide → deployment reality → honest limitations + 6-month roadmap.

**Final checklist before judging:**
- [ ] Deployed URL live
- [ ] Seeded demo accounts ready
- [ ] Backup video on 2 devices
- [ ] Hotspot tested
- [ ] Deck offline copy
- [ ] Printed architecture diagram
- [ ] Q&A bank rehearsed
- [ ] Team intro roles crisp
- [ ] Chargers + adapters packed

---

## 3. Where AI Coding Tools Plug In

| Stage | Tool | Use it for |
|---|---|---|
| S2 Research | ChatGPT/Claude web | Summarize PS, competitor landscape, dataset hunting |
| S5 Scaffold | **Claude Code** | Repo structure, docker-compose, CI, OpenAPI stubs, schema |
| S7 Build | **Claude Code** | Engine functions, API endpoints, React pages, seed-data generator, unit tests |
| S7 UI | v0.dev / Lovable | Screen layouts → paste into Next.js, restyle with shadcn |
| S8 Deck | GPT/Claude + Gamma | Slide copy, demo script, judge Q&A generation |
| S9 Testing | Claude Code | Test suites, edge-case lists, load-test scripts |

**Guardrails (Critical):**
1. AI writes code, **humans review every PR** — unreviewed AI code is the #1 Saturday-night disaster.
2. Never let AI refactor working demo code after **Friday 6 PM**.
3. Keep all AI prompts + outputs in repo `docs/ai-log/` — also great evidence of engineering rigor for judges.
4. Humans own architecture decisions; AI owns boilerplate.

---

## 4. Day-by-Day Plan: Today → Sunday

**WED Aug 26 (today) — Foundation + Riskiest Spike**
- Morning (all): Repo skeleton via Claude Code (`frontend/ api/ engine/ infra/ docs/`); `docker compose up` works; CI green; roles confirmed on board.
- Midday (R1/R2): **Seed dataset v1** — LLM-generate 300+ OIL-style reports (drilling, pipeline, workover scenarios; ~25% SIF-potential) + download NIOSH FACE narratives as real SIF-positive anchors. (R6): finalize `docs/problem.md`, manually label 50 reports = eval set.
- Afternoon (R1/R2): **Engine spike** — SIF lexicon+heuristic classifier AND zero-shot LSR tagger both working via CLI on 10 samples.
- Evening (R3/R4): Next.js shell (layout, upload page stub, dashboard route). API contract frozen in `openapi.yaml`.
- ✅ Exit: engine correctly classifies/tags CLI samples; skeleton runs; everyone merged ≥1 commit.
- **Status:** ☐ Done

**THU Aug 27 — End-to-End Wire-Up**
- Morning: Real FastAPI endpoints behind frozen contract: `POST /reports/upload`, `POST /analyze`, `GET /results`. Engine integrated: SIF probability + LSR tags + entities per report.
- Afternoon: Upload screen → analyze → results in Postgres → drill-down table renders color-coded rows. Seed script loads 500 reports.
- Evening: Dashboard v1: KPI cards (total / SIF count / SIF %), site-ranking bar chart, LSR distribution chart. Loading/error/empty states.
- ✅ Exit: **full happy path works without any team member touching terminal.**
- **Status:** ☐ Done

**FRI Aug 28 — Make It Look Real**
- Morning: Pattern-mining view (recurring precursor clusters with example snippets); activity-density ranking; deploy runs on one team laptop via Docker.
- Afternoon: Fake login + admin stub; **report-detail drawer showing WHY flagged (highlighted trigger phrases = explainability)**; realistic OIL-flavored story dataset (sites: Drill Site #7, GGS-II, Duliajan–Madhuban pipeline ROW...); UI consistency pass.
- Evening: Screenshots for deck; bug list triaged (showstoppers vs cosmetics).
- ✅ Exit: stranger could click through demo unaided.
- **Status:** ☐ Done

**SAT Aug 29 — Freeze & Rehearse**
- Morning: **CODE FREEZE 10 AM.** Bug-fixes only. Record backup demo video. Finish deck with real numbers: precision/recall on eval set, SIF % detected, time-saved math (manual triage hours vs seconds).
- Afternoon: 3 timed dress rehearsals (most confident speaker presents, not best engineer). Prepare offline mode.
- Night: Charge laptops, copy video/deck to 2 devices, hotspot check, sleep.
- ✅ Exit: two consecutive on-time rehearsals, zero showstopper bugs.
- **Status:** ☐ Done

**SUN — Execute**
- Pre-demo: seed data loaded → demo accounts ready → close stray tabs/notifications → backup video queued → water + calm.
- Demo order: problem (45s) → live solve (90s) → architecture (40s) → impact (30s).
- **Status:** ☐ Done

---

## 5. Customization Log

| Date | Change | Reason |
|---|---|---|
| Aug 25 | Created general blueprint | Awaiting final PS |
| Aug 26 | **PS 26165 locked (OIL SIF Precursor Detection)** — all [PS-CUSTOMIZE] sections filled; day plan compressed to Wed-start; verified IOGP 9 LSRs + Sci-Reports-2024 PSIF methodology anchor | Problem statement received; other teams already active on this PS → demo quality is the differentiator |
| | | |
