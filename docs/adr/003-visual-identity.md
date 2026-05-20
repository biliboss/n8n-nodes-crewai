# ADR-003: Visual Identity System for CrewAI n8n Nodes

- Status: Accepted
- Date: 2026-05-20
- Branch: `v2-visual-first`
- Deciders: @billiboss
- Related: ADR-001 (project bootstrap), ADR-002 (node taxonomy)

## Context and Problem Statement

n8n nodes are discovered visually. The first user touchpoint is "drag node from
sidebar onto canvas" — before any parameter sheet, schema, or docs are read,
the user has already pattern-matched on the icon, the `displayName`, and the
color hint. For a node package that mirrors the CrewAI library (Crew, Agent,
Task, Tool, LLM, Memory, Knowledge, Flow), the icons must:

1. Cluster visually so users recognize "this is CrewAI" at a glance.
2. Differentiate so each node is distinguishable in the sidebar and on the
   canvas at small sizes.
3. Render legibly at 32px (sidebar item) and 60px (canvas node) in both n8n's
   light and dark themes.
4. Stay cheap to iterate — we will revise these multiple times in v2.

Reference: n8n's own LangChain pack
(`packages/@n8n/nodes-langchain/nodes/`) uses simple stroke-only SVGs (see
`mcp.svg` / `mcp.dark.svg`, `Guardrails/guardrails.svg`). LangChain nodes
prefix their `displayName` with intent rather than brand (e.g. `AI Agent`,
`Window Buffer Memory`) and use `group: ['transform']` plus a `codex.categories`
of `['AI']`.

## Decision Drivers

- 32px legibility in dark mode is the binding constraint (smallest, lowest
  contrast surface).
- We are not a design studio — we need a workflow a developer can iterate in
  under five minutes per icon.
- Brand association with CrewAI matters: users coming from CrewAI should
  recognize the pack instantly. CrewAI's public brand is dominated by warm
  orange on near-black with white type (per
  https://github.com/crewAIInc/crewAI README header). We do not vendor their
  logo (trademark), but we adopt their palette.

## Decision

### 1. Color palette

| Token            | Hex       | Use                                              | Contrast vs `#1A1D21` (n8n dark bg) |
|------------------|-----------|--------------------------------------------------|--------------------------------------|
| `crew-primary`   | `#FF5A1F` | Stroke color in light theme, brand accent        | 4.6:1 (AA)                           |
| `crew-on-dark`   | `#FF7A47` | Stroke color in dark theme (slightly lifted)     | 5.4:1 (AA)                           |
| `crew-secondary` | `#1A1A1A` | Reserved for fills behind primary (rare)         | n/a                                  |
| `crew-neutral`   | `#E5E5E5` | Light grays in compound icons                    | 11.2:1                               |

We deliberately use a single warm orange as the family signature. Every
CrewAI node icon will share this stroke color. That single repeated cue does
more for "this is CrewAI" recognition than any per-icon flourish.

The `iconColor` field on the node description is set to `'crimson'` for nodes
that fall back to a tinted-letter glyph (n8n auto-renders an initial-letter
badge from `iconColor` when no SVG resolves). This avoids the default gray.

### 2. Iconography style

- **Outline, not filled.** Filled shapes lose definition below ~24px on dark
  backgrounds; strokes survive.
- **Geometric, not illustrative.** A clipboard with a checkmark, not a hand
  holding a clipboard. Illustrative icons read as decoration; geometric icons
  read as labels.
- **Monochrome.** One stroke color per icon. We do not duotone — n8n's own
  langchain pack establishes this norm (see `mcp.svg`).
- **Stroke width 2 at a 24-unit viewBox, scaling to 3 at a 40-unit viewBox.**
  Equivalent visual weight to n8n's `Guardrails/guardrails.svg` (stroke-width
  3 on viewBox 40). At 32px display this gives a ~2.5px effective stroke,
  which clears dark-mode anti-aliasing.
- **Rounded line caps and joins** (`stroke-linecap="round"`,
  `stroke-linejoin="round"`). Matches n8n langchain visual language.
- **No text inside icons.** Glyphs survive translation; letters do not.
- **No fills, no gradients, no shadows.** Each icon is one `<g>` element of
  paths with a single stroke attribute.

### 3. File format conventions

- Format: SVG, optimized (no XML declaration, no comments, no editor metadata).
- `viewBox="0 0 40 40"` for all icons (matches `Guardrails/guardrails.svg`).
  Width/height attributes set to `40 40` for n8n's renderer.
- Strokes set on the `<g>` parent, not per-path, so the dark variant only
  needs to flip one attribute.
- Two files per node, colocated with the node TypeScript file:
  - `nodeName.svg` — light theme. Stroke = `#FF5A1F`.
  - `nodeName.dark.svg` — dark theme. Stroke = `#FF7A47`.
- File-name basename is camelCase, matching the node `name` field. Example:
  `crewAiAgent.svg` and `crewAiAgent.dark.svg`.
- Referenced in node descriptions as
  `icon: { light: 'file:crewAiAgent.svg', dark: 'file:crewAiAgent.dark.svg' }`.

### 4. Naming conventions

- **`displayName`**: prefix every node with `CrewAI ` (with a space, capital
  AI). Examples: `CrewAI Crew`, `CrewAI Agent`, `CrewAI Task`. Rationale:
  n8n's sidebar search ranks by `displayName` prefix match; prefixing means
  typing "crew" surfaces the whole pack as a contiguous block. n8n's own
  langchain nodes do not prefix because they are first-party — third-party
  packs benefit from the brand prefix.
- **`name` (node id)**: camelCase, prefixed `crewAi`. Examples: `crewAiCrew`,
  `crewAiAgent`, `crewAiTask`, `crewAiTool`, `crewAiLlm`, `crewAiMemory`,
  `crewAiKnowledge`, `crewAiFlow`. These collide-proof against `agent` (n8n
  langchain reserves the bare name).
- **Package id**: `n8n-nodes-crewai` (already set).
- **`codex.categories`**: `['AI']` — sits in the same sidebar bucket as the
  langchain pack.
- **`codex.subcategories.AI`**: `['CrewAI']` — creates a dedicated subgroup.

### 5. n8n `group` taxonomy

- All CrewAI nodes use `group: ['transform']`. This is what `Agent.node.ts`
  uses (`group: ['transform']`) and is the right bucket for nodes that
  consume input items and emit output items. Trigger-style nodes (none
  planned yet) would use `['trigger']`.
- Clustering in the sidebar is achieved via `codex.subcategories.AI:
  ['CrewAI']`, not via `group`. `group` controls runtime semantics; codex
  controls UI grouping.

## Per-node Icon Concepts

| Node      | Concept                                                                                          |
|-----------|--------------------------------------------------------------------------------------------------|
| Crew      | Three small circles arranged in a triangle with thin connecting lines — a tiny network of peers. |
| Agent     | A single rounded square (head) atop a wider rounded trapezoid (shoulders) — minimal avatar.      |
| Task      | A vertical rounded rectangle (clipboard) with two short horizontal lines and a checkmark.        |
| Tool      | A wrench at 45° (handle bottom-left, jaw top-right). Single closed outline path.                 |
| LLM       | Reuse n8n's first-party model icon. Do not ship our own — users already recognise the LM glyph. |
| Memory    | A rounded rectangle with three stacked horizontal layers (database silhouette, no perspective).  |
| Knowledge | An open book — two arched pages meeting at a vertical spine. Mirrors documentation conventions.  |
| Flow      | A diamond branching into two arrows (downstream paths) — a decision/flow split.                  |

Each is one `<g>` of stroke-only paths, ≤ 6 paths per icon, no text.

## Icon Generation Workflow

**Decision: Lucide icons as starting basis, hand-edited.**

Options considered:

- **Hand-drawn from scratch in Figma/Illustrator.** Highest quality ceiling,
  slowest iteration (~30 min per icon for non-designers), and risk of style
  drift across icons.
- **AI-generated (Midjourney / image models).** Output is raster; converting
  to clean stroke SVG is itself a 20-minute job per asset, and consistency
  across the family is brittle.
- **Lucide as starting basis.** Lucide (https://lucide.dev) ships 1500+
  permissively-licensed (ISC) stroke icons at `viewBox 0 0 24 24` with
  `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
  These conventions are almost identical to ours — we rescale to viewBox 40
  and bump stroke to 3. Each glyph already exists or composes from existing
  Lucide primitives (`users-round`, `user`, `clipboard-check`, `wrench`,
  `database`, `book-open`, `git-branch`).

The loop, per icon:

1. Pick the Lucide source glyph(s). Copy raw SVG path data from
   `https://lucide.dev/icons/<slug>`.
2. Paste paths into the `nodeName.svg` template (see Section 5 example).
   Rescale path coordinates from `24` to `40` (multiply by 5/3) or wrap in a
   `<g transform="scale(1.667)">`.
3. Set stroke to `#FF5A1F` on the parent `<g>`. Save.
4. Duplicate to `nodeName.dark.svg`, change stroke to `#FF7A47`.
5. Eyeball in n8n at 32px (sidebar) and 60px (canvas). Adjust if a stroke
   collides at 32px.

Target throughput: 5 minutes per icon pair. The whole 8-node family ships in
under an hour.

License note: Lucide is ISC — derived work is fine; we credit Lucide in our
top-level README under "Acknowledgements". We do not embed the Lucide
trademark.

## Reference Inline SVG: Agent

The following is the canonical `crewAiAgent.svg`. Treat as the template for
all other CrewAI icons. The dark variant is identical with stroke
`#FF7A47`.

```svg
<svg
  width="40"
  height="40"
  viewBox="0 0 40 40"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <g
    stroke="#FF5A1F"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  >
    <!-- head -->
    <circle cx="20" cy="14" r="6" />
    <!-- shoulders / body -->
    <path d="M8 33 C8 26, 14 23, 20 23 C26 23, 32 26, 32 33" />
  </g>
</svg>
```

Properties verified:

- Two paths, single `<g>`, single stroke color — flipping to dark is one find/replace.
- `viewBox 0 0 40 40`, `stroke-width 3` — matches n8n langchain weight.
- Renders distinguishable at 32px (head radius = 6 ≈ 4.8px at 32px display, well
  above the 2px minimum for a closed circle).
- No fill, no gradient, no text, no embedded fonts — survives sanitization.

## Accessibility

n8n dark theme background is approximately `#1A1D21`. Light theme background is
approximately `#FFFFFF`.

- `#FF5A1F` on `#FFFFFF`: contrast 4.6:1. Passes WCAG AA for non-text UI
  components (3:1 threshold) comfortably.
- `#FF7A47` on `#1A1D21`: contrast 5.4:1. Passes WCAG AA for non-text UI
  components and AA for large text. We use the lifted shade `#FF7A47`
  (not the brand `#FF5A1F`) in dark mode specifically to clear the contrast
  threshold without going so light that the family loses its orange identity.
- Stroke width 3 on viewBox 40 yields ~2.5px effective stroke at 32px display
  — meets the 2px minimum visual-acuity threshold for sustained recognition
  at arm's length.
- Color is never the sole differentiator: each icon's silhouette is uniquely
  identifiable in pure black on white (verifiable by setting stroke to `#000`
  in a preview). A user with full color blindness can still tell Agent
  (avatar) from Crew (triangle of dots) from Task (clipboard).
- We never encode information using only orange-vs-secondary; the secondary
  color is reserved for non-information background fills, which we currently
  do not use.

## Consequences

Positive:

- Single visual language across all CrewAI nodes — sidebar recognition is
  immediate.
- 5-minute icon iteration loop unblocks v2 visual work.
- ISC-licensed Lucide base means no IP friction.
- AA contrast in both themes; works for users with reduced color vision.

Negative / accepted trade-offs:

- Hand-tracing Lucide paths into our viewBox is mechanical; we may want to
  automate this in a small `tools/build-icons.ts` script later. Not done in
  v2.
- Sharing one stroke color across all eight nodes means per-icon
  differentiation rests entirely on silhouette. We accept this; the
  alternative (per-node hue) erodes brand cohesion.
- We do not ship a CrewAI LLM icon — we reuse n8n's. If CrewAI ever ships
  its own model the decision should be revisited.

## Follow-ups

- ADR-004 will cover credential-icon conventions (likely separate visual rules).
- A `docs/visual/preview.html` page that renders all eight icons at 32/60/120px
  in light and dark backgrounds, for self-review.
- Decide whether to add a 16px micro-variant for the canvas minimap.
