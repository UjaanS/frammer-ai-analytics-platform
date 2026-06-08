# Frammer Analytics Platform

Analytics and BI platform for **Frammer**, a video-processing service that turns
original uploaded videos into derivative content (Reels, Shorts, Chapters, My Key
Moments, viral clips, clip-cuts) and publishes them to downstream platforms.

This repository is the analytics layer on top of that product: it ingests a
Frammer database snapshot into a star-schema warehouse, computes a catalog of
operational KPIs, and serves them through a Next.js dashboard with a
natural-language query assistant.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- ShadCN-style component system
- Recharts
- TanStack Table
- FastAPI
- PostgreSQL + SQLAlchemy + Alembic

## Apps

- `apps/web`: Frontend dashboard. Dashboard pages (executive summary, content
  analytics, publishing funnel, channel/user analytics, video explorer, data
  quality, usage trends, reports), the warehouse explorer, and the
  natural-language query (NLQ) assistant.
- `apps/api`: FastAPI service. Star-schema warehouse models, the snapshot
  ingestion pipeline, the semantic metrics/KPI layer, and the warehouse query
  service.
- `packages/shared`: Shared contracts, constants, and generated types.
- `docs/`: Architecture notes, KPI parity audits, and migration phase docs.

## Local Setup

```bash
npm install
npm run dev
```

The API has its own dev and test scripts:

```bash
npm run api:dev    # uvicorn with reload
npm run api:test   # pytest
```

A local Postgres instance is provided via Docker Compose:

```bash
docker compose up -d
```

## Key Subsystems

- **Snapshot ingestion** (`apps/api/app/ingestion`): reads a `frammer.sql` dump,
  selectively projects safe columns into the warehouse, and tracks load runs and
  data-quality issues.
- **Semantic metrics** (`apps/api/app/services/semantic_metrics.py`): defines the
  KPI catalog. KPI aggregation can run in PostgreSQL or fall back to Python via
  the `USE_SQL_AGGREGATION` flag (see
  `docs/phase-1-sql-aggregation-pushdown.md`).
- **NLQ assistant** (`apps/web/lib/nlq`): translates plain-English requests into
  tool calls that update dashboard state (filters, widgets, comparisons).

## Deployment Source of Truth

- Canonical repository root: this folder (`frammer-ai-analytics-platform`).
- Deployable frontend app path: `apps/web`.
- Deployable API service path: `apps/api`.
- Agent worktree folders (for example `.claude/worktrees/*`) are local development
  workspaces, not deployment roots.

### Vercel (recommended for web)

Set the Vercel project to this GitHub repository and configure:

- Framework preset: `Next.js`
- Root Directory: `apps/web`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output: default Next.js output

If the project was previously connected to a worktree path, reconnect it to the
repository root and then set `apps/web` as the Root Directory in Vercel settings.

For the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
uvicorn apps.api.app.main:app --reload
```
