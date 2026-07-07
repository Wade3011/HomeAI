# HomeAI — AWS Services Checklist

This document lists every AWS service and resource required for HomeAI, how they connect, and when to provision them (MVP vs later).

## Architecture summary

```
Browser (frontend/)
    → Amazon Cognito (sign-in via NextAuth)
    → Next.js BFF (/api/*)
    → API Gateway REST API
        → AWS Lambda
            → Amazon DynamoDB
            → External APIs (BuildCalculator, retailer APIs later)
    → Amazon S3 + CloudFront (3D assets, phase 5)
```

Amplify Gen 2 in `backend/` provisions and wires most AWS resources. Amplify Hosting deploys `frontend/`.

---

## Services by phase

### Phase 1 — MVP foundation (create first)

| AWS service | Resource name / purpose | Created by | Notes |
|-------------|-------------------------|------------|-------|
| **AWS Amplify** | Gen 2 app + Hosting | `backend/` + `frontend/amplify.yml` | Hosting builds `frontend/`; backend sandbox from `backend/` |
| **Amazon Cognito** | User Pool + App Client | `backend/amplify/auth/resource.ts` | Email login; JWT for API Gateway |
| **API Gateway** | REST API `homeai-api` | `backend/amplify/backend.ts` | Single base URL |
| **API Gateway** | Cognito User Pool authorizer | `backend/amplify/backend.ts` | Validates JWT on protected routes |
| **AWS Lambda** | `homeaiApi` | `backend/amplify/functions/homeaiApi/` | Routes all REST paths (split per domain later) |
| **Amazon DynamoDB** | `UserProfiles`, `Projects`, `Rooms`, `Placements`, `CatalogItems`, `EstimateCache` | CDK in `backend.ts` | See data model in README |
| **IAM** | Lambda execution roles | Auto | DynamoDB + CloudWatch |
| **CloudWatch Logs** | Per Lambda | Auto | — |

### Phase 3 — Pricing

| AWS service | Resource | Notes |
|-------------|----------|-------|
| **Lambda** | `BUILD_CALCULATOR_BASE_URL` env | External estimate API |
| **DynamoDB** | `EstimateCache` with TTL | Cache pricing responses |

### Phase 5 — Later

| AWS service | Resource | Notes |
|-------------|----------|-------|
| **S3 + CloudFront** | `homeai-assets` | GLB models, thumbnails |
| **WAF** | On API Gateway | Optional rate limiting |

### Not used in v1

AppSync, RDS, ElastiCache, ECS/EKS.

---

## API Gateway routes

| Method | Path | Handler |
|--------|------|---------|
| GET/POST | `/projects` | `homeaiApi` |
| GET/PUT/DELETE | `/projects/{id}` | `homeaiApi` |
| GET/POST | `/projects/{id}/rooms` | `homeaiApi` |
| GET/PUT/DELETE | `/rooms/{id}` | `homeaiApi` |
| GET/PUT | `/rooms/{id}/placements` | `homeaiApi` |
| GET | `/catalog`, `/catalog/{id}` | `homeaiApi` |
| POST | `/pricing/estimate`, `/pricing/estimate-room` | `homeaiApi` |

---

## Environment variables

### Backend Lambdas

| Variable | Purpose |
|----------|---------|
| `TABLE_*` | DynamoDB table names |
| `USER_POOL_ID` | Owner checks (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|----------|---------|
| `API_ENDPOINT` | API Gateway base URL (BFF only) |
| `API_KEY` | Optional API Gateway key |
| `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `COGNITO_ISSUER` | NextAuth |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Session |

Never expose third-party API keys in the frontend.

---

## Deployment checklist

- [ ] AWS account with billing alerts
- [ ] `cd backend && npm install && npx ampx sandbox`
- [ ] Copy sandbox outputs to `frontend/.env.local`
- [ ] `cd frontend && npm install && npm run dev`
- [ ] `npm run seed:catalog` from backend (after tables exist)
- [ ] Connect Amplify Hosting to repo with app root `frontend`
