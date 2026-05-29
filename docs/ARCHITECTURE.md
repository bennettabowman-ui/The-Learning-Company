# System Architecture

## MVP Stack

- **Frontend:** Next.js App Router with React.
- **Backend:** Next.js API routes.
- **Database:** Prisma ORM with SQLite for local MVP. Production target is Postgres.
- **Authentication:** local prototype login through seeded users.
- **AI layer:** prompt templates plus a reusable OpenAI Responses API wrapper. Model-backed structured scoring is used when `OPENAI_API_KEY` is configured; deterministic scoring is retained only as an offline fallback.
- **Analytics:** append-only `EvidenceEvent` records for every diagnostic, repair, transfer, and retention action.

## Runtime Components

### Web App

The app exposes one shell with mode-specific screens:

- Domain Setup
- Diagnostic
- Repair Lab
- Transfer
- Retention
- Learner Mastery
- Research

### API Layer

API routes handle:

- Domain CRUD-lite operations.
- Concept, misconception, and assessment item creation.
- Response capture.
- Misconception scoring.
- Intervention logging.
- Transfer scoring.
- Retention probe scheduling and scoring.
- Blind expert review queue and model-vs-expert calibration metrics.
- Balanced learner assignment to control or experimental conditions.
- Dashboard aggregation.
- CSV export.

### Data Layer

Prisma models track domain structure, learner responses, learner concept state, learner misconception state, interventions, transfer attempts, retention probes, expert reviews, and evidence events.

### AI Layer

The AI layer is intentionally thin:

- `src/lib/ai/prompts.ts` stores reusable prompt templates.
- `src/lib/ai/openai.ts` calls the OpenAI Responses API with structured JSON schemas.
- `src/lib/ai/evaluation.ts` maps model JSON into product metrics and falls back safely when the model is unavailable.
- `src/lib/ai/scoring.ts` provides deterministic local fallback scoring.

All scoring routes record `scoring_provider`, `scoring_model`, uncertainty flags, and expert-validation requirements on the scored artifact row and in `EvidenceEvent.metadata`.

## Grounding Flow

1. Admin enters allowed source material and expert explanations.
2. Prompt templates instruct the model to use only provided source material where available.
3. Model output includes uncertainty flags and expert validation requests.
4. Unvalidated generated facts should not be shown as authoritative domain content.

## Production Migration

To move from local MVP to enterprise pilot:

1. Change Prisma datasource from `sqlite` to `postgresql`.
2. Set `DATABASE_URL` to managed Postgres.
3. Add organization membership if multiple companies pilot the product.
4. Replace local login with SSO or magic-link auth.
5. Route AI calls through a server-side model provider wrapper.
6. Add audit logs for admin source-material edits.
