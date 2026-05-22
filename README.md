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

For the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
uvicorn apps.api.app.main:app --reload
```

## Architecture Notes

This scaffold intentionally avoids business logic. It focuses on route organization, reusable layout primitives, theming, chart/table composition, and backend module boundaries.
