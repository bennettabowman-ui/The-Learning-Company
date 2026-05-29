import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scoreDiagnosticResponseWithAi } from "@/lib/ai/evaluation";
import { masteryLevel, retentionRisk } from "@/lib/metrics";

const schema = z.object({
  user_id: z.string(),
  assessment_item_id: z.string(),
  response_text: z.string().min(1),
  selected_answer: z.string().optional(),
  confidence_rating: z.coerce.number().min(1).max(5),
  response_time: z.coerce.number().nonnegative().default(0)
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const item = await prisma.assessmentItem.findUniqueOrThrow({
    where: { id: data.assessment_item_id },
    include: { domain: true, concept: true }
  });
  const misconceptions = await prisma.misconception.findMany({
    where: { domain_id: item.domain_id }
  });

  const result = await scoreDiagnosticResponseWithAi({
    domain: item.domain,
    concept: item.concept,
    item,
    misconceptions,
    responseText: data.response_text,
    confidenceRating: data.confidence_rating
  });

  const response = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        user_id: data.user_id,
        domain_id: item.domain_id,
        session_type: "DIAGNOSTIC",
        completed_at: new Date()
      }
    });

    const learnerResponse = await tx.learnerResponse.create({
      data: {
        session_id: session.id,
        user_id: data.user_id,
        assessment_item_id: item.id,
        response_text: data.response_text,
        selected_answer: data.selected_answer,
        confidence_rating: data.confidence_rating,
        response_time: data.response_time,
        ai_score: result.score,
        ai_feedback: result.feedback,
        detected_misconceptions: result.detectedMisconceptions,
        scoring_provider: result.provider,
        scoring_model: result.model,
        scoring_error: result.providerError,
        requires_expert_validation: result.requiresExpertValidation,
        uncertainty_flags: result.uncertaintyFlags
      }
    });

    const maxMisconceptionProbability =
      result.detectedMisconceptions[0]?.probability ?? Math.max(0, (5 - result.score) / 10);

    await tx.learnerConceptState.upsert({
      where: {
        user_id_domain_id_concept_id: {
          user_id: data.user_id,
          domain_id: item.domain_id,
          concept_id: item.concept_id
        }
      },
      create: {
        user_id: data.user_id,
        domain_id: item.domain_id,
        concept_id: item.concept_id,
        recall_strength: result.score / 5,
        explanation_quality: result.explanationQuality,
        application_accuracy: result.applicationAccuracy,
        transfer_score: 0,
        confidence_calibration: result.confidenceCalibration,
        misconception_probability: maxMisconceptionProbability,
        retention_risk: retentionRisk(0, result.confidenceCalibration, maxMisconceptionProbability),
        mastery_level: masteryLevel({
          explanationQuality: result.explanationQuality,
          applicationAccuracy: result.applicationAccuracy,
          transferScore: 0,
          misconceptionProbability: maxMisconceptionProbability
        })
      },
      update: {
        recall_strength: result.score / 5,
        explanation_quality: result.explanationQuality,
        application_accuracy: result.applicationAccuracy,
        confidence_calibration: result.confidenceCalibration,
        misconception_probability: maxMisconceptionProbability,
        retention_risk: retentionRisk(0, result.confidenceCalibration, maxMisconceptionProbability),
        mastery_level: masteryLevel({
          explanationQuality: result.explanationQuality,
          applicationAccuracy: result.applicationAccuracy,
          transferScore: 0,
          misconceptionProbability: maxMisconceptionProbability
        })
      }
    });

    for (const detected of result.detectedMisconceptions) {
      await tx.learnerMisconceptionState.upsert({
        where: {
          user_id_domain_id_misconception_id: {
            user_id: data.user_id,
            domain_id: item.domain_id,
            misconception_id: detected.misconception_id
          }
        },
        create: {
          user_id: data.user_id,
          domain_id: item.domain_id,
          misconception_id: detected.misconception_id,
          probability: detected.probability,
          confidence_weighted_error_score: result.confidenceWeightedError,
          evidence_count: 1,
          last_detected_at: new Date(),
          status: detected.probability >= 0.7 ? "LIKELY" : "SUSPECTED"
        },
        update: {
          probability: detected.probability,
          confidence_weighted_error_score: { increment: result.confidenceWeightedError },
          evidence_count: { increment: 1 },
          last_detected_at: new Date(),
          status: detected.probability >= 0.7 ? "LIKELY" : "SUSPECTED"
        }
      });

      await tx.evidenceEvent.create({
        data: {
          user_id: data.user_id,
          domain_id: item.domain_id,
          concept_id: item.concept_id,
          event_type: "misconception_detected",
          evidence_value: detected.probability,
          confidence_rating: data.confidence_rating,
          metadata: {
            ...detected,
            scoring_provider: result.provider,
            scoring_model: result.model,
            uncertainty_flags: result.uncertaintyFlags,
            requires_expert_validation: result.requiresExpertValidation
          }
        }
      });
    }

    await tx.evidenceEvent.create({
      data: {
        user_id: data.user_id,
        domain_id: item.domain_id,
        concept_id: item.concept_id,
        event_type: "diagnostic_response_scored",
        evidence_value: result.score,
        confidence_rating: data.confidence_rating,
        metadata: {
          assessment_item_id: item.id,
          confidence_weighted_error: result.confidenceWeightedError,
          calibration_error: result.confidenceCalibration,
          recommended_next_step: result.recommendedNextStep,
          scoring_provider: result.provider,
          scoring_model: result.model,
          provider_error: result.providerError,
          uncertainty_flags: result.uncertaintyFlags,
          requires_expert_validation: result.requiresExpertValidation
        }
      }
    });

    return learnerResponse;
  });

  return NextResponse.json({ response, result });
}
