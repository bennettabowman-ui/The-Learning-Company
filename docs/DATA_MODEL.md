# Data Model

The schema is centered on evidence of understanding, not content consumption.

## Core Entities

- `User`: admin or learner, with control/experimental assignment. Learners are assigned by the API with balanced randomization unless an admin explicitly chooses a condition.
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
- `ExpertReview`: blind human score for a diagnostic response, transfer attempt, or retention probe used to calibrate AI scoring.

`LearnerResponse`, `TransferAttempt`, and completed `RetentionProbe` rows store scoring provenance directly:

- scoring provider
- scoring model
- scoring error
- uncertainty flags
- requires expert validation

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

`ExpertReview` stores:

- blind review target type and id
- prompt and learner response shown to the expert
- AI score and AI misconception labels captured at review time
- expert explanation quality score
- expert transfer score
- expert misconception labels
- expert confidence calibration score
- reviewer notes

## Schema Source

The executable schema is in `prisma/schema.prisma`.
