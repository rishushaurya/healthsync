# HealthSync — Version Changelog (CHANGELOG)

All notable architectural additions, system refactors, feature milestones, and multi-session handoffs for the **HealthSync** platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Session Log Template (For Future Sessions)

`CHANGELOG.md` (case-insensitive `changelog.md`) is the **shared source of truth** across development sessions. Multiple sessions and contributors work in this repository.

- **Before starting a feature:** Read this file to inspect current state, active workflows, and avoid duplicate implementations.
- **After completing a feature or significant fix:** Append or update the corresponding session log entry immediately.
- **Never delete previous entries or rewrite history.** Maintain chronological fidelity.

```markdown
## [YYYY-MM-DD HH:MM] — [Agent / Contributor] — Session [N] ([Topic/Title])
**Feature/Issue:** Objective and clinical/architectural rationale
**Status:** Completed | In Progress | Blocked
**Chunks / Modules Modified:** [List of modules/subsystems]

**Frontend changes:** [Screens, journey steps, UI/UX modifications]
**Backend/API/Store changes:** [Routes, schemas, state machines, storage keys]
**Dependencies / Tooling:** [New packages, scripts, or build configs]

**Files affected:**
- Created: [...]
- Modified: [...]
- Deleted: [...]

**Testing & Verification:** [Automated tests, dev server checks, browser flows]
**Known Issues / Pending Work:** [Unresolved items, edge cases, next steps]
**Decisions & Context:** [Key architectural decisions, constraints, warnings]
**NEXT AI SHOULD:** [Explicit actionable next steps]
```

## [2026-10-26 19:30] — Claude Code — Session 07 (Merge rishushaurya/healthsync, clinical redesign, real care pipeline, anatomy Digital Twin)

**Feature/Issue:** Merge the two diverged HealthSync codebases into one, replace the AI-styled UI with a clinical design, and make the patient–doctor workflow (user's hand-drawn architecture) work for real instead of simulated steps.
**Status:** Completed on branch `merge/unified-healthsync` (not pushed)
**Chunks / Modules Modified:** Store & sync, journey pages, doctor portal, AI routes, design system, Digital Twin

**Workflow implemented (source of truth):** sign in → reason → history (Allopathic/AYUSH, questions adapt to sex/age) → MediKiosk *or* Digital Twin → AI explanation + recommended specialist → book (online or clinic) → optional reports (real AI reading, shared with the doctor) → consultation with recording consent from both sides → AI-drafted care plan (medicine clock times, diet, exercise) → doctor edits and signs → patient sees plan, prescription, medicines in cart → daily check-ins → recovery rate visible to patient and doctor.

**Frontend changes:**
- New design system in `globals.css` (teal clinical palette, Figtree + Noto Sans incl. Indic scripts via `next/font`, no gradients/glass); all legacy class names kept.
- New landing page, auth (gender/age, visible labels, `?role=doctor`), sidebars (Digital Twin in nav), journey stepper.
- Rewritten: intake, MediKiosk result + booking, booking, reports, consultation, care-plan (replaces simulated ai-analysis/draft-plan/doctor-approval/timeline), patient home with daily check-in + AI insights, doctor dashboard, doctor case review/approval.
- Digital Twin: original component restored verbatim + female/male reference anatomy (`components/three/AnatomyTwin.tsx`), symptoms saved and synced, "Find the right doctor".

**Backend/API/Store changes:**
- `store.ts` mirrors every `hs_`/`healthsync_` key to `/api/store`; `SyncGate` hydrates on load → doctor and patient devices share data.
- `/api/store`: key allowlist, `?all=1`, in-memory fallback when `UPSTASH_*` unset.
- `lib/care-plan.ts`: `createCarePlanDraft` / `approveCarePlan`. `hooks/useLiveTranscript.ts`: consented transcription per side.
- `/api/ai/prescription`: transcript-based drafting, retired Groq model replaced, rule against invented findings. `/api/ai/summarize-intake`: explanation + recommended specialty. `/api/ai/analyze-report`: `isValidReport`.
- AYUSH doctor accounts doc19–doc25 added.

**Dependencies / Tooling:** `@upstash/redis` (optional). Anatomy streamed from jsDelivr (Human-Atlas @5bb5713, MIT; BodyParts3D © DBCLS and HuBMAP female reference, CC BY 4.0). `node scripts/check-regions.mts` verifies click→region mapping on both bodies.

**Testing & Verification:** `tsc --noEmit` clean; region check passes; browser run of full flow (booking → consent → draft → approval → plan, cart ₹8 Paracetamol, check-in → 85% on doctor dashboard); all patient, doctor and portal pages render without console errors.
**Known Issues / Pending Work:** WebRTC audio/video and live transcription need two real devices with microphones (not testable in the preview browser). Anatomy is ~30 MB per body on first load. In-memory store resets on server restart (set Upstash for deploys).
**NEXT AI SHOULD:** Test a real call between two devices; vendor the anatomy files into `/public/models` if offline demos are needed; consider auth on `/api/store` before production.

---

## [2026-10-18 23:25] — Antigravity AI Engine — Session 06 (GitHub Remote Sync, Clean Secret Purge & Policy Report Integration)

**Feature/Issue:** Finalize and stage complete codebase transition, purge placeholder credentials, ignore browser artifacts, generate production commit `b84a10d`, and push upstream to GitHub repository (`origin/main`).  
**Status:** Completed  
**Chunks / Modules Modified:** Git Configuration (`.gitignore`), AI Routing & Security (`src/app/api/ai/*`), Statutory Health Policy & Architecture Documents (`scripts/`, `*.pdf`), Commit & Upstream Deployment.

### Summary of Changes

1. **Security & Credential Hardening:**
   - Audited all API route handlers (`src/app/api/ai/*`) for hardcoded keys, tokens, or fallback secrets.
   - Removed unused/dummy key assignments in `src/app/api/ai/analyze-report/route.ts` and sanitized `src/app/api/ai/vision/route.ts` to rely strictly on `process.env.SAMBANOVA_API_KEY` and rotated `GROQ_KEYS`.
   - Prevented accidental credential leaks and false positive alerts from GitHub secret scanner.

2. **Repository Hygiene & `.gitignore` Updates:**
   - Added `.puppeteer_temp_*` to `.gitignore` to prevent transient Puppeteer profile instances from polluting source control.
   - Verified that `.env.local`, `.next/`, build artifacts, and sensitive developer configs remain safely untracked.

3. **Statutory Healthcare & Government Policy Assets (`scripts/*` & PDFs):**
   - Tracked policy generation and state-by-state healthcare analytics scripts in `scripts/pages/` (covering macro-financing, state archetypes, functional spending, systemic gaps, value propositions, and statutory sources).
   - Committed finalized deliverables: `HealthSync_India_Government_Healthcare_Report.pdf` (2.8MB comprehensive policy blueprint) and `HealthSync_Complete_Architecture_and_Roadmap.pdf`.

4. **Type Safety & Build Verification:**
   - Executed `npx tsc --noEmit` across all modules: verified 0 TypeScript compilation errors.
   - Validated Next.js 16 App Router routing integrity with migrated `/journey/*` subpaths and doctor case review pages.

5. **Git Commit & Upstream Push:**
   - Staged 68 files with 10,445 insertions and 2,228 deletions.
   - Created commit `b84a10d`: `feat: restructure unified patient journey, ABHA integration, clinical case portal, and documentation`.
   - Successfully pushed local `main` branch to remote `origin/main` (`https://github.com/rajaditya011/Health-sync.git`).

### Files Affected

- **Modified:**
  - `.gitignore` — Added `.puppeteer_temp_*` ignore rule.
  - `src/app/api/ai/analyze-report/route.ts` — Purged unused API key fallback.
  - `src/app/api/ai/vision/route.ts` — Sanitized API key fallback condition.
- **Committed & Pushed:**
  - Full unified journey suite (`src/app/(app)/journey/*`).
  - Doctor case approval dynamic route (`src/app/doctor-dashboard/case/[id]/page.tsx`).
  - ABHA portal entry (`src/app/abha/page.tsx`).
  - Government healthcare report scripts & generated PDFs (`scripts/`, `*.pdf`).

### Verification & Status

- `git status` reports working tree completely clean.
- Remote repository is in sync with `origin/main`.

---

## [2026-09-15 11:15] — Antigravity AI Engine — Session 05 (Journey Architecture & SIH Defense Catch-Up)

**Feature/Issue:** Comprehensive audit and documentation of uncommitted architectural transition from disparate standalone views into the unified 11-stage Patient-Doctor Journey state machine, store consolidation, and SIH Round 2 defense artifacts.  
**Status:** Completed  
**Chunks / Modules Modified:** State Management (`store.ts`), Routing & Pages (`/journey/*`, `auth`, `doctor-dashboard/case`), Layouts, Public Portal Links, Documentation & PDF Generators.

### Summary of Changes

1. **Unified Clinical Journey Engine (`src/app/(app)/journey/*`):**
   - Consolidated previously scattered patient pages into a structured, step-by-step clinical workflow orchestrated by `src/app/(app)/journey/layout.tsx` with sticky visual progress tracking.
   - **Steps Implemented:**
     - `intake` (`/journey/intake`): Clinical history intake, multi-lingual voice/text symptom intake, and red-flag triaging.
     - `medikiosk` (`/journey/medikiosk`): Hospital hardware kiosk interface for autonomous check-in and vitals entry.
     - `digital-twin` (`/journey/digital-twin`): 3D interactive anatomical twin (Three.js / `@react-three/fiber`) highlighting organ stress, symptom heatmaps, and systemic wellness.
     - `reports` (`/journey/reports`): Multi-modal report scanner and OCR with auto-extraction of clinical metrics (CBC, lipid profile, metabolic markers).
     - `timeline` (`/journey/timeline`): Longitudinal health history synthesis and physician-facing clinical briefs.
     - `booking` (`/journey/booking`): Smart specialty doctor discovery, real-time availability, and slot reservation.
     - `consultation` (`/journey/consultation`): Live telehealth / in-person consultation interface with real-time speech-to-text recording and clinical ambient listening.
     - `ai-analysis` (`/journey/ai-analysis`): Automated extraction of clinical findings, differential diagnosis support, and drug interaction checks.
     - `draft-plan` (`/journey/draft-plan`): AI-formulated provisional treatment plan with structured medication regimens and dietary/lifestyle guidelines.
     - `doctor-approval` (`/journey/doctor-approval`): Patient transparency view of clinical sign-off status.
     - `patient-portal` (`/journey/patient-portal`): Unified recovery home dashboard with adherence tracking and follow-up management.

2. **Doctor Portal Case Approval Workbench (`src/app/doctor-dashboard/case/[id]`):**
   - Built dedicated physician review portal for reviewing journey-generated draft care plans.
   - Enabled interactive modification of medication dosages, frequencies, duration, and lifestyle notes before clinical sign-off and digital prescription generation.

3. **Authentication & Fast Onboarding (`src/app/auth/page.tsx`):**
   - Redesigned authentication with a friction-free patient flow: Phone OTP verification -> rapid profile setup -> visit reason selection -> immediate journey initialization.
   - Preserved dual-role physician authentication with secure credential validation.

4. **Single Source of Truth Store (`src/lib/store.ts`):**
   - Defined `JourneyStep` enum: `PORTAL`, `INTAKE`, `MEDIKIOSK`, `DIGITAL_TWIN`, `REPORTS`, `TIMELINE`, `BOOKING`, `CONSULTATION`, `AI_ANALYSIS`, `DRAFT_PLAN`, `DOCTOR_APPROVAL`, `COMPLETED`, `EMERGENCY`.
   - Added core data contracts: `PatientJourney`, `ConsultationSession`, `AIAnalysisRecord`, `CarePlanDraft`, `CarePlanApproved`, and `AuditLogEntry`.
   - Implemented state helpers: `getActiveJourney(userId)`, `saveJourney(journey)`, `getJourneyById(userId, journeyId)`, and `addAuditLog(...)`.

5. **Landing Page & Navigation Updates:**
   - Landing page (`src/app/page.tsx`): Added direct launcher buttons for ecosystem portals: **Admin**, **Hospital**, **Blood Bank**, **ABHA Gov**, and **ABHA Patient**.
   - Sidebar (`src/components/layout/Sidebar.tsx`): Streamlined navigation targeting the active journey and patient portal.

6. **SIH Round 2 Documentation Deliverables:**
   - Authored `SIH_Round2_100_Questions.html` and compiled `SIH_Round2_100_Questions.pdf` addressing 100 deep-dive jury and technical evaluation questions spanning architecture, ABHA/NDHM compliance, security, scalability, and AI safety.

### Files Affected

- **Created / Untracked:**
  - `CHANGELOG.md` — Project version log and multi-session handoff ledger.
  - `SIH_Round2_100_Questions.html` — 100-question comprehensive SIH Round 2 technical defense document.
  - `SIH_Round2_100_Questions.pdf` — Compiled high-resolution PDF for SIH jury submission.
  - `src/app/(app)/journey/layout.tsx` — Progress indicator layout for clinical journey steps.
  - `src/app/(app)/journey/intake/page.tsx` — Dynamic symptom collection step.
  - `src/app/(app)/journey/medikiosk/page.tsx` — Self-service kiosk check-in step.
  - `src/app/(app)/journey/digital-twin/page.tsx` & `DigitalTwinContent.tsx` — 3D anatomical viewer step.
  - `src/app/(app)/journey/reports/page.tsx` — Diagnostic report ingestion and OCR step.
  - `src/app/(app)/journey/timeline/page.tsx` — Unified clinical summary timeline.
  - `src/app/(app)/journey/booking/page.tsx` — Doctor discovery and appointment scheduler.
  - `src/app/(app)/journey/consultation/page.tsx` — Telehealth & in-clinic encounter interface.
  - `src/app/(app)/journey/ai-analysis/page.tsx` — Clinical insights and symptom breakdown.
  - `src/app/(app)/journey/draft-plan/page.tsx` — Provisional care plan generator.
  - `src/app/(app)/journey/doctor-approval/page.tsx` — Patient-side status tracking of care plan approval.
  - `src/app/(app)/journey/patient-portal/page.tsx` — Post-consultation care hub.
  - `src/app/doctor-dashboard/case/[id]/page.tsx` — Physician clinical review and prescription approval.

- **Modified:**
  - `package.json` & `package-lock.json` — Added `marked` and `puppeteer`.
  - `src/app/auth/page.tsx` — Multi-step phone/OTP onboarding and immediate journey dispatch.
  - `src/app/layout.tsx` — Root layout providers and metadata tuning.
  - `src/app/page.tsx` — Ecosystem portal launcher links.
  - `src/app/doctor-dashboard/layout.tsx` — Doctor navigation adjustments.
  - `src/app/onboarding/page.tsx` — Post-auth onboarding flow sync.
  - `src/components/layout/Sidebar.tsx` — Streamlined sidebar links.
  - `src/lib/store.ts` — Single-source-of-truth models, journey storage helpers, and audit logger.
  - `src/app/api/ai/*` (`analyze-appointment`, `analyze-report`, `chat`, `intake`, `summarize-intake`, `voice`) — AI endpoint parameter fine-tuning.

- **Deleted (Replaced by `/journey/*`):**
  - `src/app/(app)/calls/page.tsx`
  - `src/app/(app)/dashboard/page.tsx`
  - `src/app/(app)/digital-twin/page.tsx` & `DigitalTwinContent.tsx` (migrated to `/journey/digital-twin/`)
  - `src/app/(app)/doctors/page.tsx` (migrated to `/journey/booking/`)
  - `src/app/(app)/intake/page.tsx` (migrated to `/journey/intake/`)
  - `src/app/(app)/reports/page.tsx` (migrated to `/journey/reports/`)
  - `src/app/kiosk/page.tsx` (migrated to `/journey/medikiosk/`)

### Testing & Verification

- Dev server verified active on `http://localhost:3000` via Next.js 16 (Turbopack).
- State persistence and step transitions validated across `hs_patient_journeys_{userId}` local storage keys.
- PDF generation scripts tested with Puppeteer and Marked.

### Known Issues & Next Steps

1. **Staged Git Commit:** Working tree has major deletions of obsolete routes and additions of `/journey/*`; ready for review and staged commit.
2. **End-to-End Walkthrough:** Run through an end-to-end journey test from `/auth` -> `/journey/intake` -> `/journey/reports` -> `/journey/consultation` -> `/doctor-dashboard/case/[id]` -> `/journey/patient-portal` to verify cross-role state sync.

**NEXT AI SHOULD:**
- Review and stage uncommitted files in Git (`git add -A` and create a clean commit for the Journey architecture).
- Test cross-portal integration (Patient Journey -> Doctor Dashboard Case Approval -> ABHA sync).

---

## [2026-09-05] — Lead AI Engineer — Commit 9ab7979

**Description:** Implement recent UI updates, AI adjustments, and report OCR fixes.  
**Changes:**
- Expanded ABHA ecosystem: Added Government portal (`src/app/abha/gov/page.tsx`), Patient portal (`src/app/abha/patient/page.tsx`), and dedicated doctor dashboard ABHA integration (`src/app/doctor-dashboard/abha/page.tsx`).
- Added specialized clinical modules:
  - Ayurveda Portal (`src/app/ayurveda/page.tsx`) with Dosha assessment, Ayurvedic formulations, and holistic lifestyle recommendations.
  - Hospital Management Portal (`src/app/hospital/page.tsx`) for bed tracking, ICU availability, and ambulance dispatch.
  - Blood Bank Portal (`src/app/blood-bank/page.tsx`) with real-time blood group inventory, donor registries, and emergency reservation.
  - Admin Portal (`src/app/admin/page.tsx`) for system metrics, role-based access, and audit log inspection.
- Enhanced AI pipeline: Added `summarize-intake` and `intake` endpoints; improved OCR processing in `analyze-report`.
- Introduced ABHA mock database (`src/lib/abhaDb.ts`) supporting 14-digit ABHA ID verification, OTP simulation, and consent-driven health records (EHR/PHR) linkage.
- Added comprehensive multilingual translations in `src/lib/translations.ts`.

---

## [2026-08-26] — Lead AI Engineer — Commits ed6bd3f, 09e3bdf, 3ca336c

**Description:** Integrate appointment recorder in doctor portal, presentation assets, and emergency services.  
**Changes:**
- Implemented ambient clinical appointment recorder (`src/app/doctor-dashboard/recorder/page.tsx`) with live audio transcription and note generation.
- Added Emergency Response module (`src/app/(app)/emergency/page.tsx`) with SOS trigger, 108 dispatch integration, and nearest trauma center routing.
- Fixed Leaflet map import issues (`3ca336c`) and regex compilation in OCR report analysis (`09e3bdf`).
- Created automated pitch deck and presentation generators (`generate_sih_deck.py`, `generate_aligned_deck.py`, `populate_template.py`) for SIH 2026 evaluation.

---

## [2026-03-05] — Lead AI Engineer — Commit 8eec18a

**Description:** HealthSync full application baseline with performance optimizations.  
**Changes:**
- Established Next.js 16 App Router application scaffold with TypeScript, TailwindCSS v4, Lucide icons, and Recharts.
- Integrated Three.js / React Three Fiber interactive 3D digital twin body model.
- Set up Gemini AI integration (`@google/generative-ai`) for conversational health companion, OCR report parsing, and clinical recommendations.
- Created doctor and patient role portals with local storage mock database (`src/lib/store.ts`).

---

## [2026-02-25] — Initial Setup — Commit 6be7f03

**Description:** Initial commit bootstrapped with Create Next App.
