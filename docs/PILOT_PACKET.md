# Pilot Packet

This packet is the operational support for moving MFL Engine from built apparatus to first data.

## Pilot Objective

Run one learner through the full experimental loop, then have an expert blind-score the learner artifacts. The goal is not to prove efficacy yet. The goal is to confirm that the study machinery produces trustworthy, analyzable rows.

Primary proof from the first run:

- learner assignment is recorded
- diagnostic, repair, transfer, and retention events are captured
- every scored row has scoring provenance
- expert blind review is attached to the correct artifact
- export contains enough information to reproduce the analysis

## Roles

- Operator: creates the learner, monitors the session, exports data, and verifies row completeness.
- Learner: completes diagnostic, repair or control training, immediate transfer, and delayed probe.
- Expert reviewer: blind-scores learner responses without seeing identity, condition, AI score, or AI feedback.

The same person can act as operator and expert for an internal smoke pilot, but not for a serious customer-facing validation run.

## Participant Instructions

Use this script before the learner starts.

> You are testing a learning prototype for technical onboarding. The system will ask you to reason through API authentication, permissions, and integration scenarios. Please answer in your own words. Do not use outside materials during the session. After each answer, rate your confidence from 1 to 5. The goal is not to catch you out; the goal is to understand how your mental model changes and whether it transfers to new cases.

Important constraints:

- Do not enter real customer data, real access tokens, API secrets, credentials, or confidential account details.
- Write enough reasoning for a reviewer to understand why you chose your answer.
- Treat confidence as a probability judgment, not a performance score.
- If unsure, say what you are uncertain about rather than guessing silently.

## Operator Checklist

Before the session:

- Confirm `OPENAI_API_KEY` is configured if testing model-backed scoring.
- Run `npm run db:seed` for a clean local pilot state if needed.
- Create the learner from the Research screen using `AUTO BALANCED`.
- Record the learner name, condition, start time, and operator.
- Confirm the learner can see the Diagnostic screen.

During the immediate session:

- Learner completes at least three diagnostic items with confidence ratings.
- Experimental learners complete Socratic repair for the highest-priority misconception.
- Control learners complete the standard explanation path.
- Learner completes one immediate transfer challenge.
- Operator confirms a retention probe was scheduled.

After the immediate session:

- Open the Research screen and confirm condition counts updated.
- Confirm the expert review queue has at least one item.
- Export CSV and verify `scoring_provider`, `scoring_model`, `requires_expert_validation`, and `uncertainty_flags` are present.
- Mark deterministic fallback rows as exploratory only.

Delayed session:

- At T+24 hours, learner completes the delayed retention probe without reviewing prior material.
- Expert blind-scores diagnostic, transfer, and retention artifacts.
- Export CSV again after expert review.

## Expert Review Instructions

The expert should score only the response shown in the blind queue. Do not infer from learner identity, condition, or AI output.

Score explanation quality from 0 to 5:

- 0: no meaningful explanation
- 1: memorized phrase only
- 2: partial explanation with missing mechanism
- 3: mostly correct but brittle
- 4: correct causal explanation
- 5: clear, causal, transferable explanation with boundaries and counterexamples

Score transfer from 0 to 5:

- 0: cannot apply
- 1: recognizes surface similarity only
- 2: applies with major errors
- 3: applies in familiar variation
- 4: applies correctly in novel scenario
- 5: adapts flexibly and explains limits

For misconception labels:

- Select a misconception only when the response gives positive evidence for that faulty mental model.
- Do not select a label merely because the learner omitted a detail.
- Use notes for ambiguous cases or when the item is underspecified.

## First Data Point Acceptance Criteria

The first pilot run is successful when:

- at least one learner has completed diagnostic and immediate transfer
- at least one delayed retention probe is completed
- at least three learner artifacts are blind-reviewed by an expert
- export rows can be joined by user, condition, concept, item or target id, and timestamp
- calibration endpoint reports review counts and descriptive error metrics
- fallback-scored rows are visible and filterable

## Analysis Checklist

For an internal n=1 smoke pilot:

- Verify row completeness, not efficacy.
- Check that scoring provenance matches the intended model path.
- Compare AI and expert scores for obvious disagreement.
- Inspect expert notes for ambiguous prompts or rubrics.
- Decide whether item wording needs repair before adding more learners.

For the first small balanced pilot:

- Target 6-10 learners before making strong claims.
- Preserve balanced assignment unless a learner must be manually assigned.
- Treat expert blind scores as the primary defensible outcome.
- Use delayed transfer as the primary metric.
- Exclude deterministic fallback rows from confirmatory AI-validity analysis.
- Report sample size beside every calibration metric.

## Stop Conditions

Pause the pilot before adding more learners if:

- model outputs repeatedly require expert validation for grounded domain facts
- deterministic fallback appears in rows expected to be AI-scored
- learners misunderstand task instructions rather than the domain concept
- expert reviewers cannot apply the rubric consistently
- transfer prompts are too close to diagnostic examples

## First Follow-Up Decision

After the first completed learner and expert review, make one of three decisions:

- Continue: data rows are complete and the learner flow is understandable.
- Fix prompts: data rows are complete but task wording is confusing.
- Fix instrumentation: data rows are incomplete, unjoinable, or missing provenance.
