# ADR-001: Monorepo Structure for n8n-nodes-crewai v2

- **Status:** Accepted
- **Date:** 2026-05-20
- **Branch:** `v2-visual-first`
- **Deciders:** Project maintainers (single-maintainer team)

## Context

`n8n-nodes-crewai` v1 was a flat, single-package n8n community node with a few
ad-hoc Python files at the root (`python/n8n-crewai.py`, `sample.py`). The v2
rewrite expands scope dramatically. The product will ship as **multiple
artifacts** with different ecosystems and release cadences:

1. **`n8n-nodes-crewai`** — TypeScript, the actual n8n custom nodes (Crew,
   Agent, Task, Tool, Memory, Knowledge, Flow). Published to npm.
2. **`crewai-bridge`** — Python service exposing CrewAI via REST + MCP.
   *Not* being built in this iteration, but the layout must accommodate it.
3. **`crewai-mcp-server`** — Future pip-installable standalone MCP adapter.

The TypeScript nodes and the Python bridge must share a contract: descriptors,
JSON schemas, and tool/agent type definitions. Today that contract lives only
in the TS layer; tomorrow it must be mirrored (or generated) into Python.

Current focus is **visual components only** — node UIs in the n8n editor, fast
hot-reload feedback. No backend work yet. But the directory layout chosen now
will be expensive to change later, so it must not box us in.

Operational constraints:

- Small team (effectively single maintainer).
- TS-first day-to-day; Python is dormant but real.
- **No GitHub Actions** — all builds are local.
- Fast local hot-reload into a running n8n instance is the critical inner loop.
- Prefer `pnpm` over `npm`/`yarn` (global rule: content-addressable store,
  hardlinks, smaller disk footprint across many sibling repos).

## Decision

### 1. Monorepo over flat single-package

Adopt a **monorepo** layout. Justification:

- Three artifacts already foreseen (`nodes-crewai`, `shared-schema`,
  `crewai-bridge`) need to evolve in lockstep on the contract surface. Splitting
  into three repos right now would force premature versioning of an unstable
  schema and force cross-repo PRs for every contract change.
- The shared schema package is the whole point of the split — a flat layout
  cannot express "this TS type is the source of truth, Python mirrors it"
  without inventing ad-hoc conventions.
- One git history, one issue tracker, one ADR log. Atomic commits across
  nodes + schema.
- Cost of monorepo tooling for this size is low (see tooling choice below).

### 2. Tooling: pnpm workspaces alone (no Turborepo, no Nx, no Bazel)

Adopt **pnpm workspaces, nothing more**, for now.

Comparison against the brief's criteria (TS-first, cross-language, small team,
no GitHub Actions, fast local hot-reload):

| Tool | TS-first | Cross-lang | Small-team overhead | Local hot-reload | Verdict |
|---|---|---|---|---|---|
| pnpm workspaces alone | Native | Ignores Python (good — Python uses its own tool) | Zero new concepts | `pnpm --filter ... dev` is direct | **Chosen** |
| pnpm + Turborepo | Native | TS-only cache | Adds `turbo.json`, remote cache config | Helps when builds get expensive; we have 1 build today | Defer |
| Nx | Strong but opinionated | Plugins exist for Python but heavy | High — generators, executors, project graph | Excellent dev server orchestration; overkill | Reject |
| Bazel | Cross-lang champion | Best | Very high — BUILD files, rules, hermeticity | Slow to set up; overkill at this size | Reject |

Rationale:

- With **one** TS package today (`nodes-crewai`) and **one** TS library package
  (`shared-schema`), a task orchestrator gives nothing: `pnpm -r build` is
  enough, and `pnpm --filter nodes-crewai dev` runs the hot-reload loop.
- No GitHub Actions means **no remote cache to share** — Turborepo's main
  value (cache hits across CI runs) is absent. Local caching at this size is
  not worth a new config surface.
- Python lives **outside** the pnpm graph entirely (see section 6). Nx/Bazel
  cross-language story is only worth its weight when builds actually couple;
  ours don't yet.
- **Escape hatch:** the moment we have ≥3 TS packages with a real build DAG,
  or we add a second TS service, we revisit and likely add Turborepo on top
  of the same `pnpm-workspace.yaml` — a strictly additive migration.

### 3. Directory layout

```
n8n-nodes-crewai/
├── package.json                  # workspace root, private, no publish
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json            # shared compiler options
├── .editorconfig .eslintrc.js .prettierrc.js .gitignore .npmignore
├── README.md  LICENSE.md  CODE_OF_CONDUCT.md
│
├── packages/
│   ├── nodes-crewai/             # THE published n8n community node
│   │   ├── package.json          # name: "n8n-nodes-crewai", publishConfig
│   │   ├── tsconfig.json
│   │   ├── gulpfile.js           # icon copy etc. (moved from root)
│   │   ├── nodes/
│   │   │   ├── Crew/
│   │   │   ├── Agent/
│   │   │   └── Task/
│   │   ├── credentials/
│   │   └── index.ts
│   │
│   └── shared-schema/            # TS types + (later) JSON Schema exports
│       ├── package.json          # name: "@crewai-n8n/shared-schema"
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # re-exports
│           ├── agent.ts          # AgentDescriptor, TaskDescriptor, ...
│           ├── tool.ts
│           └── schema/           # future: generated JSON Schema files
│
├── services/
│   └── crewai-bridge/            # PLACEHOLDER (Python, REST + MCP)
│       └── README.md             # "not built yet — see ADR-001"
│
├── docker/
│   └── n8n/                      # local docker-compose for hot-reload loop
│       ├── docker-compose.yml
│       └── README.md
│
├── examples/
│   └── README.md                 # sample workflows, request fixtures
│
└── docs/
    └── adr/
        └── 001-monorepo-structure.md
```

Notes on placement:

- `packages/` is **TS-only** and the only thing pnpm sees.
- `services/` is reserved for **deployable runtimes** in any language. Python
  goes there. Future `crewai-mcp-server` (pip-installable) goes under
  `packages/` only if it ships as Python source colocated; otherwise stays in
  `services/` or gets a sibling `python-packages/` later. Decision deferred.
- `docker/` is the visual-first feedback loop: a compose file that mounts
  `packages/nodes-crewai/dist` into `~/.n8n/custom` so saves are visible after
  a node restart.
- `examples/` replaces the loose `sample_request_01.*` files at root.

### 4. Root `package.json` and `pnpm-workspace.yaml`

**`pnpm-workspace.yaml`:**

```yaml
packages:
  - "packages/*"
# Explicitly NOT including services/* — Python is not a pnpm workspace.
```

**Root `package.json`:**

```json
{
  "name": "n8n-nodes-crewai-monorepo",
  "private": true,
  "version": "0.0.0",
  "description": "Monorepo for n8n-nodes-crewai v2 (TS nodes, shared schema, Python bridge).",
  "license": "MIT",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18.17"
  },
  "scripts": {
    "build": "pnpm -r --filter './packages/*' build",
    "dev": "pnpm --filter n8n-nodes-crewai dev",
    "lint": "pnpm -r --filter './packages/*' lint",
    "format": "prettier --write \"packages/**/*.{ts,json,md}\"",
    "n8n:up": "docker compose -f docker/n8n/docker-compose.yml up",
    "n8n:down": "docker compose -f docker/n8n/docker-compose.yml down"
  },
  "devDependencies": {
    "prettier": "^3.2.0",
    "typescript": "^5.4.0"
  }
}
```

The root is **private** and never published. Each package under `packages/*`
owns its own publish config.

### 5. Migration of existing files

Mechanical moves (no code changes, just relocation):

| From (repo root) | To | Notes |
|---|---|---|
| `nodes/Crew/`, `nodes/Agent/`, `nodes/Task/` | `packages/nodes-crewai/nodes/` | Keep as-is |
| `credentials/ExampleCredentialsApi.credentials.ts` | **delete** | v1 boilerplate |
| `credentials/HttpBinApi.credentials.ts` | **delete** | v1 boilerplate |
| `nodes/ExampleNode/` | **delete** | v1 boilerplate |
| `nodes/HttpBin/` | **delete** | v1 boilerplate |
| `python/n8n-crewai.py` | **delete** | superseded by future `crewai-bridge` |
| `python/sample_request_01.json` | `examples/sample_request_01.json` | |
| `python/sample_request_01.ts` | `examples/sample_request_01.ts` | |
| `sample.py` (root) | **delete** | scratch file |
| `package.json` (root) | rewritten per section 4; node-specific bits move to `packages/nodes-crewai/package.json` | |
| `tsconfig.json` | split: `tsconfig.base.json` at root + per-package `tsconfig.json` | |
| `gulpfile.js` | `packages/nodes-crewai/gulpfile.js` | |
| `nodemon.json` | `packages/nodes-crewai/nodemon.json` | |
| `index.js` (empty) | **delete** | |
| `package-lock.json` | **delete** | pnpm-only going forward |
| `tslint.json` | **delete** | tslint is deprecated; ESLint already configured |
| `pnpm-lock.yaml` | regenerate at root after restructuring | |
| `.eslintrc.js`, `.prettierrc.js`, `.editorconfig` | keep at root (apply repo-wide) | |
| `README_TEMPLATE.md` | **delete** | upstream community template |

The actual move is **not executed in this ADR** — see "what we defer".

### 6. Python coexistence without polluting pnpm

The Python service lives in `services/crewai-bridge/` and is **invisible to
pnpm** because `pnpm-workspace.yaml` only globs `packages/*`. Concretely:

- `pnpm install` at the root will not traverse `services/`.
- `services/crewai-bridge/` will eventually own its own `pyproject.toml` and
  use `uv` or `poetry`. Its lockfile is a sibling, not nested in pnpm's graph.
- Shared contract crossing the language boundary: `packages/shared-schema/`
  emits **JSON Schema** files to `packages/shared-schema/dist/schema/*.json`.
  The Python side consumes those JSON files (via codegen or runtime
  validation). The TS package is the source of truth; Python mirrors.
- A future `pnpm run schema:export` script will regenerate the JSON Schema
  artifacts; a future `services/crewai-bridge/scripts/sync-schema.py` will
  consume them. Neither exists today.
- Docker compose under `docker/` may eventually run both the n8n container
  and the Python bridge; orchestration lives outside both package managers.

### 7. What we explicitly defer

- **Turborepo / Nx adoption.** Revisit when ≥3 TS packages or a real build
  DAG appears.
- **`crewai-bridge` implementation.** Placeholder README only; no Python
  tooling chosen yet (`uv` vs `poetry` decision deferred to its own ADR).
- **`crewai-mcp-server` packaging.** Whether it lives under `packages/`,
  `services/`, or a future `python-packages/` is undecided.
- **Schema generation pipeline** (TS → JSON Schema → Python types). Stub
  directory exists; tooling (`zod-to-json-schema`, `datamodel-code-generator`,
  etc.) chosen later.
- **CI.** No GitHub Actions by directive. Local pre-commit hooks may come
  later; out of scope here.
- **Versioning strategy** (independent vs fixed via Changesets). Defer until
  second publishable TS package exists.
- **The actual file migration.** This ADR is decision-only; execution lands
  in a follow-up commit.

## Consequences

**Positive**

- Contract changes are atomic commits touching both TS and (later) Python.
- `pnpm install` stays fast and Python-free.
- Visual hot-reload loop is one `pnpm dev` + `pnpm n8n:up` away.
- Additive migration path to Turborepo/Nx the day we need it.
- Cleanup of v1 community-template cruft (`ExampleNode`, `HttpBin`, tslint,
  `package-lock.json`) lowers cognitive load.

**Negative / risks**

- Slight indirection: contributors must learn `pnpm --filter` instead of
  running scripts at root.
- Without Turborepo, no task-level caching; acceptable while the build DAG is
  trivial.
- Python and TS lockfiles drift independently — must be reconciled by
  convention, not by tooling, until schema codegen lands.
- "services vs packages" naming requires discipline; documented here.

## Alternatives Considered

- **Flat single-package repo (status quo extended).** Rejected: cannot express
  the TS/Python contract split cleanly; forces ad-hoc folders.
- **Three separate git repos.** Rejected: premature versioning of an unstable
  schema; cross-repo PRs for every contract change; tripled maintenance
  overhead for a single-maintainer project.
- **pnpm + Turborepo.** Deferred, not rejected: real value appears with
  multiple TS packages and remote caching; we have neither today and no CI
  to consume a remote cache.
- **Nx.** Rejected: heavy generator/executor model is overkill for two TS
  packages and one dormant Python service.
- **Bazel.** Rejected: best-in-class cross-language story but enormous setup
  cost and learning curve for a small-team, no-CI project.
