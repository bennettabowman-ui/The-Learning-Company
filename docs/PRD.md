# Product Requirements Document

## Product

**Misconception-First Learning Engine** or **MFL Engine**.

The MVP is a focused experimental learning system for technical onboarding. It tests whether an AI-assisted loop can diagnose hidden misconceptions, repair them through adaptive Socratic practice, and improve delayed transfer performance in a commercially valuable domain.

Default domain: API authentication and permissions for a B2B SaaS product.

Target learner: new sales engineers, solutions engineers, customer success engineers, and technical support specialists.

## Core Hypothesis

An AI system can diagnose a learner's hidden misconceptions, repair those misconceptions through adaptive Socratic practice, and improve delayed transfer performance compared with standard explanation-based learning.

## Business Use Case

Reduce time-to-proficiency for complex technical onboarding by finding high-confidence wrong mental models before the learner handles real customer scenarios.

## Primary Outcome

Delayed transfer score on novel customer-like scenarios.

## Secondary Outcomes

- High-confidence misconception reduction.
- Explanation quality.
- Application accuracy.
- Confidence calibration.
- Time to transfer-level mastery.
- Delayed retention durability.

## MVP Scope

The product supports one admin and multiple learners. It contains only the modules required to collect evidence of understanding and compare a control condition against an experimental condition.

### Modules

1. Domain Setup Module
2. Diagnostic Module
3. Misconception Detection Module
4. Socratic Repair Module
5. Transfer Challenge Module
6. Delayed Retention Module
7. Learner Mastery Dashboard
8. Research/Evaluation Dashboard

## Non-Goals

- Course marketplace.
- Gamification, streaks, avatars, or social features.
- Generic LMS features.
- Video hosting.
- Certificates.
- Complex admin permissions.
- Broad subject coverage.
- Mobile-first experience.

## Learner Experience

1. Learner logs in through a local prototype identity selector.
2. Learner completes a diagnostic with open-ended, prediction, action, invalid-example, and compare-cases items.
3. Learner provides a confidence rating from 1 to 5 after every answer.
4. System estimates concept understanding, likely misconceptions, confidence-weighted errors, prerequisite gaps, and repair priority.
5. Experimental learners complete a structured Socratic repair sequence.
6. Control learners receive standard explanation material before transfer.
7. Learner completes a novel transfer scenario scored by rubric.
8. System schedules a delayed probe for 24 hours, 3 days, or 7 days later.
9. Learner views mastery, likely misconceptions, transfer readiness, retention risk, and next recommended practice.

## Admin Experience

1. Create or edit a domain.
2. Add concepts.
3. Add misconceptions.
4. Add diagnostic questions.
5. Add transfer scenarios.
6. View cohort-level learning evidence and export CSV.

## Research Experience

1. Assign learners to control or experimental condition.
2. Track diagnostic, post-test, and delayed-test evidence.
3. Compare delayed transfer performance by condition.
4. Inspect high-confidence error rate, repair success, learning velocity, retention durability, and intervention effectiveness.
5. Export learner responses, transfer attempts, retention probes, and evidence events.

## Measurement Requirements

Every meaningful learner action creates an `EvidenceEvent`.

Required metrics:

- Misconception probability.
- Confidence-weighted error score.
- Explanation quality score.
- Transfer score.
- Misconception repair score.
- Retention durability.
- Learning velocity.
- Confidence calibration.

## Grounding and Expert Validation

Domain content must be grounded in allowed source material when source material is present. AI outputs should return structured JSON and include `uncertainty_flags` whenever evidence is insufficient. Any generated domain fact that is not present in source material must be marked for expert validation.

## Acceptance Criteria

- Admin can edit the seeded domain and add concepts, misconceptions, and items.
- Learner can answer diagnostic questions with confidence ratings.
- System estimates likely misconceptions and prioritizes high-confidence errors.
- Learner can complete Socratic repair and immediate transfer.
- System can create and complete a delayed retention probe.
- Learner mastery dashboard reflects concept and misconception state.
- Research dashboard compares control and experimental learners.
- CSV export includes evidence useful for offline analysis.
