# HomeAI

3D home customization planner (kitchen, bath, and more) with AWS backend and Next.js frontend.

## Repository structure

| Path | Description |
|------|-------------|
| [`frontend/`](frontend/) | Next.js 16 App Router, NextAuth, React Three Fiber planner |
| [`backend/`](backend/) | Amplify Gen 2 — Cognito, API Gateway, Lambda, DynamoDB |
| [`docs/AWS_SERVICES.md`](docs/AWS_SERVICES.md) | AWS resource checklist |

## Quick start

### 1. Backend (AWS sandbox)

```bash
cd backend
npm install
npx ampx sandbox
```

After deploy, note `amplify_outputs.json` values:

- `custom.API.endpoint` → `API_ENDPOINT` in frontend
- Auth user pool / client IDs → Cognito env vars

Seed catalog (replace table name from sandbox output or env):

```bash
TABLE_CATALOG=CatalogItems-XXXX npm run seed:catalog
```

### 2. Frontend (no auth — quick UI preview)

```bash
cd frontend
cp .env.example .env.local
# Or use the included dev defaults:
#   DEV_SKIP_AUTH=true
#   NEXT_PUBLIC_DEV_SKIP_AUTH=true
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Open demo planner** or go to `/projects` without signing in.

### 2b. Frontend (with Cognito + API Gateway)

Set `DEV_SKIP_AUTH=false` in `.env.local` and fill in `API_ENDPOINT`, Cognito, and `NEXTAUTH_*` from the backend sandbox.

### 3. Cognito hosted UI (for NextAuth)

In the Cognito app client, add callback URL:

- `http://localhost:3000/api/auth/callback/cognito`

Sign-out URL:

- `http://localhost:3000`

## Architecture

```
Browser → Next.js /api/* (BFF) → API Gateway → Lambda → DynamoDB
         NextAuth → Cognito
```

## Deploy

- **Backend:** `cd backend && npx ampx pipeline-deploy` (or connect branch in Amplify console)
- **Frontend:** Amplify Hosting with app root `frontend` (see `frontend/amplify.yml`)

## License

Private — all rights reserved.
