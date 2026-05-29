# API Routes

All routes return JSON unless noted.

## Bootstrap

`GET /api/bootstrap`

Returns users, active domain, concepts, misconceptions, assessment items, recent sessions, learner state, and research summary.

`POST /api/users`

Creates an admin or learner. Learners are balanced across control and experimental conditions when `experimental_condition` is omitted; admins can still explicitly set a condition.

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
Stores row-level scoring provenance so fallback rows can be treated as missing or analyzed separately.

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

`GET /api/expert-reviews?domainId=...&reviewerId=...`

Returns a randomized blind expert review queue plus recent reviews. Queue items hide learner identity, condition, AI score, and AI feedback from the review UI.

`POST /api/expert-reviews`

Creates or updates a blind expert review for a diagnostic response, transfer attempt, or retention probe, then logs an `expert_review_submitted` evidence event.

`GET /api/calibration?domainId=...`

Returns model-vs-expert agreement metrics: reviewed pairs, MAE, bias, Pearson/Spearman correlation, quadratic weighted kappa, and misconception precision/recall/F1.
Correlation and kappa are withheld until the scored-pair count reaches the configured minimum n.

## Export

`GET /api/export?domainId=...`

Returns CSV containing evidence events, responses, transfer attempts, retention probes, expert reviews, and row-level scoring provenance.
