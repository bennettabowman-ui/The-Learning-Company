# API Routes

All routes return JSON unless noted.

## Bootstrap

`GET /api/bootstrap`

Returns users, active domain, concepts, misconceptions, assessment items, recent sessions, learner state, and research summary.

## Domain Setup

`POST /api/domain`

Creates or updates a domain.

`POST /api/concepts`

Adds a concept to a domain.

`POST /api/misconceptions`

Adds a misconception to a concept.

`POST /api/assessment-items`

Adds a diagnostic, transfer, or retention item.

## Learner Evidence

`POST /api/responses`

Captures a learner diagnostic response, requires confidence rating, scores the response, updates learner state, and creates evidence events.
Uses model-backed structured scoring when `OPENAI_API_KEY` is configured; otherwise records deterministic fallback scoring.

`POST /api/interventions`

Captures a Socratic repair or standard explanation intervention and updates misconception repair evidence.
The experimental path scores the learner's repair response and returns an adaptive next Socratic prompt when a model is configured.

`POST /api/transfer-attempts`

Scores a transfer attempt, updates concept state, and schedules a retention probe.

`POST /api/retention-probes`

Creates or completes a delayed retention probe.

`GET /api/repair-sequence?domainId=...&misconceptionId=...&userId=...`

Generates a Socratic repair sequence from the target misconception and recent learner evidence, with deterministic fallback when no model is configured.

## Dashboards

`GET /api/dashboard?userId=...&domainId=...`

Returns learner concept states, misconception states, next recommended practice, and recent evidence.

`GET /api/research?domainId=...`

Returns cohort metrics, condition comparison, misconception frequency, high-confidence error rate, transfer outcomes, and retention outcomes.

## Export

`GET /api/export?domainId=...`

Returns CSV containing evidence events, responses, transfer attempts, and retention probes.
