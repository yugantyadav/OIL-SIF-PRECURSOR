# Frontend — What Is To Be Added (Per Your Remodel)

> This file lists **only what Frontend must ADD or CHANGE** according to your new plan:
> **Reports stay (simplified) + CCTV Surveillance page + AI does the risk + Landing Page as first page + Immutable Log + Site Risk Index + Phone App link.**
> Everything here is **to be built** — not what already exists.

---

## 1. New Pages To Add

### A. Landing Page — New First Page at `/` (Moves Dashboard to `/dashboard`)

**Why:** Project is now **CCTV Surveillance + Report SIF**, not just dashboard. First page must explain the project for Oil India Company like a product site.

**What to add:**
- File `pages/Landing.jsx` + Route `"/" = <Landing />` in `App.jsx` (change `"/"` from Dashboard to Landing, add `"/dashboard"` = Dashboard).
- **Hero** dark `#1A1E22` + blue wash `linear-gradient(90deg, #2C52DB -> transparent)` + wave 85px bottom white: `SIF PRECURSOR DETECTION` (12px amber #FCAB04), `Industrial Safety Dashboard` (48px/700 Poppins #FCAB04), `600 reports across 15 sites`, pills `SIF RATE: 45.3%` amber + `272 FLAGGED` blue, CTA button `Enter Platform -> /dashboard` (amber #FCAB04 -> dark #222931 hover).
- **5 sections after hero** (GOARC alternating dark/light + wave dividers, 1300px max-width, Poppins):
  1. Why OIL needs this (PS 26165, SIF weak signals, lives/asset risk).
  2. How it works — 3 cards: *Describe or Upload CCTV -> AI Vision -> Risk + Alert* (icons 45px, white cards `1px #FFEEC6` + `0 2px 8px` amber shadow).
  3. For Oil India — drilling rig / pipeline / refinery use cases with images.
  4. Key features grid — 4 cards: Auto 9-field report, Site Risk heatmap, Immutable log, Phone push + speaker.
  5. CTA band `#FBBA00` with button `Watch CCTV Demo -> /cctv`.

**Technical:** `vite.config.js` already has `host 0.0.0.0`, keep. `App.css` add `.landing-hero`, `.wave-divider`, keep Navbar `OIL` 36x36 #FCAB04 + `SAFETY 1.0 PROTOTYPE`.

---

### B. CCTV Surveillance Page — Completely New at `/cctv`

**Why:** For now, give CCTV footage (upload MP4 or pick sample) and let AI give verdict + auto-report + alert. This is the core of your remodel.

**What to add:**
- File `pages/Cctv.jsx` + Route `"/cctv"` + Navbar link `CCTV` (next to Reports).
- **Top:** Camera selector (Cam 1 Tank Farm, Cam 2 Drill Deck...) + `Upload clip` (accept video/*, max 50 MB) + `Pick sample` (2 canned clips: PPE violation, fall) + `Start Analysis` button.
- **Center:** Video player with **canvas bbox overlay** (green = OK helmet/vest, red = missing) + **zone polygon overlay** (red dashed when intrusion) + **fall bbox flip** (Critical red border).
- **Right:** Live verdict panel — severity pill (Warning amber / Serious #FBB102 / Critical red), rule name (e.g., `Hydrocarbon Release`), confidence %, timestamp, zone, camera ID.
- **Bottom:** Recent CCTV incidents table (same style as Reports: `report_id | Category | Description | Risk | Status | View`) + clip player (30s before / 60s after) + snapshot.
- **Wiring:** `POST /api/cctv/events` (upload) or `POST /api/analyze` for frames → get JSON `sif + lsr_tags + entities` → show verdict → auto-create report (see Auto-Report).

---

## 2. Changes to Existing Pages (What to Modify)

### Reports (`/reports`) — Simplify + Add Bulk + History

**Change 1 — Simplify Add Report (AI does risk):**
- **Before:** User picks Category, Risk, Status, Location, Date, Reported By, Description (7 fields, Risk dropdown).
- **To Be Added:** Remove Risk picker. Keep only **3 inputs**: `Description` (textarea 5000-char guard + counter), `Where` (Location/site picker), `Supervised by` (Reported By / Supervisor name). On `Submit`, **call AI** `POST /api/analyze` internally, get draft `{category, risk, status, LSR, sif_probability, actions}`, show **draft card** (GOARC white + amber wash) with risk pill + suggested fields, then user clicks **Submit** (saves) or **Edit description** (re-runs AI, never lets user pick risk). This removes bias and proves AI ownership.

**Change 2 — Keep CSV bulk (already done) + add History link:**
- Keep `Bulk Upload via CSV` (5 MB / 5000-row guard, `FormData → POST /api/reports/upload`, template download, progress + auto-refresh). Headers remain flexible (`report_id/date/category/description/risk/status/location/reportedBy` — only `description` required, backend fills AI draft for each row).
- Add **History timeline** link on each row → `ReportDetails` shows `History` (read-only) from new `report_logs` (see Database).

### ReportDetails (`/reports/:id`) — Add History

**To Be Added:**
- Below Incident Description box, add **History timeline** component (read-only): vertical line with dots, each log: `CREATE by Safety Officer at 30 Aug 2026 14:32` + old vs new JSON diff, `CCTV_CREATE` vs `MANUAL`, never shows delete button. Data from `GET /api/report-logs/{id}` (new). Proves immutable audit.

### Dashboard (`/dashboard` — moved from `/`)

**To Be Added:**
- Keep hero but update numbers live from `GET /api/dashboard/stats` + new `GET /api/sites/risk`.
- Add **Site Risk Index heatmap** component `components/RiskHeatmap.jsx` (new): Visualizes `site_risk_scores` (zone, index 0-100) as overlay on site layout (green <30, amber 30-70, red >70) + ranked table `Top 3 risky zones this month` + trend line (last 30 days). Click zone filters Reports.
- Keep 4 stat cards in one line, side-by-side charts. Add polling 15s already done — keep.

### AI Prediction (`/analyze`) — Already Fixed, Keep

**Already added:** Locked prefill from Details (`readOnly` light `#F4F4F4`, only Analyze clickable), 5000-char guard + counter, live ML (oil leakage → High 82% Hydrocarbon Release), Hydrocarbon Release actions. **To keep.**

---

## 3. New Components To Add

| Component | File | What It Does |
|-----------|------|--------------|
| **Landing** | `pages/Landing.jsx` | Hero + 5 sections + wave 85px + CTA → /dashboard |
| **Cctv** | `pages/Cctv.jsx` | Camera select + upload + canvas bbox + zone editor + verdict |
| **RiskHeatmap** | `components/RiskHeatmap.jsx` | Site layout + heatmap + ranked table + trend (from `/api/sites/risk`) |
| **ReportHistory** | `components/ReportHistory.jsx` | Vertical timeline from `report_logs`, read-only |
| **AutoReportPreview** | `components/AutoReportPreview.jsx` | 9-field preview (What/Where/When/Why/How/Severity/People/Corrective/Preventive/Evidence) for CCTV auto-report |
| **CctvPlayer** | `components/CctvPlayer.jsx` | Video + bbox overlay + zone polygon |

---

## 4. Styling To Keep/Add (GOARC)

- Keep `index.css` Poppins import + `#F4F4F4` bg.
- Keep `App.css` GOARC tokens (`--brand #FCAB04`, `--accentBlue #2C52DB`, `--surfaceDark #1A1E22`, radii 6/10/16px, 44px inputs, wave divider).
- Add `.landing-hero` (dark + blue wash), `.wave-divider` (85px SVG mask), `.cctv-grid`, `.heatmap` (green-amber-red), `.history-timeline` (vertical line + dots).

---

## 5. API Wiring To Add

```js
// New for remodel (add to src/api.js)
POST   /api/cctv/events          // {video: File, camera_id, zone} -> {sif, lsr_tags, 9-field report draft}
GET    /api/cctv/feeds           // list cameras/zones
GET    /api/sites/risk           // {zone, index, frequency, severity_sum, recency} -> heatmap
GET    /api/report-logs/{id}     // immutable history for ReportHistory
POST   /api/incidents/notify     // push to officers (FCM)
POST   /api/incidents/{id}/acknowledge // ACK from app/dashboard
```

Keep existing: `fetchReports`, `createReport`, `fetchDashboardStats`, `analyzeNarrative` (now AI-derived).

---

## 6. Checklist — Frontend To-Do Per Your Words

- [ ] **Landing as first page** — Build `Landing.jsx` (info about project + how it works for Oil India), move Dashboard to `/dashboard`, add wave + GOARC.
- [ ] **Reports simplified** — 3 fields only, AI drafts risk/category/status, Submit/Edit, add History timeline.
- [ ] **CCTV page** — Upload/pick clip, AI boxes, zone editor, verdict pill, auto 9-field report.
- [ ] **Auto-report** — CCTV detection → 9 fields (What/Where/When/Why/How/Severity/People/Corrective/Preventive/Evidence + 30s/60s clip) → officer Approve.
- [ ] **Site Risk Index** — Heatmap + Top 3 table from historical data (frequency × severity × recency).
- [ ] **Immutable log** — History timeline read-only, no delete.
- [ ] **Phone alert link** — Push shows on app, but frontend shows toast + speaker mock + ACK.
- [ ] Keep: 4-col stats, side-by-side charts, OIL badge 36×36, 5000-char guard, 5 MB/5000-row CSV guard, locked prefill.

---

## 7. What NOT to Change (Keep As Is)

- Navbar white 80px sticky + OIL badge + SAFETY 1.0 PROTOTYPE (already GOARC).
- Dashboard stat-grid 4-col + charts flex (already side-by-side).
- Reports search + category/risk filters + table style.
- AI live ML (not mock), dark textbox fix (#F4F4F4 when locked), Hydrocarbon Release.

