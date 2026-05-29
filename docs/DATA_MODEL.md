# Data Model

The schema is centered on evidence of understanding, not content consumption.

## Core Entities

- `User`: admin or learner, with control/experimental assignment.
- `Domain`: commercially valuable learning domain with source grounding fields.
- `Concept`: target concept and prerequisite links.
- `Misconception`: known faulty mental model tied to a concept.
- `AssessmentItem`: diagnostic, transfer, or retention item.
- `LearnerConceptState`: current evidence-based estimate of concept mastery.
- `LearnerMisconceptionState`: current estimate of a misconception held by a learner.
- `Session`: diagnostic, repair, transfer, retention, or control session.
- `LearnerResponse`: diagnostic response with confidence and AI scoring.
- `Intervention`: Socratic repair or standard explanation event.
- `TransferAttempt`: scored novel scenario attempt.
- `RetentionProbe`: scheduled delayed probe and result.
- `EvidenceEvent`: append-only measurement event.

## Metric Fields

`LearnerConceptState` stores:

- recall strength
- explanation quality
- application accuracy
- transfer score
- confidence calibration
- misconception probability
- retention risk
- mastery level

`LearnerMisconceptionState` stores:

- probability
- confidence-weighted error score
- evidence count
- last detected timestamp
- repaired timestamp
- status

## Schema Source

The executable schema is in `prisma/schema.prisma`.
