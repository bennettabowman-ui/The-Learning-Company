import assert from "node:assert/strict";
import test from "node:test";
import { expertOutcomeScore, isPrimaryRetentionCandidate, meanOrNull } from "./outcomes";

test("meanOrNull preserves valid zero scores", () => {
  assert.equal(meanOrNull([0, 4, null, undefined]), 2);
  assert.equal(meanOrNull([0]), 0);
  assert.equal(meanOrNull([null, undefined]), null);
});

test("expertOutcomeScore treats zero as a real expert score", () => {
  assert.equal(
    expertOutcomeScore({
      expert_transfer_score: 0,
      expert_explanation_quality_score: 5
    }),
    0
  );
  assert.equal(
    expertOutcomeScore({
      expert_transfer_score: null,
      expert_explanation_quality_score: 3
    }),
    3
  );
});

test("primary retention candidates exclude simulated and early completions", () => {
  assert.equal(isPrimaryRetentionCandidate({ score: 0, simulated: false, completed_early: false }), true);
  assert.equal(isPrimaryRetentionCandidate({ score: 4, simulated: true, completed_early: false }), false);
  assert.equal(isPrimaryRetentionCandidate({ score: 4, simulated: false, completed_early: true }), false);
  assert.equal(isPrimaryRetentionCandidate({ score: null, simulated: false, completed_early: false }), false);
});
