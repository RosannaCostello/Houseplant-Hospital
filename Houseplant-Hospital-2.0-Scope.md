# Hilda Houseplant Hospital
## Product Build Brief (MVP v1)

## Project Context

We are building a custom internal operational web application for **Hilda’s Houseplant Hospital**.

Hilda is a physical houseplant retail business with an in-store “Houseplant Hospital” service where customers bring in unhealthy plants for diagnosis, treatment, repotting, recovery, and collection.

The current workflow is fragmented and inefficient.

Existing tools:

- Zoho Creator (check-in form + kanban workflow dashboard)
- Mailchimp (manual email communication + newsletter)
- Acuity (appointment booking)
- Brother label printer
- manual operational processes

### Platform decisions

Zoho: **remove**
Shopify: **retain** — retail catalogue and **source of truth for size-band treatment base prices** (see Pricing Logic)
Mailchimp: **retain**
Acuity: **retain for now**
Native mobile app: **no**
Web app / PWA: **yes**
Linear: **use from day one** (issue tracking and delivery organisation)

This system should become the operational source of truth for Houseplant Hospital.

Mailchimp remains the communications engine.

---

# Project Management (Linear)

All build work for Houseplant Hospital 2.0 is tracked in **Linear** from the start of the project. Do not rely on ad-hoc chat or undocumented task lists for delivery.

## Account and access

- **Linear workspace:** `Houseplant-Hospital` (free tier) — **this workspace only** for repo-related work.
- **Issue identifier:** `HIL` — all issues use IDs like `HIL-1`, `HIL-42`. **Only `HIL-*` issues in `Houseplant-Hospital` relate to this project.**
- **Contributor access:** Jack’s personal Linear account — **jack@jackchalkley.com** — for all tasks, issues, and implementation work on this project.
- Jack is the primary builder; issues are assigned and updated under this account unless another collaborator is explicitly added later.
- **Cursor MCP:** may be connected to a different Linear workspace until reconfigured; agents must still treat `Houseplant-Hospital` / `HIL-*` as the sole source of truth for this build (see [docs/linear-workflow.md](docs/linear-workflow.md) and `.cursor/rules/linear.mdc`).

## Purpose

Linear is the single source of truth for:

- what to build next
- what is in progress
- what is blocked
- what is done
- alignment with build phases (Foundation → Polish)

The app repo and [Houseplant-Hospital-2.0-Scope.md](Houseplant-Hospital-2.0-Scope.md) define **what** to build; Linear defines **when and in what order** work is picked up, completed, and verified.

## Usage rules

1. **Create issues before significant work** — every feature, bug fix, integration, or infra task that spans more than a trivial one-line change should have a Linear issue (or sub-issue).
2. **One issue per deliverable** — prefer small, reviewable issues over mega-tickets.
3. **Link to phase** — use labels or project fields so issues map to Phase 1–6 (see Build Phases).
4. **Status hygiene** — move issues through Linear states (e.g. Backlog → Todo → In Progress → Done); do not leave stale “In Progress” items.
5. **Scope reference** — issue descriptions should point to the relevant section of this scope doc when non-obvious.
6. **Agents and Cursor** — when implementing via Cursor, fetch or update the relevant Linear issue so progress stays visible to Jack in Linear.

## Suggested structure in Linear

**Workspace:** `Houseplant-Hospital`  
**Issues:** team/key `HIL` only

**Milestones** (align with Build Phases):

- Phase 1 — Foundation
- Phase 2 — Core operations
- Phase 3 — Workflow and pricing
- Phase 4 — Label printing
- Phase 5 — Mailchimp
- Phase 6 — Polish and go-live

**Labels** (examples):

- `phase-1` … `phase-6`
- `infra` (GitHub, Supabase, Cloudflare)
- `auth`
- `check-in`
- `dashboard`
- `printing`
- `mailchimp`
- `brand`
- `blocked`

**Issue types:** use Linear defaults (Bug, Feature, Improvement) as appropriate.

## Week 0 / setup issues (create first)

Before or as Phase 1 starts, create Linear issues for account and environment setup, for example:

- Create GitHub private repo and connect deploy
- Create Supabase `hh-dev` project
- Create Cloudflare account and Pages project
- Document env vars and first admin user
- Export Zoho pricing table for **interim seed data** (`pricing_rules` in Supabase until Shopify sync is built)
- Gather brand assets (logo, label artwork)
- List staff emails for Supabase Auth

These should live in **Phase 1 — Foundation** or a **Setup** milestone so the board is organised from day one.

## Out of scope for Linear

- Customer-facing plant workflow (that lives in the app kanban, not Linear).
- Mailchimp journey content authoring (done in Mailchimp UI; only integration work is tracked in Linear).

---

# Important Architectural Reference

A previous project architecture brief may be provided as reference.

Use it **only for execution patterns and engineering discipline**, such as:

- Next.js project structure
- Supabase implementation patterns
- auth architecture
- RLS patterns
- server/client separation
- migrations
- validation
- folder structure
- deployment practices
- coding conventions

Ignore all:

- visual design
- product requirements
- CMS concepts
- content architecture
- public website patterns
- business logic
- data models unrelated to Hilda

**Hilda-specific requirements always override architectural reference material.**

---

# Product Goal

Build a beautifully designed, low-cost internal operations application for Hilda’s Houseplant Hospital.

The app must:

- run in Safari on iPad
- run on MacBook / desktop browser
- behave like a PWA
- require no App Store deployment
- feel fast at the till
- minimise staff friction
- support multiple plants per customer visit
- manage plant lifecycle workflows
- integrate with Mailchimp
- integrate with local label printing
- visually match Hilda’s existing website brand exactly

This is not generic SaaS software.

This is a purpose-built retail operations tool.

---

# Core Workflow

## Check-in flow

Customer arrives with one or more unhealthy plants.

Staff discuss:

- likely issues
- treatment expectations
- turnaround
- plant size

Customer is handed an iPad.

Customer enters:

- full name
- email address
- phone number
- optional newsletter / marketing consent

Staff enter:

- plant size
- plant name/species (optional/flexible)
- initial notes
- photos
- check-in date (automatic)

The interaction must be fast and friction-light.

This is a busy retail environment.

---

# Multi-Plant Model

One customer may bring multiple plants.

Architecture:

Customer
→ Visit
→ Many Plants

Each plant is independently tracked.

Each plant has:

- its own photo
- its own status
- its own pricing
- its own treatment notes
- its own care notes
- its own bugs flag
- its own label
- its own QR code
- its own history

This is critical.

Do not model one case = one plant.

---

# Workflow States

Primary:

- Check-in
- In Surgery
- Outpatient
- Collected

Secondary:

- Quarantine
- Dead

Definitions:

## Check-in
Plant received, awaiting treatment.

## In Surgery
Plant actively being worked on.

## Outpatient
Treatment complete, awaiting collection.

## Collected
Customer has paid and taken plant.

## Quarantine
Pests / contamination detected.

## Dead
Plant unsalvageable.

Status changes should be logged with:

- timestamp
- acting staff member
- previous state
- new state

Auditability matters.

---

# Pricing Logic

Plants are size-banded:

- XS
- S
- M
- L
- XL

Pricing is determined by size.

Additional pricing modifier:

- bugs found = +10%

Future pricing rules should be configurable.

Avoid hardcoding pricing into component logic.

## MVP (Phase 3)

- Base prices live in Supabase `pricing_rules` (`rule_type = base_price`, one row per size band).
- Seeded from Hilda’s pricing table (exported from Zoho during cutover); editable in admin settings (HIL-47).
- Per-plant modifiers (e.g. bugs) are stored in `pricing_adjustments` and reflected on `plants.pricing_modifier`.
- All UI and collection totals use `lib/pricing/` (`getBasePriceRules`, `calculatePlantPrice`, `getPlantPricing`) — **never hardcoded amounts in components**.

## Future — Shopify as base-price source

Hilda’s Houseplant Hospital treatment sizes (**XS–XL**) correspond to **products (or variants) in Shopify**. Shopify is the long-term **source of truth for base treatment prices**; this app remains the source of truth for **operational workflow** (check-in, treatment, bugs flag, collection).

| Concern | Owner |
|--------|--------|
| Base price per size band (XS–XL) | Shopify product/variant price |
| Per-plant surcharges (bugs, etc.) | This app (`pricing_adjustments`) |
| Price breakdown shown to staff | This app (`lib/pricing/`) |
| Final price at collection | This app (may later create or reference a Shopify order/line item — TBD) |

**Integration approach (not in MVP):**

1. Map each size band to a Shopify product or variant ID (stored in `pricing_rules` or a dedicated mapping table).
2. **Sync** Shopify variant prices into `pricing_rules.amount` on a schedule or via webhook, **or** fetch live from Shopify inside `getBasePriceRules()` with a DB cache/fallback.
3. Staff continue to use the same pricing engine and plant-detail summary; only the **data source** for base amounts changes.
4. Admin settings (HIL-47) may shift from manual DB edits to “sync from Shopify” + read-only display of current Shopify prices.

**What does not move to Shopify:**

- Bugs-found (+10%) and other per-plant treatment adjustments.
- Size band recorded at check-in on each `Plant`.
- Audit trail of adjustments and collection price.

This keeps the current `pricing_rules` + `lib/pricing/` design valid: Supabase acts as **cache and fallback** until Shopify sync ships; the calculation layer is unchanged.

---

# Bugs Workflow

During surgery, staff can mark:

"bugs found"

Effects:

- pricing surcharge (+10%)
- workflow flagging
- Mailchimp event emission
- visible warning on dashboard
- warning on printed label

---

# Photo Handling

Check-in photo is mandatory.

Requirements:

- iPad camera capture
- optional upload
- automatic compression
- strip EXIF metadata
- generate thumbnails
- optimise for dashboard loading

Target:

- 200KB–500KB per photo
- max width ~1600px
- WebP preferred
- JPEG fallback

Historical photo retention is required.

---

# QR Code Workflow

Every plant label must contain a QR code.

QR resolves to:

/hh/case/{case_id}

This enables:

- instant staff lookup
- zero searching
- rapid workflow progression
- reprint label
- collection retrieval

Future:

- scan to move between workflow stages
- customer-facing status portal

For MVP:

staff workflow only.

QR should encode a URL, not just an ID.

---

# Label Printing

## Hardware

Printer:

Brother QL-820NWBc

Environment:

- printer connected to dedicated Mac Mini
- Mac Mini on same local WiFi network
- iPads communicate over local network

---

## Architecture

Web App
→ backend
→ Mac Mini local print bridge
→ Brother printer

Do NOT rely on browser print dialogs.

Do NOT depend on manual print confirmations.

Preferred implementation:

lightweight Node print service on Mac Mini

App sends structured print jobs.

Mac Mini:

- receives print request
- renders label
- sends silently to printer

Use MacOS print queue integration.

Avoid raw printer command complexity unless necessary.

---

# Label Design Requirements

Labels must be branded.

Not warehouse labels.

Include:

- Hilda logo
- Houseplant Hospital branding
- case ID
- customer surname
- plant name / nickname
- size
- bug warning
- check-in date
- QR code

Rendering preference:

HTML/CSS or PDF templates

Not ugly thermal raw output unless required.

Label design should feel like a branded Hilda artifact.

---

# Email Architecture

Mailchimp remains the communications engine.

This application is the operational source of truth.

Responsibilities:

## App owns:

- customers
- visits
- plants
- plant states
- pricing
- treatment notes
- care notes
- photos
- bugs flags
- history
- events

## Mailchimp owns:

- contact identity
- newsletter subscriptions
- consent state
- transactional email journeys
- marketing automation
- delayed follow-up campaigns
- segmentation
- unsubscribe handling

The app should emit structured events.

Examples:

- plant_checked_in
- plant_in_surgery
- bugs_found
- plant_outpatient
- plant_collected
- plant_dead
- plant_quarantined

---

# Mailchimp Sync Rules

At check-in:

If contact exists:

- update existing contact
- preserve consent
- add relevant tags
- trigger workflow event

If contact does not exist:

- create contact
- set consent state
- add tags
- trigger workflow event

Suggested tags:

- houseplant_hospital
- repeat_hospital_customer
- bugs_treatment
- newsletter

Transactional emails:

allowed without marketing opt-in.

Marketing:

requires consent.

Potential journeys:

- check-in confirmation
- in surgery update
- outpatient ready for collection
- collection aftercare
- 6 month “come back” reminder (marketing)

Do NOT build a custom email automation platform.

---

# Tech Stack

## Frontend

- Next.js 16+
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui

Architecture:

- App Router
- Server Components where appropriate
- Server Actions preferred
- responsive web app
- PWA installable experience

---

## Backend

Supabase Pro

Use:

- Postgres
- Auth
- Storage
- Row Level Security

Development may begin on free tier.

Production target:

Supabase Pro

Rationale:

- low cost
- 100GB storage
- operationally sufficient
- backups

---

## Authentication

Supabase Auth.

No WorkOS.

Roles:

- admin
- staff

No customer login in MVP.

Use role-based access control.

RLS-first architecture.

---

## Hosting

Preferred:

Cloudflare

Requirements:

- low cost
- commercial friendly
- GitHub-based deployment

GitHub:

free repo acceptable

---

# Suggested Engineering Patterns

Use disciplined architecture.

Recommended patterns:

- browser Supabase client
- server Supabase client
- service-role admin client (server only)
- Zod validation
- migrations
- environment separation
- typed data access
- explicit API boundaries
- strong folder structure
- minimal technical debt

Security should be database-enforced where appropriate.

---

# Suggested Data Model

Customer

- id
- first_name
- last_name
- email
- phone
- mailchimp_contact_id
- marketing_consent
- created_at
- updated_at

Visit

- id
- customer_id
- checkin_date
- notes
- created_by
- created_at

Plant

- id
- visit_id
- name
- species
- size
- status
- bugs_found
- pricing_modifier
- created_at
- updated_at

PlantPhoto

- id
- plant_id
- storage_path
- thumbnail_path
- created_at

TreatmentNote

- id
- plant_id
- author_id
- content
- created_at

CareTip

- id
- plant_id
- content
- created_at

StatusHistory

- id
- plant_id
- previous_status
- new_status
- changed_by
- created_at

PricingAdjustment

- id
- plant_id
- type
- amount
- reason

MailchimpEvent

- id
- customer_id
- plant_id
- event_name
- payload
- sent_at
- status

PrintJob

- id
- plant_id
- payload
- status
- created_at

User

- id
- role
- name
- email

---

# Core MVP Screens

Required:

- staff login
- dashboard
- kanban workflow
- new check-in flow
- customer details
- multi-plant intake
- case detail
- plant detail
- surgery notes
- care notes
- pricing summary
- print label
- QR lookup
- customer search
- collection workflow
- settings

---

# Dashboard UX

Dashboard is critical.

Must support:

kanban lanes:

- Check-in
- In Surgery
- Outpatient
- Quarantine
- Dead
- Collected

Plant cards should be glanceable.

Useful data:

- plant thumbnail
- customer surname
- plant name/species
- size
- bugs warning
- check-in age
- current status

Must feel fast.

Avoid dense enterprise UI.

---

# Brand Requirements

This application must visually match Hilda’s public website.

Source:

https://hilda.co

This is not inspiration.

This is the design system source.

Before UI implementation:

inspect live Hilda website and extract computed design values.

Mirror exactly:

- fonts
- colours
- font weights
- spacing rhythm
- border radii
- button styles
- cards
- interactions
- logo usage
- overall visual tone

Create local design tokens.

Do NOT approximate.

Do NOT use default shadcn styling.

The app should feel like an internal Hilda product.

---

# UX Principles

The app should feel:

- calm
- warm
- premium
- plant-focused
- friendly
- operationally efficient

It should NOT feel like:

- enterprise SaaS
- Jira
- hospital admin software
- generic dashboard software

Prioritise:

- speed
- big tap targets
- glanceability
- visual recognition
- low cognitive load

iPad use is a first-class requirement.

---

# Non-Goals (MVP)

Do NOT build unless explicitly requested:

- customer login
- customer portal
- SMS messaging
- payment processing
- appointment sync
- AI diagnosis
- AI care note generation
- analytics dashboards
- public status tracking
- native mobile apps
- inventory management

---

# Future Ideas (Do Not Build Yet)

Potential roadmap:

- AI-generated care notes
- AI diagnosis assistance
- customer-facing live status portal
- QR customer status access
- payment integration
- Acuity sync
- repeat-customer recommendations
- analytics
- barcode / scan-first workflows
- staff performance insights

---

# Build Phases

Suggested order:

Phase 1
Foundation

- auth
- database schema
- RLS
- user roles
- hosting setup

Phase 2
Core operations

- dashboard
- check-in
- multi-plant model
- photo upload
- plant records

Phase 3
Workflow

- state transitions
- status history
- bugs logic
- pricing logic

Phase 4
Printing

- Mac Mini print bridge
- branded labels
- QR labels
- reprint flows

Phase 5
Communications

- Mailchimp sync
- event triggers
- customer sync
- journeys

Phase 6
Polish

- Hilda brand matching
- PWA installability
- performance optimisation

---

# Final Principle

Build the hospital system.

Integrate the communications system.

Do not rebuild Mailchimp.
