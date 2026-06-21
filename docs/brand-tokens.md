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

## Colour palette

| Token | Hex | Usage |
|-------|-----|--------|
| `hilda-bg` | `#f1f1f1` | App background (warm grey) |
| `hilda-surface` | `#ffffff` | Cards, header, inputs |
| `hilda-heading` | `#002c36` | Headings, primary nav |
| `hilda-text` | `#315f5f` | Body copy, secondary UI |
| `hilda-text-muted` | `rgba(49, 95, 95, 0.6)` | Hints, placeholders |
| `hilda-border` | `#171d1a` | Borders, dividers |
| `hilda-coral` | `#f1c1bd` | Primary buttons, warm accent |
| `hilda-gold` | `#d3ac54` | Badges, highlights, footer accent |
| `hilda-deep` | `#002c36` | Footer-style panels (optional) |
| `hilda-error` | `#f1c1bd` | Error surfaces (site uses coral family) |

## Radius & spacing

| Token | Value | Usage |
|-------|-------|--------|
| `rounded-hilda` | `16px` | Cards (matches hilda.co filters/cards) |
| `rounded-hilda-sm` | `12px` | Buttons, inputs (iPad tap targets) |

Spacing rhythm: 4px base (`p-2`, `p-4`, `p-6`); generous vertical padding on forms for iPad.

## Buttons (from hilda.co)

- **Primary:** coral background `#f1c1bd`, white text, coral border
- **Secondary / outline:** white surface, `hilda-text` border and label
- **Ghost:** transparent, coral or heading text

## Kanban lane accents (operational — not on retail site)

Warm, distinguishable tops aligned with Hilda palette:

| Lane | Accent |
|------|--------|
| Check-in | Gold `#d3ac54` |
| In surgery | Coral `#f1c1bd` |
| Outpatient | Teal `#315f5f` |
| Quarantine | Deep heading `#002c36` |
| Dead | Muted text tone |
| Collected | Border tone |

## Logo & assets (Jack — HIL-10 / S6)

- SVG/PNG logo for header, PWA icons, and Phase 4 labels — **not yet in repo**
- Until assets arrive: wordmark “Houseplant Hospital” in DM Serif Text

## CSS implementation

Tokens live in `app/globals.css` (`:root` + `@theme inline`). Use Tailwind classes:

- `bg-hilda-bg`, `bg-hilda-surface`, `text-hilda-heading`, `text-hilda-text`
- `bg-hilda-coral`, `text-hilda-gold`, `border-hilda-border`
- `font-serif` (headings), `font-sans` (body)

## UX tone (from scope)

Calm, warm, premium, plant-focused — **not** generic SaaS/zinc dashboard.
