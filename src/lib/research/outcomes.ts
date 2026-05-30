export type ExpertScoredArtifact = {
  expert_transfer_score: number | null;
  expert_explanation_quality_score: number | null;
};

export type RetentionOutcomeArtifact = {
  score: number | null;
  simulated: boolean;
  completed_early: boolean;
};

export function numericValues(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function meanOrNull(values: Array<number | null | undefined>) {
  const numbers = numericValues(values);
  if (numbers.length === 0) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

export function meanOrZero(values: Array<number | null | undefined>) {
  return meanOrNull(values) ?? 0;
}

export function expertOutcomeScore(review: ExpertScoredArtifact) {
  return review.expert_transfer_score ?? review.expert_explanation_quality_score ?? null;
}

export function isPrimaryRetentionCandidate(probe: RetentionOutcomeArtifact) {
  return probe.score !== null && !probe.simulated && !probe.completed_early;
}
