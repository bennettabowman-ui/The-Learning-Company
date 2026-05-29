# MFL Engine

Misconception-First Learning Engine is a narrow MVP for testing whether diagnostic misconception detection plus Socratic repair improves delayed transfer performance in technical onboarding.

Default domain: API authentication and permissions for B2B SaaS sales engineers.

## Run Locally

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The prototype uses SQLite locally through Prisma. The schema is designed to move to Postgres by changing the Prisma datasource provider and `DATABASE_URL`.

`npm run db:push` attempts Prisma `db push` first and falls back to a local SQLite initializer if the Prisma schema engine is unavailable on the machine.

## AI Configuration

Set `OPENAI_API_KEY` in `.env` to enable real model-backed diagnostic scoring, misconception detection, transfer scoring, retention scoring, and Socratic repair sequence generation. `OPENAI_MODEL` defaults to `gpt-5.4-mini`.

When `OPENAI_API_KEY` is unset or a model call fails, the app records `deterministic_fallback` as the scoring provider and uses the local fallback scorer.
Scoring provenance is stored on each diagnostic response, transfer attempt, and retention probe row so fallback-scored artifacts can be filtered during analysis.

## What Is Included

- Domain setup inputs for the default domain.
- Learner diagnostic with required 1-5 confidence ratings.
- Misconception detection and confidence-weighted error scoring.
- Socratic repair capture flow.
- Immediate transfer challenge.
- Simulated delayed retention probe.
- Learner mastery dashboard.
- Research dashboard with condition comparison and CSV export.
- Blind expert calibration queue with agreement metrics for validating AI scores.
- Balanced random assignment for new pilot learners when no condition is manually selected.
- Pilot Brief intro screen and pilot packet for running the first human study.
- AI prompt templates and deterministic fallback scoring.

## Documents

- [Product requirements](docs/PRD.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [API routes](docs/API_ROUTES.md)
- [Evaluation protocol](docs/EVALUATION_PROTOCOL.md)
- [Pilot packet](docs/PILOT_PACKET.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
