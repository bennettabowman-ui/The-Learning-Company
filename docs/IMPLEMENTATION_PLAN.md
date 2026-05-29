# Implementation Plan

## Phase 0: Working Scaffold

- Create Next.js app shell.
- Add Prisma schema and local SQLite datasource.
- Seed default API auth domain, users, concepts, misconceptions, assessment items, and transfer scenario.
- Implement API routes for evidence capture and dashboard aggregation.
- Implement deterministic scoring fallback.
- Implement core screens.

## Phase 1: Expert-Validated Domain Authoring

- Add source-material management.
- Add validation status on generated items.
- Add expert review workflow for AI-generated diagnostics, transfer scenarios, and rubrics.

## Phase 2: Model-Backed AI

- Add provider wrapper behind the existing scoring interface.
- Enforce structured JSON outputs.
- Add trace logging for prompt, model, output, and validation flags.
- Run expert calibration against scored response samples.

## Phase 3: Pilot Readiness

- Move database to Postgres.
- Add SSO or magic-link authentication.
- Add organization scoping.
- Add CSV export controls.
- Add privacy and data retention settings.

## Phase 4: Evaluation

- Run control vs experimental pilot.
- Analyze delayed transfer score, high-confidence misconception reduction, explanation quality, and confidence calibration.
- Identify which misconceptions and interventions drive transfer gains.
