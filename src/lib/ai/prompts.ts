export const tutorSystemPrompt = `
You are the Socratic tutor inside Misconception-First Learning Engine.

Rules:
- Do not simply give the answer first.
- Ask one question at a time.
- Keep responses concise.
- Make the learner reason before explaining.
- Detect whether the learner is guessing.
- Ask for confidence when needed.
- Use counterexamples when the learner has a misconception.
- Use analogies only if they clarify the structure.
- Always test whether the analogy misleads.
- Push toward transfer, not memorization.
- End each repair loop with the learner restating the idea in their own words.
- End each repair loop with a novel application.

Interaction pattern:
1. Prediction: "Before I explain, what do you think will happen in this scenario?"
2. Reasoning: "Why do you think that?"
3. Contrast: "Now compare it with this similar case. What changed?"
4. Contradiction: "Your answer predicts X, but in this case Y happens. What assumption might be wrong?"
5. Repair: "Here is the key distinction..."
6. Re-explanation: "Explain the concept again in your own words."
7. Application: "Now apply it to this new case."
8. Confidence: "How confident are you, from 1 to 5?"
9. Transfer: "Here is a less familiar scenario. What would you do?"
`.trim();

export const promptTemplates = {
  diagnosticItemGeneration: `
Given a concept, allowed source material, known misconceptions, examples, counterexamples, and near-miss cases, generate diagnostic questions that reveal whether the learner understands the concept or holds a misconception.

Return JSON:
{
  "items": [
    {
      "item_type": "explain | prediction | choose_best_action | identify_invalid_example | compare_cases",
      "prompt": "...",
      "correct_answer": "...",
      "target_misconceptions": ["..."],
      "rubric": "...",
      "uncertainty_flags": ["..."],
      "requires_expert_validation": true
    }
  ]
}

Grounding rule: use only the supplied source material for domain facts. If the source does not support a fact, flag it for expert validation.
`.trim(),

  misconceptionDetection: `
Given learner responses, confidence ratings, scoring rubrics, and known misconceptions, identify likely misconceptions and assign probabilities.

Prioritize high-confidence wrong answers over low-confidence gaps.

Return JSON:
{
  "concept_understanding": [{"concept_id": "...", "score": 0}],
  "likely_misconceptions": [{"misconception_id": "...", "probability": 0, "evidence": "..."}],
  "high_confidence_errors": [{"item_id": "...", "confidence": 0, "reason": "..."}],
  "prerequisite_gaps": [{"concept_id": "...", "evidence": "..."}],
  "repair_priority": [{"misconception_id": "...", "priority": 0, "reason": "..."}],
  "uncertainty_flags": []
}
`.trim(),

  socraticRepair: `
Given a target misconception, learner evidence, source material, contrastive cases, and expert correction, generate a Socratic repair sequence.

Use prediction, reasoning, contrast, contradiction, concise repair, re-explanation, application, confidence, and transfer.

Return JSON:
{
  "steps": [
    {"step_type": "prediction", "prompt": "...", "success_criteria": "..."},
    {"step_type": "reasoning", "prompt": "...", "success_criteria": "..."},
    {"step_type": "contrast", "prompt": "...", "success_criteria": "..."},
    {"step_type": "contradiction", "prompt": "...", "success_criteria": "..."},
    {"step_type": "repair", "prompt": "...", "success_criteria": "..."},
    {"step_type": "re_explanation", "prompt": "...", "success_criteria": "..."},
    {"step_type": "application", "prompt": "...", "success_criteria": "..."},
    {"step_type": "confidence", "prompt": "How confident are you, from 1 to 5?", "success_criteria": "Provides calibrated confidence"},
    {"step_type": "transfer", "prompt": "...", "success_criteria": "..."}
  ],
  "uncertainty_flags": [],
  "requires_expert_validation": false
}
`.trim(),

  transferScenarioGeneration: `
Generate novel scenarios that test the same underlying concept in a different surface context.

Return JSON:
{
  "scenarios": [
    {
      "prompt": "...",
      "concept_id": "...",
      "transfer_distance": 1,
      "rubric": "...",
      "prior_misconception_to_avoid": "...",
      "uncertainty_flags": []
    }
  ]
}
`.trim(),

  rubricBasedScoring: `
Score an open-ended learner response using the explicit rubric.

Return JSON:
{
  "score": 0,
  "rationale": "...",
  "misconception_signals": [{"misconception_id": "...", "signal": "...", "strength": 0}],
  "confidence_calibration": 0,
  "recommended_next_step": "...",
  "uncertainty_flags": []
}
`.trim(),

  delayedProbeGeneration: `
Generate delayed retention and transfer probes that test recall, explanation, application, transfer, and misconception recurrence.

Return JSON:
{
  "probes": [
    {
      "scheduled_delay": "24h | 3d | 7d",
      "prompt": "...",
      "concept_id": "...",
      "targets_misconception_recurrence": true,
      "rubric": "..."
    }
  ]
}
`.trim()
};
