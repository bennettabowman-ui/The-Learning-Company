export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function confidenceWeightedError(scoreOutOfFive: number, confidenceRating: number) {
  const errorSeverity = clamp((5 - scoreOutOfFive) / 5);
  return Number((errorSeverity * confidenceRating).toFixed(2));
}

export function confidenceCalibration(scoreOutOfFive: number, confidenceRating: number) {
  const performance = clamp(scoreOutOfFive / 5);
  const confidence = clamp((confidenceRating - 1) / 4);
  return Number(Math.abs(confidence - performance).toFixed(2));
}

export function masteryLevel(params: {
  explanationQuality: number;
  applicationAccuracy: number;
  transferScore: number;
  misconceptionProbability: number;
}) {
  const average =
    (params.explanationQuality + params.applicationAccuracy + params.transferScore) / 3;

  if (params.misconceptionProbability >= 0.7) return "misconception-risk";
  if (average >= 4 && params.transferScore >= 4) return "transfer-ready";
  if (average >= 3) return "developing";
  if (average > 0) return "fragile";
  return "unassessed";
}

export function retentionRisk(transferScore: number, calibrationError: number, misconceptionProbability: number) {
  const lowTransferRisk = clamp((5 - transferScore) / 5);
  return Number(
    clamp(lowTransferRisk * 0.45 + calibrationError * 0.25 + misconceptionProbability * 0.3).toFixed(2)
  );
}

export function learningVelocity(masteryGain: number, activeLearningSeconds: number) {
  if (!activeLearningSeconds) return 0;
  return Number((masteryGain / (activeLearningSeconds / 60)).toFixed(3));
}
