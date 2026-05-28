# Analytics Platform Architecture

Scalable starter architecture for a Next.js 14 analytics platform with a FastAPI/Postgres backend skeleton.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- ShadCN-style component system
- Recharts
- TanStack Table
- FastAPI
- PostgreSQL

## Apps

- `apps/web`: Frontend application and dashboard shell.
- `apps/api`: FastAPI service skeleton and database architecture.
- `packages/shared`: Reserved for shared contracts, constants, and generated types.
- `docs/architecture`: Project and routing documentation.

## Local Setup

```bash
npm install
npm run dev
```

## Deployment Source of Truth

- Canonical repository root: this folder (`set-up-the-complete-project-architecture`).
- Deployable frontend app path: `apps/web`.
- Deployable API service path: `apps/api`.
- Agent worktree folders (for example `.claude/worktrees/*`) are local development workspaces, not deployment roots.

### Vercel (recommended for web)

Set the Vercel project to this GitHub repository and configure:

- Framework preset: `Next.js`
- Root Directory: `apps/web`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output: default Next.js output

If the project was previously connected to a worktree path, reconnect it to the repository root and then set `apps/web` as the Root Directory in Vercel settings.

For the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
uvicorn apps.api.app.main:app --reload
```

## Architecture Notes

This scaffold intentionally avoids business logic. It focuses on route organization, reusable layout primitives, theming, chart/table composition, and backend module boundaries.
