import { confidenceCalibration, confidenceWeightedError, clamp } from "@/lib/metrics";

type AssessmentLike = {
  id: string;
  prompt: string;
  correct_answer: string;
  item_type: string;
  target_misconceptions: unknown;
};

type MisconceptionLike = {
  id: string;
  name: string;
  description: string;
  typical_signals: unknown;
  example_wrong_answer: string;
  expert_correction: string;
};

export type DetectedMisconception = {
  misconception_id: string;
  name: string;
  probability: number;
  evidence: string;
};

export type ScoringResult = {
  score: number;
  explanationQuality: number;
  applicationAccuracy: number;
  confidenceCalibration: number;
  confidenceWeightedError: number;
  feedback: string;
  detectedMisconceptions: DetectedMisconception[];
  recommendedNextStep: string;
};

const stopWords = new Set([
  "the",
  "and",
  "or",
  "to",
  "a",
  "an",
  "of",
  "for",
  "is",
  "are",
  "can",
  "with",
  "that",
  "this",
  "it",
  "in",
  "on",
  "be",
  "by",
  "from",
  "as",
  "while"
]);

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function keywords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word))
    )
  );
}

function hasPhrase(text: string, phrase: string) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const normalizedPhrase = phrase.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (normalizedPhrase && cleaned.includes(normalizedPhrase)) return true;

  const significantWords = phrase
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .map((word) => word.replace(/[^a-z0-9-]/g, ""));

  return significantWords.length > 2 && significantWords.every((word) => cleaned.includes(word));
}

function lexicalScore(response: string, correctAnswer: string) {
  const responseLower = response.toLowerCase();
  const expected = keywords(correctAnswer);
  if (expected.length === 0) return response.trim().length > 20 ? 2 : 0;
  const matched = expected.filter((word) => responseLower.includes(word)).length;
  const matchRatio = matched / expected.length;
  const lengthBonus = response.trim().length > 80 ? 0.7 : response.trim().length > 35 ? 0.35 : 0;
  const rubricScore = clamp(matchRatio * 5 + lengthBonus, 0, 5);
  const identityBoundary =
    /(authenticat|identity|caller|token)/.test(responseLower) &&
    /(authoriz|permission|scope|role|policy)/.test(responseLower) &&
    /(action|perform|request|can do|allowed)/.test(responseLower);
  const tokenBoundary =
    /token/.test(responseLower) &&
    /(does not mean|doesn't mean|doesnt mean|only proves|does not imply|not imply|can still|still lack|without)/.test(
      responseLower
    ) &&
    /(permission|scope|role|policy|authoriz)/.test(responseLower);
  const mechanismScore = identityBoundary ? 4.2 : tokenBoundary ? 3.8 : 0;
  return Number(clamp(Math.max(rubricScore, mechanismScore), 0, 5).toFixed(1));
}

function rejectsMisconception(text: string) {
  return /(does not|doesn't|doesnt|not mean|not imply|cannot|only proves|can still|still lack|without)/.test(
    text.toLowerCase()
  );
}

export function scoreDiagnosticResponse(params: {
  item: AssessmentLike;
  misconceptions: MisconceptionLike[];
  responseText: string;
  confidenceRating: number;
}): ScoringResult {
  const { item, misconceptions, responseText, confidenceRating } = params;
  const initialScore = lexicalScore(responseText, item.correct_answer);
  const targetIds = toStringArray(item.target_misconceptions);

  const detectedMisconceptions = misconceptions
    .filter((misconception) => targetIds.includes(misconception.id))
    .map((misconception) => {
      const signals = toStringArray(misconception.typical_signals);
      const weakRubricEvidence = initialScore < 3.25;
      const explicitMisconception = hasPhrase(responseText, misconception.example_wrong_answer);
      const negatesSignal = rejectsMisconception(responseText);
      const signalHit =
        explicitMisconception ||
        (weakRubricEvidence && !negatesSignal && signals.some((signal) => hasPhrase(responseText, signal))) ||
        (initialScore <= 2 && confidenceRating >= 4 && !negatesSignal);
      const wrongness = clamp((5 - initialScore) / 5);
      const confidenceWeight = clamp(confidenceRating / 5);
      const probability = signalHit
        ? clamp(0.35 + wrongness * 0.35 + confidenceWeight * 0.25)
        : clamp(wrongness * 0.35 + confidenceWeight * 0.1);

      return {
        misconception_id: misconception.id,
        name: misconception.name,
        probability: Number(probability.toFixed(2)),
        evidence: signalHit
          ? "Response matches known misconception signals or is a high-confidence wrong answer."
          : "Weak rubric match without strong misconception-specific evidence."
      };
    })
    .filter((detected) => detected.probability >= 0.35)
    .sort((a, b) => b.probability - a.probability);

  const penalty = detectedMisconceptions.some((item) => item.probability >= 0.7) ? 0.8 : 0;
  const score = Number(clamp(initialScore - penalty, 0, 5).toFixed(1));
  const calibration = confidenceCalibration(score, confidenceRating);
  const weightedError = confidenceWeightedError(score, confidenceRating);

  return {
    score,
    explanationQuality: score,
    applicationAccuracy: item.item_type === "explain" ? Math.max(0, score - 0.5) : score,
    confidenceCalibration: calibration,
    confidenceWeightedError: weightedError,
    detectedMisconceptions,
    feedback:
      detectedMisconceptions.length > 0
        ? `Likely misconception: ${detectedMisconceptions[0].name}. The next step is a contrastive repair question.`
        : score >= 4
          ? "Strong evidence of understanding. Push to transfer."
          : "Partial evidence. Ask for mechanism, boundary conditions, and a near-miss comparison.",
    recommendedNextStep:
      detectedMisconceptions.length > 0 ? "socratic_repair" : score >= 4 ? "transfer_challenge" : "diagnostic_follow_up"
  };
}

export function scoreTransferResponse(params: {
  responseText: string;
  confidenceRating: number;
  targetMisconceptions: MisconceptionLike[];
}) {
  const response = params.responseText.toLowerCase();
  const requiredSignals = [
    "role",
    "policy",
    "audit",
    "scope",
    "token",
    "environment",
    "rate",
    "subset",
    "permission"
  ];
  const matched = requiredSignals.filter((signal) => response.includes(signal)).length;
  const misconceptionPenalty = params.targetMisconceptions.some((misconception) =>
    toStringArray(misconception.typical_signals).some((signal) => hasPhrase(params.responseText, signal))
  )
    ? 1
    : 0;
  const score = Number(clamp((matched / requiredSignals.length) * 5 - misconceptionPenalty, 0, 5).toFixed(1));

  return {
    score,
    confidenceCalibration: confidenceCalibration(score, params.confidenceRating),
    feedback:
      score >= 4
        ? "Transfer response distinguishes multiple plausible causes and uses audit evidence before choosing a fix."
        : "Transfer response should compare token validity, scopes, user roles, org policy, environment, rate limits, and audit logs before recommending a fix."
  };
}

export function scoreRepairResponse(responseText: string, confidenceRating: number) {
  const response = responseText.toLowerCase();
  const mechanismWords = ["because", "depends", "scope", "permission", "identity", "action", "different"];
  const matched = mechanismWords.filter((word) => response.includes(word)).length;
  const score = Number(clamp((matched / mechanismWords.length) * 5 + (response.length > 90 ? 0.5 : 0), 0, 5).toFixed(1));

  return {
    score,
    feedback:
      score >= 4
        ? "Good repair evidence: the answer separates identity, action permission, and boundary conditions."
        : "Ask for the causal distinction and a contrasting case before giving a final explanation.",
    confidenceCalibration: confidenceCalibration(score, confidenceRating)
  };
}

export function buildSocraticPrompt(target?: MisconceptionLike) {
  if (!target) {
    return "Pick the weakest concept and explain what would happen in a near-miss API failure case before asking for the answer.";
  }

  return [
    "Before I explain, what do you think will happen in this scenario?",
    `Scenario: ${target.example_wrong_answer}`,
    "Why would that fix work or fail?",
    `Now compare it with this correction: ${target.expert_correction}`,
    "What assumption changed?"
  ].join("\n");
}
