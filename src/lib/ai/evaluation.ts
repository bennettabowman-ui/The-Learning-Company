import { z } from "zod";
import { confidenceCalibration, confidenceWeightedError, clamp } from "@/lib/metrics";
import { callOpenAiJson, type AiProvider } from "@/lib/ai/openai";
import { promptTemplates, tutorSystemPrompt } from "@/lib/ai/prompts";
import {
  scoreDiagnosticResponse,
  scoreRepairResponse,
  scoreTransferResponse,
  type DetectedMisconception,
  type ScoringResult
} from "@/lib/ai/scoring";

type DomainLike = {
  name: string;
  description: string;
  allowed_source_material: unknown;
  examples: unknown;
  counterexamples: unknown;
  near_miss_cases: unknown;
  scoring_rubrics: unknown;
  expert_explanations: unknown;
};

type ConceptLike = {
  id: string;
  name: string;
  description: string;
};

type AssessmentLike = {
  id: string;
  prompt: string;
  correct_answer: string;
  item_type: string;
  scoring_rubric: unknown;
  target_misconceptions: unknown;
  difficulty: number;
  transfer_distance: number;
};

type MisconceptionLike = {
  id: string;
  name: string;
  description: string;
  typical_signals: unknown;
  repair_strategy: string;
  example_wrong_answer: string;
  expert_correction: string;
};

export type ProviderScoringResult = ScoringResult & {
  provider: AiProvider;
  model?: string;
  uncertaintyFlags: string[];
  requiresExpertValidation: boolean;
  rawRationale?: string;
  providerError?: string;
};

export type RepairScoringResult = {
  score: number;
  feedback: string;
  confidenceCalibration: number;
  postMisconceptionProbability: number;
  nextPrompt?: string;
  provider: AiProvider;
  model?: string;
  uncertaintyFlags: string[];
  requiresExpertValidation: boolean;
  providerError?: string;
};

export type TransferScoringResult = {
  score: number;
  feedback: string;
  confidenceCalibration: number;
  provider: AiProvider;
  model?: string;
  uncertaintyFlags: string[];
  requiresExpertValidation: boolean;
  providerError?: string;
};

export type SocraticStep = {
  step_type:
    | "prediction"
    | "reasoning"
    | "contrast"
    | "contradiction"
    | "repair"
    | "re_explanation"
    | "application"
    | "confidence"
    | "transfer";
  prompt: string;
  success_criteria: string;
};

export type SocraticSequenceResult = {
  steps: SocraticStep[];
  provider: AiProvider;
  model?: string;
  uncertaintyFlags: string[];
  requiresExpertValidation: boolean;
  providerError?: string;
};

const diagnosticModelOutput = z.object({
  score: z.number().min(0).max(5),
  explanation_quality: z.number().min(0).max(5),
  application_accuracy: z.number().min(0).max(5),
  rationale: z.string(),
  misconception_signals: z.array(
    z.object({
      misconception_id: z.string(),
      probability: z.number().min(0).max(1),
      evidence: z.string()
    })
  ),
  recommended_next_step: z.string(),
  uncertainty_flags: z.array(z.string()),
  requires_expert_validation: z.boolean()
});

const repairModelOutput = z.object({
  outcome_score: z.number().min(0).max(5),
  feedback: z.string(),
  post_misconception_probability: z.number().min(0).max(1),
  next_socratic_prompt: z.string(),
  uncertainty_flags: z.array(z.string()),
  requires_expert_validation: z.boolean()
});

const transferModelOutput = z.object({
  score: z.number().min(0).max(5),
  rubric_feedback: z.string(),
  uncertainty_flags: z.array(z.string()),
  requires_expert_validation: z.boolean()
});

const socraticSequenceOutput = z.object({
  steps: z.array(
    z.object({
      step_type: z.enum([
        "prediction",
        "reasoning",
        "contrast",
        "contradiction",
        "repair",
        "re_explanation",
        "application",
        "confidence",
        "transfer"
      ]),
      prompt: z.string(),
      success_criteria: z.string()
    })
  ),
  uncertainty_flags: z.array(z.string()),
  requires_expert_validation: z.boolean()
});

const diagnosticJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "explanation_quality",
    "application_accuracy",
    "rationale",
    "misconception_signals",
    "recommended_next_step",
    "uncertainty_flags",
    "requires_expert_validation"
  ],
  properties: {
    score: { type: "number", minimum: 0, maximum: 5 },
    explanation_quality: { type: "number", minimum: 0, maximum: 5 },
    application_accuracy: { type: "number", minimum: 0, maximum: 5 },
    rationale: { type: "string" },
    misconception_signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["misconception_id", "probability", "evidence"],
        properties: {
          misconception_id: { type: "string" },
          probability: { type: "number", minimum: 0, maximum: 1 },
          evidence: { type: "string" }
        }
      }
    },
    recommended_next_step: { type: "string" },
    uncertainty_flags: { type: "array", items: { type: "string" } },
    requires_expert_validation: { type: "boolean" }
  }
};

const repairJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "outcome_score",
    "feedback",
    "post_misconception_probability",
    "next_socratic_prompt",
    "uncertainty_flags",
    "requires_expert_validation"
  ],
  properties: {
    outcome_score: { type: "number", minimum: 0, maximum: 5 },
    feedback: { type: "string" },
    post_misconception_probability: { type: "number", minimum: 0, maximum: 1 },
    next_socratic_prompt: { type: "string" },
    uncertainty_flags: { type: "array", items: { type: "string" } },
    requires_expert_validation: { type: "boolean" }
  }
};

const transferJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "rubric_feedback", "uncertainty_flags", "requires_expert_validation"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 5 },
    rubric_feedback: { type: "string" },
    uncertainty_flags: { type: "array", items: { type: "string" } },
    requires_expert_validation: { type: "boolean" }
  }
};

const socraticSequenceJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["steps", "uncertainty_flags", "requires_expert_validation"],
  properties: {
    steps: {
      type: "array",
      minItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step_type", "prompt", "success_criteria"],
        properties: {
          step_type: {
            type: "string",
            enum: [
              "prediction",
              "reasoning",
              "contrast",
              "contradiction",
              "repair",
              "re_explanation",
              "application",
              "confidence",
              "transfer"
            ]
          },
          prompt: { type: "string" },
          success_criteria: { type: "string" }
        }
      }
    },
    uncertainty_flags: { type: "array", items: { type: "string" } },
    requires_expert_validation: { type: "boolean" }
  }
};

function stringifyContext(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function knownMisconceptionMap(misconceptions: MisconceptionLike[]) {
  return new Map(misconceptions.map((misconception) => [misconception.id, misconception]));
}

function normalizeDiagnosticFallback(
  fallback: ScoringResult,
  providerError?: string
): ProviderScoringResult {
  return {
    ...fallback,
    provider: "deterministic_fallback",
    uncertaintyFlags: providerError ? [providerError] : [],
    requiresExpertValidation: Boolean(providerError),
    providerError
  };
}

function sequenceFallback(target?: MisconceptionLike): SocraticSequenceResult {
  const targetText = target?.example_wrong_answer ?? "the token is valid but the action fails";
  const correction = target?.expert_correction ?? "separate identity, permission, environment, quota, and policy.";
  return {
    provider: "deterministic_fallback",
    uncertaintyFlags: [],
    requiresExpertValidation: false,
    steps: [
      {
        step_type: "prediction",
        prompt: `Before I explain, what do you think will happen if: ${targetText}?`,
        success_criteria: "Learner makes a falsifiable prediction."
      },
      {
        step_type: "reasoning",
        prompt: "Why do you think that? Name the mechanism, not just the fix.",
        success_criteria: "Learner states the causal assumption behind the answer."
      },
      {
        step_type: "contrast",
        prompt: `Compare that with this expert correction: ${correction} What changed?`,
        success_criteria: "Learner identifies the discriminating feature."
      },
      {
        step_type: "contradiction",
        prompt: "Your answer predicts the same fix should work in both cases. What assumption might be wrong?",
        success_criteria: "Learner revises the original assumption."
      },
      {
        step_type: "repair",
        prompt: `Here is the key distinction: ${correction}`,
        success_criteria: "Learner connects the distinction to the prior error."
      },
      {
        step_type: "re_explanation",
        prompt: "Explain the concept again in your own words, including a boundary condition.",
        success_criteria: "Learner gives a causal explanation with limits."
      },
      {
        step_type: "application",
        prompt: "Apply the corrected idea to a new customer API failure.",
        success_criteria: "Learner applies the idea beyond the original example."
      },
      {
        step_type: "confidence",
        prompt: "How confident are you, from 1 to 5?",
        success_criteria: "Learner reports calibrated confidence."
      },
      {
        step_type: "transfer",
        prompt: "Here is a less familiar scenario. What would you do first, and what would you rule out?",
        success_criteria: "Learner transfers the concept to a novel scenario."
      }
    ]
  };
}

export async function scoreDiagnosticResponseWithAi(params: {
  domain: DomainLike;
  concept: ConceptLike;
  item: AssessmentLike;
  misconceptions: MisconceptionLike[];
  responseText: string;
  confidenceRating: number;
}): Promise<ProviderScoringResult> {
  const fallback = scoreDiagnosticResponse({
    item: params.item,
    misconceptions: params.misconceptions,
    responseText: params.responseText,
    confidenceRating: params.confidenceRating
  });

  const ai = await callOpenAiJson<unknown>({
    schemaName: "diagnostic_misconception_score",
    schema: diagnosticJsonSchema,
    system: [
      promptTemplates.rubricBasedScoring,
      promptTemplates.misconceptionDetection,
      "Score only from the supplied source material and rubrics. Do not invent domain facts. Prefer uncertainty flags over guessing."
    ].join("\n\n"),
    user: stringifyContext({
      domain: params.domain,
      concept: params.concept,
      assessment_item: params.item,
      known_misconceptions: params.misconceptions,
      learner_response: params.responseText,
      confidence_rating: params.confidenceRating,
      scoring_notes: {
        explanation_quality_rubric:
          "0 no meaningful explanation; 1 memorized phrase; 2 partial missing mechanism; 3 mostly correct but brittle; 4 correct causal explanation; 5 transferable explanation with boundaries and counterexamples",
        confidence_weighted_errors:
          "High-confidence wrong answers should increase misconception probability more than low-confidence gaps."
      }
    })
  });

  if (!ai.ok) return normalizeDiagnosticFallback(fallback, ai.error);

  const parsed = diagnosticModelOutput.safeParse(ai.value);
  if (!parsed.success) {
    return normalizeDiagnosticFallback(fallback, `OpenAI structured output failed validation: ${parsed.error.message}`);
  }

  const known = knownMisconceptionMap(params.misconceptions);
  const detectedMisconceptions: DetectedMisconception[] = parsed.data.misconception_signals
    .filter((signal) => known.has(signal.misconception_id))
    .map((signal) => ({
      misconception_id: signal.misconception_id,
      name: known.get(signal.misconception_id)?.name ?? signal.misconception_id,
      probability: Number(clamp(signal.probability).toFixed(2)),
      evidence: signal.evidence
    }))
    .filter((signal) => signal.probability >= 0.35)
    .sort((a, b) => b.probability - a.probability);

  const score = Number(clamp(parsed.data.score, 0, 5).toFixed(1));
  const calibration = confidenceCalibration(score, params.confidenceRating);

  return {
    score,
    explanationQuality: Number(clamp(parsed.data.explanation_quality, 0, 5).toFixed(1)),
    applicationAccuracy: Number(clamp(parsed.data.application_accuracy, 0, 5).toFixed(1)),
    confidenceCalibration: calibration,
    confidenceWeightedError: confidenceWeightedError(score, params.confidenceRating),
    feedback: parsed.data.rationale,
    detectedMisconceptions,
    recommendedNextStep: parsed.data.recommended_next_step,
    provider: "openai",
    model: ai.model,
    uncertaintyFlags: parsed.data.uncertainty_flags,
    requiresExpertValidation: parsed.data.requires_expert_validation,
    rawRationale: ai.rawText
  };
}

export async function scoreRepairResponseWithAi(params: {
  domain: DomainLike;
  concept: ConceptLike;
  misconception?: MisconceptionLike | null;
  promptUsed: string;
  learnerResponse: string;
  confidenceRating: number;
}): Promise<RepairScoringResult> {
  const fallback = scoreRepairResponse(params.learnerResponse, params.confidenceRating);
  const ai = await callOpenAiJson<unknown>({
    schemaName: "socratic_repair_score",
    schema: repairJsonSchema,
    system: [
      tutorSystemPrompt,
      "Score the learner's repair response. Return a concise next Socratic prompt that adapts to the learner's latest response."
    ].join("\n\n"),
    user: stringifyContext({
      domain: params.domain,
      concept: params.concept,
      target_misconception: params.misconception,
      prompt_used: params.promptUsed,
      learner_response: params.learnerResponse,
      confidence_rating: params.confidenceRating
    })
  });

  if (!ai.ok) {
    return {
      ...fallback,
      postMisconceptionProbability: fallback.score >= 4 ? 0.2 : 0.45,
      provider: "deterministic_fallback",
      uncertaintyFlags: [ai.error],
      requiresExpertValidation: true,
      providerError: ai.error
    };
  }

  const parsed = repairModelOutput.safeParse(ai.value);
  if (!parsed.success) {
    return {
      ...fallback,
      postMisconceptionProbability: fallback.score >= 4 ? 0.2 : 0.45,
      provider: "deterministic_fallback",
      uncertaintyFlags: [`OpenAI structured output failed validation: ${parsed.error.message}`],
      requiresExpertValidation: true,
      providerError: parsed.error.message
    };
  }

  const score = Number(clamp(parsed.data.outcome_score, 0, 5).toFixed(1));
  return {
    score,
    feedback: parsed.data.feedback,
    confidenceCalibration: confidenceCalibration(score, params.confidenceRating),
    postMisconceptionProbability: Number(clamp(parsed.data.post_misconception_probability).toFixed(2)),
    nextPrompt: parsed.data.next_socratic_prompt,
    provider: "openai",
    model: ai.model,
    uncertaintyFlags: parsed.data.uncertainty_flags,
    requiresExpertValidation: parsed.data.requires_expert_validation
  };
}

export async function scoreTransferResponseWithAi(params: {
  domain: DomainLike;
  concept: ConceptLike;
  item: AssessmentLike;
  misconceptions: MisconceptionLike[];
  responseText: string;
  confidenceRating: number;
}): Promise<TransferScoringResult> {
  const fallback = scoreTransferResponse({
    responseText: params.responseText,
    confidenceRating: params.confidenceRating,
    targetMisconceptions: params.misconceptions
  });
  const ai = await callOpenAiJson<unknown>({
    schemaName: "transfer_score",
    schema: transferJsonSchema,
    system:
      "Score a novel transfer scenario using the supplied rubric. Reward correct diagnosis, causal reasoning, distinction of similar cases, appropriate action, confidence calibration, and avoidance of prior misconception.",
    user: stringifyContext({
      domain: params.domain,
      concept: params.concept,
      transfer_item: params.item,
      known_misconceptions: params.misconceptions,
      learner_response: params.responseText,
      confidence_rating: params.confidenceRating,
      rubric: params.item.scoring_rubric
    })
  });

  if (!ai.ok) {
    return {
      ...fallback,
      provider: "deterministic_fallback",
      uncertaintyFlags: [ai.error],
      requiresExpertValidation: true,
      providerError: ai.error
    };
  }

  const parsed = transferModelOutput.safeParse(ai.value);
  if (!parsed.success) {
    return {
      ...fallback,
      provider: "deterministic_fallback",
      uncertaintyFlags: [`OpenAI structured output failed validation: ${parsed.error.message}`],
      requiresExpertValidation: true,
      providerError: parsed.error.message
    };
  }

  const score = Number(clamp(parsed.data.score, 0, 5).toFixed(1));
  return {
    score,
    feedback: parsed.data.rubric_feedback,
    confidenceCalibration: confidenceCalibration(score, params.confidenceRating),
    provider: "openai",
    model: ai.model,
    uncertaintyFlags: parsed.data.uncertainty_flags,
    requiresExpertValidation: parsed.data.requires_expert_validation
  };
}

export async function generateSocraticRepairSequence(params: {
  domain: DomainLike;
  concept: ConceptLike;
  misconception?: MisconceptionLike | null;
  learnerEvidence: unknown;
}): Promise<SocraticSequenceResult> {
  const fallback = sequenceFallback(params.misconception ?? undefined);
  const ai = await callOpenAiJson<unknown>({
    schemaName: "socratic_repair_sequence",
    schema: socraticSequenceJsonSchema,
    system: [tutorSystemPrompt, promptTemplates.socraticRepair].join("\n\n"),
    user: stringifyContext({
      domain: params.domain,
      concept: params.concept,
      target_misconception: params.misconception,
      learner_evidence: params.learnerEvidence
    })
  });

  if (!ai.ok) return { ...fallback, providerError: ai.error, uncertaintyFlags: [ai.error] };

  const parsed = socraticSequenceOutput.safeParse(ai.value);
  if (!parsed.success) {
    return {
      ...fallback,
      providerError: parsed.error.message,
      uncertaintyFlags: [`OpenAI structured output failed validation: ${parsed.error.message}`],
      requiresExpertValidation: true
    };
  }

  return {
    steps: parsed.data.steps,
    provider: "openai",
    model: ai.model,
    uncertaintyFlags: parsed.data.uncertainty_flags,
    requiresExpertValidation: parsed.data.requires_expert_validation
  };
}
