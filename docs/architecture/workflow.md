# Repository Workflow and Deployment Boundaries

## Canonical Paths

- Canonical repository root: `set-up-the-complete-project-architecture`
- Web app (Vercel target): `apps/web`
- API app: `apps/api`
- Shared package area: `packages/*`

Only code under the canonical repository root is part of source control and deployment.

## Claude and Codex Usage

Use both agents against the same Git repository, but keep branch/worktree usage explicit:

1. Create feature branches from `main`.
2. Optional: create a Claude worktree for isolated edits.
3. Merge feature branches back into `main`.
4. Push from the canonical repository branch that Vercel tracks.

Worktree folders such as `.claude/worktrees/*` are local developer workspaces. They must not be configured as deployment roots.

## Safe Daily Commands

From repository root:

```bash
npm install
npm run dev
npm run build
```

For API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
uvicorn apps.api.app.main:app --reload
```

## Vercel Guardrails

- Project repository: this GitHub repository
- Root Directory: `apps/web`
- Build Command: `npm run build`
- Install Command: `npm install`

If deployment breaks after local folder changes, first validate that Vercel still points to `apps/web` and not to any local worktree path.
