# Linear backlog — Houseplant Hospital 2.0

Master task list for workspace **`Houseplant-Hospital`**, team **`HIL`**.

- **Scope:** [Houseplant-Hospital-2.0-Scope.md](../Houseplant-Hospital-2.0-Scope.md)
- **How we work:** pick the next open `HIL` issue → implement in this repo → mark Done in Linear → reference `HIL-*` in commits
- **Bulk import:** optional CSV at [linear-import.csv](./linear-import.csv) (Linear → Settings → Import)

After creating issues in Linear, add the **`HIL-*` ID** in the `Linear ID` column below so repo and board stay in sync.

---

## How to use this with Cursor

1. Say: **“Work on HIL-12”** (or the next Todo issue).
2. Agent implements only what that issue describes.
3. When done, move issue to **Done** and commit with `HIL-12: …`.

---

## Setup (Jack — mostly manual)

| # | Linear ID | Title | Labels | Owner |
|---|-----------|-------|--------|-------|
| S1 | | GitHub private repo created and linked to this folder | `phase-1`, `infra` | Jack |
| S2 | | Supabase `hh-dev` project created | `phase-1`, `infra` | Jack |
| S3 | | Cloudflare account ready (Pages later) | `phase-1`, `infra` | Jack |
| S4 | | Mailchimp: confirm plan + record audience ID | `phase-5`, `mailchimp` | Jack |
| S5 | | Export XS–XL pricing from Zoho/spreadsheet | `phase-1` | Jack |
| S6 | | Gather brand assets (logo SVG/PNG, label refs) | `phase-6`, `brand` | Jack |
| S7 | | List staff emails for Supabase Auth | `phase-1`, `auth` | Jack |
| S8 | | Mac Mini + Brother printer on shop WiFi (verify print) | `phase-4`, `printing` | Jack |

**S1** is likely **Done** if the repo already exists.

---

## Phase 1 — Foundation

**Milestone:** Phase 1 — Foundation  
**Exit:** Admin logs in locally/preview; DB schema + RLS match scope; protected shell only.

| # | Linear ID | Title | Labels | Blocked by |
|---|-----------|-------|--------|------------|
| 1.1 | | Scaffold Next.js App Router + TypeScript + Tailwind + shadcn | `phase-1`, `infra` | S1 |
| 1.2 | | Supabase migration: core schema (customers, visits, plants, notes, history, outboxes) | `phase-1`, `infra` | S2, 1.1 |
| 1.3 | | Supabase migration: RLS + staff/admin roles on `profiles` | `phase-1`, `auth` | 1.2 |
| 1.4 | | Supabase migration: storage bucket `plant-photos` + policies | `phase-1`, `infra` | 1.3 |
| 1.5 | | Seed `pricing_rules` (XS–XL bands + bugs modifier) | `phase-1` | 1.2, S5 |
| 1.6 | | Supabase clients: browser, server, admin (service role server-only) | `phase-1`, `infra` | 1.1 |
| 1.7 | | Staff login (email + password) | `phase-1`, `auth` | 1.3, 1.6 |
| 1.8 | | Auth middleware: redirect unauthenticated; `/settings` admin-only | `phase-1`, `auth` | 1.7 |
| 1.9 | | App shell: nav, logout, dashboard placeholder | `phase-1` | 1.8 |
| 1.10 | | Settings page stub (admin-only) | `phase-1`, `auth` | 1.8 |
| 1.11 | | `.env.example` + `docs/SETUP.md` (env vars, first admin user) | `phase-1`, `infra` | 1.6 |
| 1.12 | | Cloudflare Pages deploy config + first preview deploy | `phase-1`, `infra` | 1.9, S3 |
| 1.13 | | **Phase 1 verification:** admin login on preview URL | `phase-1` | 1.12 |

---

## Phase 2 — Core operations

**Milestone:** Phase 2 — Core operations  
**Exit:** Check-in 3 plants on one visit; kanban shows cards; photos load.

| # | Linear ID | Title | Labels | Blocked by |
|---|-----------|-------|--------|------------|
| 2.1 | HIL-26 | Dashboard kanban layout (6 lanes) | `phase-2`, `dashboard` | HIL-14 |
| 2.2 | HIL-27 | Plant card component (thumbnail, surname, name, size, bugs, age) | `phase-2`, `dashboard` | HIL-26 |
| 2.3 | HIL-28 | Dashboard query: plants with customer + latest photo | `phase-2`, `dashboard` | HIL-27, HIL-17 |
| 2.4 | HIL-29 | Check-in flow — customer step (name, email, phone, consent) | `phase-2`, `check-in` | HIL-14 |
| 2.5 | HIL-30 | Check-in flow — staff step (multi-plant: size, name, notes) | `phase-2`, `check-in` | HIL-29 |
| 2.6 | HIL-31 | Server action: create Visit + N Plants (single transaction) | `phase-2`, `check-in` | HIL-30, HIL-18 |
| 2.7 | HIL-32 | Photo capture UI (`capture="environment"`) + client compression / EXIF strip | `phase-2`, `check-in` | HIL-30 |
| 2.8 | HIL-33 | Upload photo + thumbnail to Supabase Storage | `phase-2`, `check-in` | HIL-32, HIL-17 |
| 2.9 | HIL-34 | Wire mandatory photo into check-in completion | `phase-2`, `check-in` | HIL-31, HIL-33 |
| 2.10 | HIL-35 | Plant detail page | `phase-2` | HIL-31 |
| 2.11 | HIL-36 | Visit / case detail page (multi-plant) | `phase-2` | HIL-31 |
| 2.12 | HIL-37 | Customer search | `phase-2` | HIL-18 |
| 2.13 | HIL-38 | QR route `/hh/case/[plantId]` → plant detail | `phase-2` | HIL-35 |
| 2.14 | HIL-39 | **Phase 2 verification:** 3-plant check-in E2E on iPad + Mac | `phase-2` | HIL-28, HIL-34, HIL-38 |

---

## Phase 3 — Workflow and pricing

**Milestone:** Phase 3 — Workflow and pricing  
**Exit:** Plant lifecycle check-in → collected with price + audit trail.

| # | Linear ID | Title | Labels | Blocked by |
|---|-----------|-------|--------|------------|
| 3.1 | HIL-40 | Status transitions (kanban move or tap) | `phase-3`, `dashboard` | HIL-39 |
| 3.2 | HIL-46 | `status_history` on every status change | `phase-3` | HIL-40 |
| 3.3 | HIL-41 | Treatment notes on plant detail | `phase-3` | HIL-35 |
| 3.4 | HIL-42 | Care tips on plant detail | `phase-3` | HIL-35 |
| 3.5 | HIL-43 | Bugs found toggle (+10% via `pricing_adjustments`) | `phase-3` | HIL-40 |
| 3.6 | HIL-44 | Bugs warning on dashboard cards + plant detail | `phase-3`, `dashboard` | HIL-43 |
| 3.7 | HIL-45 | Pricing engine from `pricing_rules` (no hardcoded UI prices) | `phase-3` | HIL-9 |
| 3.8 | HIL-47 | Admin settings: edit size-band pricing | `phase-3`, `auth` | HIL-45 |
| 3.9 | HIL-48 | Pricing summary on plant detail | `phase-3` | HIL-45, HIL-43 |
| 3.10 | HIL-49 | Collection workflow: mark Collected + final price | `phase-3` | HIL-48 |
| 3.11 | HIL-50 | **Phase 3 verification:** full lifecycle + audit trail | `phase-3` | HIL-49 |

---

## Phase 4 — Label printing

**Milestone:** Phase 4 — Label printing  
**Exit:** Tap print → branded label with scannable QR.

| # | Linear ID | Title | Labels | Blocked by |
|---|-----------|-------|--------|------------|
| 4.1 | | Decide production domain; set `APP_BASE_URL` | `phase-4`, `infra` | — |
| 4.2 | | `print-bridge` Node service on Mac Mini (auth + health) | `phase-4`, `printing` | S8 |
| 4.3 | | Branded label template (HTML/PDF): logo, fields, QR URL | `phase-4`, `printing`, `brand` | 4.1, S6 |
| 4.4 | | macOS silent print integration (print queue) | `phase-4`, `printing` | 4.2, 4.3 |
| 4.5 | | App: enqueue `print_jobs` + server action → bridge | `phase-4`, `printing` | 4.4 |
| 4.6 | | Print + reprint from plant detail and QR page | `phase-4`, `printing` | 4.5 |
| 4.7 | | Secure bridge access (tunnel / allowlist — document in SETUP) | `phase-4`, `printing`, `infra` | 4.5 |
| 4.8 | | **Phase 4 verification:** iPad print E2E in store | `phase-4`, `printing` | 4.6, 4.7 |

---

## Phase 5 — Mailchimp

**Milestone:** Phase 5 — Mailchimp  
**Exit:** Test check-in syncs contact + triggers journey email.

| # | Linear ID | Title | Labels | Blocked by |
|---|-----------|-------|--------|------------|
| — | HIL-8 | Mailchimp plan + audience ID (setup) | `phase-5`, `mailchimp` | — **Done** |
| 5.1 | HIL-53 | Mailchimp client + env config | `phase-5`, `mailchimp` | HIL-8 | **Done** |
| 5.2 | HIL-54 | Mock adapter for local dev (`mailchimp_events` outbox) | `phase-5`, `mailchimp` | HIL-53 | **Done** |
| 5.3 | HIL-55 | Check-in: upsert contact, tags, consent rules | `phase-5`, `mailchimp`, `check-in` | HIL-54, HIL-31 | **Done** |
| 5.4 | HIL-56 | Emit events on status / bugs changes | `phase-5`, `mailchimp` | HIL-54, HIL-40 | **Done** |
| 5.5 | HIL-57 | Worker: process outbox → Mailchimp API (retry + status) | `phase-5`, `mailchimp` | HIL-56 | **Done** |
| 5.6 | HIL-58 | Jack: configure Mailchimp journeys in Mailchimp UI | `phase-5`, `mailchimp` | Jack (parallel) | **Done** |
| 5.7 | HIL-59 | Admin view: failed / pending Mailchimp events (optional) | `phase-5`, `mailchimp` | HIL-57 |
| 5.8 | HIL-60 | **Phase 5 verification:** test audience journey fires | `phase-5`, `mailchimp` | HIL-55, HIL-57, HIL-58 |

---

## Phase 6 — Polish and go-live

**Milestone:** Phase 6 — Polish and go-live  
**Exit:** Branded PWA in production; Zoho cutover plan executed.

| # | Linear ID | Title | Labels | Blocked by |
|---|-----------|-------|--------|------------|
| 6.1 | | Brand audit: extract tokens from hilda.co | `phase-6`, `brand` | S6 |
| 6.2 | | Apply Hilda design tokens across all screens | `phase-6`, `brand` | 6.1 |
| 6.3 | | PWA manifest + icons + iPad install instructions | `phase-6` | 6.2 |
| 6.4 | | Performance: kanban + signed image URLs tuned | `phase-6`, `dashboard` | 2.3 |
| 6.5 | | Supabase Pro + `hh-prod` + production env on Cloudflare | `phase-6`, `infra` | 1.12 |
| 6.6 | | Cutover runbook: parallel Zoho → training → disable Zoho | `phase-6` | 6.5 |
| 6.7 | | Production monitoring checklist (auth, storage, queues) | `phase-6`, `infra` | 6.5 |
| 6.8 | | **Phase 6 verification:** go-live sign-off | `phase-6` | 6.3–6.7 |

---

## Suggested first issues to create (if starting now)

1. **S2** Supabase `hh-dev` (if not done)
2. **1.1** Scaffold Next.js
3. **1.2** Core schema migration
4. **1.7** Staff login

Work strictly in order within Phase 1 unless blocked items are Done.

---

## Parent issues (optional in Linear)

You may group phases as **parent** issues:

| Parent title | Child issues |
|--------------|--------------|
| Phase 1 — Foundation | 1.1–1.13 |
| Phase 2 — Core operations | 2.1–2.14 |
| Phase 3 — Workflow and pricing | 3.1–3.11 |
| Phase 4 — Label printing | 4.1–4.8 |
| Phase 5 — Mailchimp | 5.1–5.8 |
| Phase 6 — Polish and go-live | 6.1–6.8 |

Setup tasks **S1–S8** stay top-level (no parent).
