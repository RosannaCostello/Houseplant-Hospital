# Hilda brand tokens — Houseplant Hospital 2.0

**Source:** Hilda brand style sheet (September 2020) + [hilda.co](https://www.hilda.co).  
**Linear:** [HIL-61](https://linear.app/hilda-houseplant-hospital/issue/HIL-61) (audit), [HIL-63](https://linear.app/hilda-houseplant-hospital/issue/HIL-63) (apply tokens)  
Do not approximate — update here if brand guidelines change.

## Typography

Per Hilda brand guidelines: **Libre Franklin** (body/UI) and **DM Serif** (headings).

| Role | Family | Weights | Usage |
|------|--------|---------|--------|
| **Headings** | DM Serif | Regular (400), Italic | Page titles, lane headers, display headings |
| **Body / UI** | Libre Franklin | Light (300), Regular (400), Medium (500), Bold (700) | Nav, forms, labels, buttons, card body |

Loaded via `next/font/google` in `app/layout.tsx` as **DM Serif Display** (the Google Fonts cut of DM Serif for headings).

## Core colour palette

| Token | Hex | Tailwind examples |
|-------|-----|-------------------|
| `hilda-bg` | `#f1f1f1` | `bg-hilda-bg` |
| `hilda-surface` | `#ffffff` | `bg-hilda-surface` |
| `hilda-heading` | `#002c36` | `text-hilda-heading`, `bg-hilda-heading` |
| `hilda-text` | `#315f5f` | `text-hilda-text`, `bg-hilda-text` |
| `hilda-text-muted` | `rgba(49, 95, 95, 0.6)` | `text-hilda-text-muted` |
| `hilda-nav-ink` | `#335c59` | `text-hilda-nav-ink` (bottom nav) |
| `hilda-border` | `#171d1a` | `border-hilda-border/15` (use opacity steps) |
| `hilda-coral` | `#f1c1bd` | `bg-hilda-coral` — primary buttons, surgery lane |
| `hilda-gold` | `#d3ac54` | `bg-hilda-gold` — check-in lane, highlights |
| `hilda-deep` | *alias of `hilda-heading`* | Legacy alias — prefer `hilda-heading` |

**Border opacity steps:** `/10`, `/15`, `/20`, `/25`, `/30`, `/40` on `hilda-border`.

## Semantic colours

| Token | Value | Usage |
|-------|-------|--------|
| `hilda-on-dark` | `#ffffff` | CSS var; use Tailwind `text-hilda-inverse` (not `text-hilda-on-dark` — `-dark` breaks parsing) |
| `hilda-bugs` | alias of `hilda-gold` | Bugs icon badges site-wide |
| `hilda-warning-bg` | `#fffbeb` | “Not checked yet”, pricing hints |
| `hilda-warning-border` | `#fcd34d` | Warning dashed borders |
| `hilda-warning-text` | `#92400e` | Warning copy |
| `hilda-error-text` | `#dc2626` | Inline form errors |
| `hilda-error-text-strong` | `#b91c1c` | Stronger error emphasis |
| `hilda-error-bg` | `#fef2f2` | Error alert surfaces |
| `hilda-error-border` | `#fecaca` | Error alert borders |

Do **not** use Tailwind `zinc-*`, `orange-*`, `amber-*`, or `red-*` in app UI — use tokens above.

## Kanban lane accents

| Lane | Accent token |
|------|----------------|
| Check-in | `border-t-hilda-gold` |
| Quarantine | `border-t-hilda-heading` |
| In surgery | `border-t-hilda-coral` |
| Outpatient | `border-t-hilda-text` |
| Collected | `border-t-hilda-border/40` |
| Dead | `border-t-hilda-text-muted` |

## Buttons

- **Primary:** `bg-hilda-coral`, `text-hilda-inverse`, coral border
- **Outline:** `bg-hilda-surface`, `border-hilda-border/30`, `text-hilda-heading`
- **Ghost:** `text-hilda-heading`, `hover:bg-hilda-bg`

## CSS implementation

Tokens live in `app/globals.css` (`:root` + `@theme inline`). Shared form classes: `lib/brand/form-styles.ts`.

## UX tone

Calm, warm, premium, plant-focused — **not** generic SaaS/zinc dashboard.
