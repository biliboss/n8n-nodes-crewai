# ADR-004: Visual Feedback Loop for Node Development

- Status: Accepted
- Date: 2026-05-20
- Branch: `v2-visual-first`
- Deciders: @billiboss
- Related: ADR-001 (monorepo layout), ADR-002 (visual-first rebuild scope), ADR-003 (icon pipeline)

## Context and Problem Statement

We are doing a visual-first rebuild of `n8n-nodes-crewai`. In this phase the only thing
that matters is the developer feedback loop: a contributor edits a `.node.ts` description
or an `.svg` icon and needs to see the result on a real n8n editor canvas, in both light
and dark themes, as fast as possible. There is no backend/executor work in this phase —
the runtime behavior of nodes is out of scope until each node is "visually validated".

n8n's official guide (https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/)
describes two supported approaches: `pnpm link` into a globally installed `n8n`, or
mount the package's `dist/` folder into the n8n container under `~/.n8n/custom`.

Current `package.json` already has the right primitives:

- `pnpm build` → `tsc && gulp build:icons` (compiles TS, copies SVG/PNG into `dist/`)
- `pnpm dev` → `tsc --watch` (TS recompile on save; does NOT rebuild icons, does NOT restart n8n)
- `pnpm build-and-run-n8n` → one-shot rebuild + launch host n8n

So we need to (a) pick a runtime, (b) close the gap between "files changed" and "editor
shows new pixels", (c) add a programmatic screenshot capture so a ralph loop can grind
through nodes without a human clicking, (d) define what "done" means per node.

## Decision Drivers

- **Restart speed.** Every save → see-pixels cycle should be under ~5s for property/displayName
  edits and under ~10s for icon edits.
- **Dark theme inspection.** n8n's dark theme is the harder constraint for icons. The setup
  must let us toggle theme without rebuilding.
- **macOS portability.** Primary developer machine is Darwin (Apple Silicon). Docker Desktop
  on Apple Silicon has noticeable FS-mount latency for bind mounts; this matters.
- **Ralph-loop friendly.** A long-running automated loop should be able to drive the editor
  headlessly and decide "is node X visually done?" from artifacts on disk.
- **Reproducibility.** A teammate cloning the repo should get the same canvas with one command.

## Considered Options

### Runtime

1. **Host n8n + `pnpm link`** — fastest restart, but pollutes global node_modules and
   couples to whatever n8n the dev happens to have installed.
2. **Docker compose, dist mounted into `~/.n8n/custom`** — reproducible, theme-toggleable
   via UI, isolated SQLite. Bind-mount FS events on Darwin add ~300ms but n8n only
   re-reads custom nodes on process start anyway, so the mount-latency hit is paid once
   per restart, not per save.
3. **Both, compose primary.**

### Rebuild loop

1. `tsc --watch` alone — covers `.ts`, ignores icons, does not restart n8n.
2. `tsc --watch` + `gulp watch` for icons + `nodemon` watching `dist/` to restart n8n.
3. `concurrently` running all three.

### Screenshot capture

1. **Playwright** (Node, scriptable, headed for visual QA + headless for CI).
2. Chrome DevTools MCP — works but requires the model in the loop on every screenshot;
   not appropriate for a ralph loop that runs unattended overnight.
3. Manual — non-starter for a ralph loop.

## Decision

### 1. Runtime — Docker compose, primary

We run n8n in Docker via `docker/docker-compose.yml`, with `./dist` bind-mounted into
`/home/node/.n8n/custom/n8n-nodes-crewai`. The host-link path stays documented as an
escape hatch for contributors who hit Docker Desktop issues on their machine, but it is
not the supported default.

Justification:

- Same n8n version pinned for every contributor → screenshots are comparable.
- SQLite data lives in a named volume, so workflow drafts survive container restarts but
  can be reset with one `docker volume rm`.
- macOS Darwin: Docker Desktop's VirtioFS (default in recent Docker Desktop) makes bind
  mounts fast enough; the restart cost is dominated by n8n's own boot (~3–5s), not FS.
- Dark theme is a one-click toggle in the editor; no rebuild needed to test it.

### 2. Rebuild loop

Three watchers in parallel via a new `pnpm dev:visual` script (added to `package.json`):

```jsonc
"scripts": {
  "dev:tsc":    "tsc --watch --preserveWatchOutput",
  "dev:icons":  "gulp watch:icons",                       // new gulp task
  "dev:n8n":    "nodemon --watch dist --ext js,svg,png --delay 800ms --exec 'docker compose -f docker/docker-compose.yml restart n8n'",
  "dev:visual": "concurrently -k -n tsc,icons,n8n -c blue,magenta,green 'pnpm dev:tsc' 'pnpm dev:icons' 'pnpm dev:n8n'"
}
```

New dev dependencies: `concurrently`, `nodemon` (already in repo per `nodemon.json`),
and a `watch:icons` task to add to `gulpfile.js`.

`tsc --watch` alone is NOT enough because:

- It does not touch icon assets — a `.svg` edit produces zero output until `gulp build:icons` runs.
- n8n loads custom nodes once at boot. Files changing under `~/.n8n/custom` do NOT
  hot-reload. We must restart the n8n process.

We use `docker compose restart n8n` (not `up --build`) — restart is ~3s vs ~15s for
recreate, and the bind mount means we don't need to rebuild the image when source changes.

The 800ms `--delay` on nodemon coalesces the typical "tsc emits 6 files in 200ms" burst
into a single restart.

### 3. `docker/docker-compose.yml`

```yaml
# docker/docker-compose.yml
# Local-only n8n for visual validation of custom nodes.
# DO NOT use in production — auth is disabled and the encryption key is fixed.
services:
  n8n:
    image: n8nio/n8n:1.74.1            # pin; bump deliberately with an ADR
    container_name: n8n-nodes-crewai-dev
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      # --- editor / auth ---
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - N8N_SECURE_COOKIE=false
      - N8N_USER_MANAGEMENT_DISABLED=true   # skip owner-setup wizard
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_HIRING_BANNER_ENABLED=false
      - N8N_PERSONALIZATION_ENABLED=false
      # --- custom nodes discovery ---
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
      # --- logs / debugging ---
      - N8N_LOG_LEVEL=debug
      - N8N_LOG_OUTPUT=console
      - NODE_FUNCTION_ALLOW_EXTERNAL=*
      # --- executor (phase 2; harmless here) ---
      - N8N_RUNNERS_ENABLED=true
      # --- stable encryption key so workflow drafts survive volume resets-by-mistake ---
      - N8N_ENCRYPTION_KEY=dev-only-not-a-secret-2026
    volumes:
      # SQLite + user data
      - n8n_data:/home/node/.n8n
      # Custom node dist mount — THIS is the visual feedback hot path
      - ../dist:/home/node/.n8n/custom/n8n-nodes-crewai:ro
      # Optional: mount a workflow seed dir so screenshot script can import templates
      - ../docker/workflows:/home/node/workflows:ro

volumes:
  n8n_data:
    name: n8n-nodes-crewai-dev-data
```

Notes:

- SQLite lives in the named volume `n8n-nodes-crewai-dev-data`. Reset with:
  `docker compose -f docker/docker-compose.yml down -v`.
- Dist is mounted **read-only** — the container should never write into our source tree.
- The container path `/home/node/.n8n/custom/<pkg-name>` matches what n8n expects;
  `package.json` `n8n.nodes` paths resolve relative to that root.
- We deliberately omit a Postgres service. SQLite is sufficient for visual work and
  removes a moving part.

### 4. Screenshot capture — Playwright

A new package `scripts/visual-capture/` runs a Playwright script
(`pnpm visual:capture`) that:

1. Boots a Chromium context against `http://localhost:5678`.
2. Skips owner-setup (disabled via env above) and lands on `/workflow/new`.
3. For each node id declared in `package.json` `n8n.nodes`:
   - Opens the node panel (`+` button or `Tab`).
   - Searches the palette for the node's `displayName`.
   - Screenshots the palette item at the search-result row (this captures **icon at
     32px in palette context**).
   - Drags the palette item onto the canvas.
   - Screenshots the placed node element (this captures **icon on canvas + connection
     points**).
   - Opens the node's parameter panel by double-clicking.
   - Screenshots the side panel (this captures **displayName, description, all
     property labels**).
   - Closes the panel; deletes the node; moves on.
4. Repeats steps 3 with `localStorage['N8N_THEME'] = 'dark'` for dark-theme set.
5. Writes PNGs to `docs/screenshots/<node>/{palette,canvas,panel}.{light,dark}.png`.
6. Writes a machine-readable `docs/screenshots/manifest.json` with timestamp + git SHA
   per capture, so the ralph loop can diff.

The script is intentionally idempotent: re-running overwrites prior screenshots for the
same node. CI later can git-diff the screenshots folder to enforce "no regressions".

Headed vs headless: the script accepts `--headed` for human eyeballing; default is
headless so it works inside ralph.

Not chosen: **Chrome DevTools MCP**. It would require the model in the loop for every
single screenshot, which (a) costs tokens, (b) blocks unattended overnight runs, (c)
makes results non-reproducible. Use Playwright for the loop; reserve MCP for
ad-hoc "why does this look wrong" investigations.

### 5. Visual-validated gate (per node)

A node is "visually validated" when, in BOTH light and dark themes:

- **G1 — Palette icon:** Icon renders at 32px in palette without artifacts, transparent
  background, no missing-image placeholder.
- **G2 — Dark-theme contrast:** Icon's visible features remain legible against
  `#2d2e3a` (n8n dark canvas bg). No invisible black-on-black strokes.
- **G3 — Connection points:** Inputs/outputs appear on the expected sides.
  Default: `main` input on the left, `main` output on the right.
  For sub-node patterns (Agent, Task, Tool used by Crew): `ai_*` connectors appear
  **on top** of the parent and the sub-node renders **below** the parent in the canvas
  hierarchy, per n8n's AI-node convention.
- **G4 — Metadata:** `displayName` and `description` are both present in the side panel,
  neither is truncated at standard panel width (380px), no `displayName` exceeds 24 chars.
- **G5 — Properties panel:** Panel opens without error; every declared property's label
  renders; no `[object Object]` or untranslated i18n keys; default values visible.

A node passes only when all 5 gates pass in both themes (10 checks total). Anything
less is "needs work".

### 6. Ralph-loop checklist — `docs/visual-progress.md`

The ralph loop reads ONE file to decide what to do next:

```markdown
<!-- docs/visual-progress.md -->
# Visual Progress

Source of truth for the visual-first rebuild loop. The ralph loop reads this file
to decide whether to keep grinding.

Legend: ✅ pass · ❌ fail · ⏳ pending · n/a not applicable

| Node       | G1 palette | G2 dark | G3 connections | G4 metadata | G5 panel | Last capture           | Notes |
|------------|------------|---------|----------------|-------------|----------|------------------------|-------|
| Crew       | ⏳         | ⏳      | ⏳             | ⏳          | ⏳       | —                      |       |
| Agent      | ⏳         | ⏳      | ⏳             | ⏳          | ⏳       | —                      | sub-node, ai_agent connector top |
| Task       | ⏳         | ⏳      | ⏳             | ⏳          | ⏳       | —                      | sub-node |
| ExampleNode| n/a        | n/a     | n/a            | n/a         | n/a      | —                      | scheduled for deletion |
| HttpBin    | n/a        | n/a     | n/a            | n/a         | n/a      | —                      | scheduled for deletion |

## Ralph stop condition

The loop exits successfully when every non-`n/a` row is ✅ across all 5 gates AND
`Last capture` SHA matches `git rev-parse HEAD`.
```

The capture script updates the `Last capture` column with the short SHA after each
successful run; a separate `pnpm visual:grade` script (out of scope for this ADR; see
ADR-005) flips ⏳/❌ → ✅ by running structural assertions against the manifest.

## Consequences

### Positive

- Single command (`pnpm dev:visual`) gives an editing → pixels loop in <10s.
- Compose file is the entire onboarding doc — `docker compose up` is the README.
- Screenshots in git make visual regressions reviewable in PRs (image diff in the
  GitHub UI).
- Ralph loop has a deterministic stop condition (`visual-progress.md` all green).

### Negative

- Adds `concurrently`, `nodemon`, `@playwright/test` as dev deps (~50MB).
- Pinning the n8n image means we miss visual changes in upstream until we bump
  deliberately. Acceptable — bumps become ADR-worthy events.
- Bind-mount on Docker Desktop for macOS is fast-enough, not native-fast. If a
  contributor on Linux complains the loop feels slow on Darwin, point them at the
  host-link escape hatch.
- Screenshot script is brittle against editor DOM changes. Mitigation: pin n8n
  image; selectors centralized in `scripts/visual-capture/selectors.ts`.

### Follow-ups (not in this ADR)

- ADR-005: grading script that converts manifest.json + screenshots into ⏳/✅/❌.
- ADR-006: CI job that fails PRs when `docs/screenshots/**` diff is unreviewed.
- Investigate `n8n-design-system` Storybook for property-panel snapshot tests
  without needing a full editor boot.

## Links

- n8n official local-development guide: https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/
- ADR-001 monorepo layout (defines `docker/` location)
- ADR-002 visual-first rebuild scope
- ADR-003 icon pipeline (defines what `gulp build:icons` produces)
