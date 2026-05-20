# Visual Progress Tracker

Source of truth for the ralph loop. Each MVP node has one row; each gate is `✅` (passes both light + dark themes), `⚠️` (light only), `❌` (fail), `—` (n/a).

| Node | Palette @32px | Dark contrast | Connection points | displayName/desc | Properties panel | Last capture SHA | Notes |
|---|---|---|---|---|---|---|---|
| `crewAiCrew` | ✅ | ⚠️ | ✅ | ✅ | ✅ | f3a97e8 | inputs: Main+AiAgent+AiTask+AiLanguageModel; outputs Main; icon = triangle of dots renders |
| `crewAiAgent` | ✅ | ⚠️ | ✅ | ✅ | ✅ | f3a97e8 | output AiAgent; props role/goal/backstory; head-shoulders icon |
| `crewAiTask` | ✅ | ⚠️ | ✅ | ✅ | ✅ | f3a97e8 | output ai_task (cast); clipboard+check icon |
| `crewAiTool` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | (uncommitted) | output AiTool; props toolName/description/schema; wrench icon — needs full capture |

## Gates (per ADR-004)

1. **Palette @32px** — node visible in sidebar palette, icon recognizable at native sidebar size.
2. **Dark contrast** — icon stroke remains AA-readable against dark theme background (per ADR-003 palette).
3. **Connection points** — typed inputs/outputs appear on the correct sides; n8n renders the `ai_*` ports.
4. **displayName/desc** — title and description render without truncation in palette tooltip + canvas tile.
5. **Properties panel** — opens, all property labels visible, no missing-renderer warnings.

## Stop condition

Ralph loop halts when every row above has all five gates `✅` and `Last capture SHA == HEAD`. The Tool row is the last blocker.

## Capture invocation

```bash
pnpm n8n:up                 # ensure stack is running
pnpm visual:capture          # writes docs/screenshots/<node>/<theme>/*.png + manifest.json
```

## Known issues to chase

- Icon URL exposes container-absolute filesystem path (`/home/node/...`) — works but ugly; tracked for a later cleanup ADR.
- Dark theme toggle currently sets `data-theme` + class; n8n may need a different mechanism — only "⚠️" until verified visually that stroke color shifts.
- "Back to canvas" still races the panel; capture often shows panel overlaying canvas tile.
