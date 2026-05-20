# Local n8n stack for visual feedback

```bash
pnpm n8n:up      # start
pnpm n8n:logs    # tail
pnpm n8n:down    # stop
```

Open http://localhost:5678. No user setup — auth is disabled.

The `packages/nodes-crewai/dist/` directory is bind-mounted read-only into the
container's custom-extensions path. Edits land after the next n8n restart.
`pnpm dev:visual` watches the source and triggers the restart automatically.

Reset SQLite + workflow drafts:

```bash
docker compose -f docker/n8n/docker-compose.yml down -v
```
