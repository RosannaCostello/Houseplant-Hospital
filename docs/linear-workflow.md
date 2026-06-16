# Linear workflow — Houseplant Hospital 2.0

This project uses **Linear** for all delivery tracking. Product requirements remain in [Houseplant-Hospital-2.0-Scope.md](../Houseplant-Hospital-2.0-Scope.md).

## Canonical identity (do not mix with other Linear workspaces)

| | Value |
|---|--------|
| **Workspace** | `Houseplant-Hospital` |
| **Issue prefix** | `HIL` (e.g. `HIL-1`) |

**Only issues with IDs starting with `HIL` in the `Houseplant-Hospital` workspace relate to this repository.** Issues from other workspaces or prefixes are out of scope.

Cursor agents: see [.cursor/rules/linear.mdc](../.cursor/rules/linear.mdc).

## Your setup (Jack)

1. **Linear workspace:** `Houseplant-Hospital` (free tier).
2. **Issue team/key:** `HIL` (Linear issue IDs like `HIL-12`).
3. **Access:** **jack@jackchalkley.com** (personal account) for all work on this build.
4. **Cursor MCP:** may currently point at a different Linear workspace. Until MCP is switched to `Houseplant-Hospital`, paste `HIL-*` issue IDs in chat; agents must not treat other-workspace issues as this project.

## Milestones (create in Linear)

| Milestone | Scope phase |
|-----------|-------------|
| Phase 1 — Foundation | Auth, DB, RLS, hosting, repo |
| Phase 2 — Core operations | Dashboard, check-in, photos, search |
| Phase 3 — Workflow and pricing | Status, bugs, notes, collection |
| Phase 4 — Label printing | Print bridge, QR labels |
| Phase 5 — Mailchimp | Contact sync, events, journeys |
| Phase 6 — Polish and go-live | Brand, PWA, perf, cutover |

## Labels to add

- `phase-1` through `phase-6`
- `infra`, `auth`, `check-in`, `dashboard`, `printing`, `mailchimp`, `brand`, `blocked`

## Master backlog

Full task breakdown (all phases): **[docs/linear-backlog.md](./linear-backlog.md)**

Optional bulk create: import **[docs/linear-import.csv](./linear-import.csv)** in Linear (team **HIL**), then assign milestones and mark **S1 GitHub** Done if already complete.

After import, paste `HIL-*` IDs back into the backlog table’s **Linear ID** column (or tell the agent the ID when starting work).

## Working with Cursor

1. Pick the next **Todo** `HIL` issue (usually top of Phase 1 after setup).
2. Say: **“Work on HIL-12”** — agent implements that issue only.
3. Mark **Done** in Linear; commit with `HIL-12: description`.
4. Reference scope sections in issue descriptions when non-obvious.

## Preparing MCP for `Houseplant-Hospital`

When ready to connect Cursor Linear MCP to this workspace:

1. In Cursor MCP settings, authenticate Linear with access to workspace **`Houseplant-Hospital`**.
2. Confirm new issues get IDs **`HIL-*`**.
3. Agents should filter by team/key **`HIL`** and never attach work to issues outside this workspace.
