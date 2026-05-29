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
- Use the expert calibration harness to record blind scores before treating AI scores as defensible outcome measures.
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
- expert reviewer id
- expert explanation quality score
- expert transfer score
- expert misconception labels
- model-vs-expert agreement metrics

## AI Scoring Calibration

The research dashboard includes a blind expert review queue. Experts see the prompt, concept, rubric context, and learner response, but not learner identity, condition, AI score, or AI feedback.

Agreement metrics:

- Continuous scores: Pearson correlation, Spearman correlation, mean absolute error, and AI-minus-expert bias.
- Ordinal rubric scores: quadratic weighted kappa over rounded 0-5 scores.
- Misconception labels: precision, recall, and F1 against expert-selected labels.

For early pilots, delayed transfer should be reported with expert blind scores as the primary defensible outcome. AI scores should be treated as scalable proxy measures until agreement reaches an acceptable threshold.
