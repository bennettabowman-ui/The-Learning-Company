# Evaluation Protocol

## Research Question

Does misconception-first Socratic repair improve delayed transfer performance compared with standard explanation-based learning?

## Conditions

### Control

Learners receive standard explanation or normal training material, then complete the same immediate and delayed transfer assessments.

### Experimental

Learners complete diagnostic, misconception detection, Socratic repair, immediate transfer, and delayed retention probe.

## Primary Metric

Delayed transfer score.

## Secondary Metrics

- Immediate transfer score.
- High-confidence misconception reduction.
- Explanation quality.
- Confidence calibration.
- Retention score.
- Time to transfer-level mastery.
- Learner satisfaction.
- Manager-rated readiness, if available.

## Minimum Pilot Design

- Randomly assign learners to control or experimental condition.
- Use identical diagnostic, immediate transfer, and delayed transfer items.
- Schedule delayed probes at 24 hours for fast MVP cycles. Add 3-day and 7-day probes when pilot volume allows.
- Blind-score a sample of open-ended responses with an expert to calibrate AI scoring.
- Compare condition means on delayed transfer score and report confidence intervals.

## Threats to Validity

- Seed domain may be too easy for experienced learners.
- Learners may use outside materials between sessions.
- AI scoring may drift if prompts or models change.
- Control explanations must be strong enough to avoid straw-manning normal training.

## Exported Analysis Fields

- user id and condition
- concept id
- item id
- session type
- response text
- confidence rating
- AI score
- detected misconceptions
- evidence event type and value
- transfer score
- retention score
- timestamps
