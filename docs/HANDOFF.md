# Session Handoff — n8n-nodes-crewai v2

**Branch:** `v2-visual-first`
**Last commit:** `feat(visual): add Tool sub-node + Playwright capture harness + progress tracker`
**Date:** 2026-05-20
**Status:** Visual-first phase ~70% done — 4 of 4 MVP nodes shipped as visual shells, harness running, ralph loop not yet launched.

---

## 1. Why this rewrite exists

The previous `n8n-nodes-crewai` repo (60 stars, last push 2024-04) used `child_process.exec("python python/n8n-crewai.py …")` inside the n8n node — not viable as a community node (Python not guaranteed on host, shell-injection risk, no streaming, no credentials propagation).

The product re-framed as **"CrewAI Studio inside n8n"**:

- Custom **n8n nodes** that mimic CrewAI semantics (Crew, Agent, Task, Tool, Memory, Knowledge, Flow) with **typed sub-node connections** — same UX pattern as `@n8n/nodes-langchain/Agent`.
- A future `crewai-bridge` service exposing CrewAI via **REST + MCP**, called by the nodes (no backend work in this phase).
- Optional standalone `crewai-mcp-server` pip package later.

See `docs/00-initial-assessment.md` for the full rationale and rejected alternatives.

## 2. Repo layout (per ADR-001)

```
n8n-nodes-crewai/
├── packages/
│   ├── nodes-crewai/             # published n8n community node (TS)
│   │   ├── nodes/{Crew,Agent,Task,Tool}/
│   │   ├── scripts/visual-capture.spec.ts
│   │   ├── playwright.config.ts
│   │   ├── gulpfile.js
│   │   ├── package.json          # name "n8n-nodes-crewai", v0.2.0-alpha.0
│   │   └── tsconfig.json
│   └── shared-schema/            # cross-package descriptors (AgentDescriptor, ...)
├── services/crewai-bridge/       # Python placeholder, NOT in pnpm workspace
├── docker/n8n/                   # docker-compose for visual hot-reload loop
├── docs/
│   ├── adr/{001,002,003,004}-*.md
│   ├── HANDOFF.md (this file)
│   ├── visual-progress.md        # ralph stop condition tracker
│   ├── 00-initial-assessment.md  # original "should we continue?" report
│   └── screenshots/<node>/<theme>/{palette,canvas,panel}.png
├── examples/sample_request_01.{json,ts}
├── package.json                  # root, private, workspace orchestrator
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .npmrc                        # link-workspace-packages=true, auto-install-peers=true
```

## 3. ADRs — read these first

| # | File | One-line decision |
|---|------|-------------------|
| 001 | `docs/adr/001-monorepo-structure.md` | pnpm workspaces alone, no Turborepo; Python lives in `services/` outside pnpm |
| 002 | `docs/adr/002-node-taxonomy.md` | Crew/Agent/Task = main nodes; Tool/LLM/Memory/Knowledge = sub-nodes; v0.2 MVP = Crew+Agent+Task+Tool+LLM (reused); introduces `ai_task` cast for Task ports |
| 003 | `docs/adr/003-visual-identity.md` | Orange `#FF5A1F` (light) / `#FF7A47` (dark) outline icons, viewBox 0 0 40 40, stroke 3; sidebar group via `codex.subcategories.AI: ['CrewAI']` |
| 004 | `docs/adr/004-visual-feedback-loop.md` | Docker n8n primary, `pnpm dev:visual` watches tsc+gulp+nodemon, Playwright captures 5 gates × 2 themes per node |

## 4. What is wired up right now

### Stack
- `docker compose -f docker/n8n/docker-compose.yml up -d` boots **n8n 1.74.1** on `http://localhost:5678`.
- Custom dir bind-mounted at `/home/node/.n8n/custom/n8n-nodes-crewai` (the whole `packages/nodes-crewai/` directory, NOT just `dist/`).
- `NODE_PATH=/usr/local/lib/node_modules/n8n/node_modules` so the node files can resolve `n8n-workflow` at runtime.
- Dev owner provisioned: `dev@local.test` / `Devpass123`.

### Build
- `pnpm install --ignore-scripts` (the `--ignore-scripts` skips `isolated-vm` native build that fails on Node 25; harmless for our nodes).
- `pnpm --filter n8n-nodes-crewai build` runs `tsc && gulp build:icons`.
- `pnpm dev:visual` (configured but **not yet exercised** in a long session) — concurrently runs `tsc --watch`, `gulp watch:icons`, and nodemon-triggered `docker compose restart n8n`.

### Pinning
- `n8n-core` and `n8n-workflow` pinned to **`~1.73.0`** to match the container's bundled version. Master branch of n8n uses `NodeConnectionTypes` plural; **1.73 uses `NodeConnectionType` (singular as value)** — our code uses the 1.73 API.

### Nodes shipped (visual shells, no execute logic)
| Name | Class | Kind | Connection out | Notes |
|---|---|---|---|---|
| `crewAiCrew` | `Crew` | main | `Main` | inputs: `Main` + `AiAgent` + `ai_task` (cast) + `AiLanguageModel`; props: process/verbose/memory/maxRpm |
| `crewAiAgent` | `Agent` | sub | `AiAgent` | inputs: `AiLanguageModel` + `AiTool` + `AiMemory`; supplyData returns `{kind:'crewai.agent', role, goal, backstory, …}` |
| `crewAiTask` | `Task` | sub | `ai_task` (cast) | supplyData returns `{kind:'crewai.task', description, expectedOutput, agentRole, context[]}` |
| `crewAiTool` | `Tool` | sub | `AiTool` | name/description/JSON schema; supplyData returns `{kind:'crewai.tool', name, description, schema}` |

All four register under `Custom Nodes` category (codex `AI > CrewAI` requested but n8n is folding under `Custom Nodes` — flagged in tracker).

### Icons
- Orange outline SVGs at `nodes/<Name>/<name>.svg` + `<name>.dark.svg`.
- Concepts implemented per ADR-003: Crew = triangle of dots; Agent = head+shoulders; Task = clipboard+check; Tool = wrench.
- Icons load (verified in palette + panel header screenshots).
- iconUrl is exposed as `icons/CUSTOM//home/node/.n8n/custom/n8n-nodes-crewai/dist/nodes/Crew/crew.svg` — double-slash works, ugly, deferred.

### Visual capture
- `pnpm visual:capture` runs Playwright spec at `packages/nodes-crewai/scripts/visual-capture.spec.ts`.
- Provisions owner via `POST /rest/owner/setup`, logs in via `POST /rest/login`, drops each node, screenshots palette + canvas + panel in light + dark.
- Output: `docs/screenshots/<node>/<theme>/{palette,canvas,panel,context}.png` + `manifest.json` with git SHA.
- **All four nodes captured successfully on the last run.**

## 5. What ISN'T wired up yet

- **Task #10 — MVP canvas validation:** building a workflow JSON (2 Agents + 2 Tasks + 1 Tool + Crew + reused n8n langchain LLM) and importing via `POST /rest/workflows` to verify sub-node attachment edges render. Started but not finished.
- **Task #11 — Ralph loop:** never launched. Plan was `/ralph-loop` driving iterative refinement until all rows in `docs/visual-progress.md` go green.
- **Dark theme verification:** capture shows dark panel in some cases, but the theme-toggle JS in the harness is unreliable; marked `⚠️` in tracker.
- **`codex.subcategories` cluster:** nodes show under "Custom Nodes" instead of a "CrewAI" subcategory of "AI" — needs investigation against 1.73's node-creator implementation.
- **Selectors:** `[data-test-id="canvas-node"]` finds an element but its boundingBox sometimes < 10 px; fallback writes a full-page `canvas-fullpage.png`. Harness silently degrades — ralph loop should harden.
- **Backend (`crewai-bridge`):** intentionally not started in this phase. Empty `services/crewai-bridge/README.md` placeholder only.
- **CI / GitHub Actions:** intentionally none. User asked to keep it local-only for now.

## 6. Task list state (carry to next session)

| # | Status | Subject |
|---|---|---|
| 1 | ✅ | Migrate to monorepo per ADR-001 |
| 2 | ✅ | Create docker-compose n8n dev stack |
| 3 | ✅ | Wire build + watch loop |
| 4 | ✅ | Playwright screenshot harness |
| 5 | ✅ | Seed visual-progress tracker |
| 6 | ✅ | Implement Crew node (visual shell) |
| 7 | ✅ | Implement Agent node (visual shell) |
| 8 | ✅ | Implement Task node (visual shell) |
| 9 | ✅ | Implement Tool sub-node skeleton |
| 10 | 🟡 in_progress | Validate end-to-end MVP canvas |
| 11 | ⏳ pending | Launch ralph loop |

## 7. Critical knowledge to keep in head

- **API version mismatch is the #1 gotcha.** Anything you write against `n8n-workflow@2.x` (master) will break against `1.73`. Use `NodeConnectionType.Main` (value), not `NodeConnectionTypes.Main`. Use `INodeType`, `ISupplyDataFunctions`, `SupplyData` — all 1.73-compatible.
- **`NodeConnectionType` is a `const enum` in 1.73 — TS inlines values at compile time and may strip the import.** If a runtime says `n8n_workflow_1 is not defined`, it's because TS erased the import but you used a non-const-enum member. Workaround: cast literal strings (`'ai_task' as unknown as NodeConnectionType`) or hold a runtime alias.
- **Custom nodes need `NODE_PATH=/usr/local/lib/node_modules/n8n/node_modules`** in the container, otherwise `require('n8n-workflow')` from the bind-mounted dir fails at class instantiation time and shows the cryptic `Class could not be found` error.
- **Mount the *package root*, not `dist/`.** n8n's `CustomDirectoryLoader` walks the package looking for `package.json#n8n.nodes`.
- **`pnpm install` without `--ignore-scripts` fails** because `isolated-vm` (transitive n8n dep) can't build against Node 25. Always pass `--ignore-scripts`; we don't need that native module.
- **Workflow-link bind mount points** are `../../packages/nodes-crewai` and `../workflows` (relative to `docker/n8n/`).
- **Sub-node pattern:** export `supplyData(this: ISupplyDataFunctions): Promise<SupplyData>` returning `{ response: descriptor }`. The descriptor is plain JSON the future bridge will consume.

## 8. Commands cheat-sheet

```bash
# stack
pnpm n8n:up            # start docker
pnpm n8n:logs          # tail logs
pnpm n8n:down          # stop

# build + reload
pnpm --filter n8n-nodes-crewai build
docker compose -f docker/n8n/docker-compose.yml restart n8n

# inspect registered nodes
curl -s http://localhost:5678/types/nodes.json | grep -o "crewAi[A-Za-z]*" | sort -u

# capture
pnpm visual:capture    # writes docs/screenshots/

# dev owner
curl -s -c /tmp/n8n-cookies.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@local.test","password":"Devpass123"}'
```

## 9. Next-session entry point

```
1. cd ~/src/n8n-nodes-crewai && git checkout v2-visual-first
2. pnpm install --ignore-scripts
3. pnpm n8n:up
4. Read docs/HANDOFF.md (this file) + docs/visual-progress.md.
5. Resume Task #10: write packages/nodes-crewai/scripts/seed-mvp-workflow.ts
   that uses /rest/workflows to POST a Crew + 2 Agents + 2 Tasks + 1 Tool
   wired through sub-node connections; then re-run pnpm visual:capture to
   screenshot the assembled canvas.
6. Once Task #10 ✅, run /ralph-loop to iterate gates until visual-progress.md
   reaches all ✅.
```

## 10. Open questions for the user

- Should the published package keep `n8n-nodes-crewai` or rename (e.g. `@biliboss/n8n-nodes-crewai`)?
- Should we publicly announce the v2 rewrite on issue #1 of the original repo before or after the ralph loop completes?
- Is the dev-owner credential pinning (`dev@local.test`) OK in committed Playwright spec, or move to `.env`?
- For the `crewai-bridge` Python service (next phase), preference between FastAPI + plain MCP server vs `fastmcp` / Pydantic-AI Managed Agents?
