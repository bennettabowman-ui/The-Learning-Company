import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scoreTransferResponseWithAi } from "@/lib/ai/evaluation";
import { masteryLevel, retentionRisk } from "@/lib/metrics";

const schema = z.object({
  user_id: z.string(),
  domain_id: z.string(),
  scenario_id: z.string(),
  response_text: z.string().min(1),
  confidence_rating: z.coerce.number().min(1).max(5)
});

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const item = await prisma.assessmentItem.findUniqueOrThrow({
    where: { id: data.scenario_id },
    include: { domain: true, concept: true }
  });
  const targetIds = stringArray(item.target_misconceptions);
  const targetMisconceptions = await prisma.misconception.findMany({
    where: { id: { in: targetIds } }
  });

  const result = await scoreTransferResponseWithAi({
    domain: item.domain,
    concept: item.concept,
    item,
    misconceptions: targetMisconceptions,
    responseText: data.response_text,
    confidenceRating: data.confidence_rating
  });

  const attempt = await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        session_type: "TRANSFER",
        completed_at: new Date()
      }
    });

    const created = await tx.transferAttempt.create({
      data: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        scenario_id: data.scenario_id,
        response_text: data.response_text,
        score: result.score,
        rubric_feedback: result.feedback,
        transfer_distance: item.transfer_distance,
        confidence_rating: data.confidence_rating
      }
    });

    const current = await tx.learnerConceptState.findUnique({
      where: {
        user_id_domain_id_concept_id: {
          user_id: data.user_id,
          domain_id: data.domain_id,
          concept_id: item.concept_id
        }
      }
    });
    const misconceptionProbability = current?.misconception_probability ?? 0;

    await tx.learnerConceptState.upsert({
      where: {
        user_id_domain_id_concept_id: {
          user_id: data.user_id,
          domain_id: data.domain_id,
          concept_id: item.concept_id
        }
      },
      create: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        concept_id: item.concept_id,
        transfer_score: result.score,
        application_accuracy: result.score,
        explanation_quality: result.score,
        confidence_calibration: result.confidenceCalibration,
        misconception_probability: misconceptionProbability,
        retention_risk: retentionRisk(result.score, result.confidenceCalibration, misconceptionProbability),
        mastery_level: masteryLevel({
          explanationQuality: result.score,
          applicationAccuracy: result.score,
          transferScore: result.score,
          misconceptionProbability
        })
      },
      update: {
        transfer_score: result.score,
        application_accuracy: result.score,
        confidence_calibration: result.confidenceCalibration,
        retention_risk: retentionRisk(result.score, result.confidenceCalibration, misconceptionProbability),
        mastery_level: masteryLevel({
          explanationQuality: current?.explanation_quality ?? result.score,
          applicationAccuracy: result.score,
          transferScore: result.score,
          misconceptionProbability
        })
      }
    });

    const probe = await tx.retentionProbe.create({
      data: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        concept_id: item.concept_id,
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        result: {
          prompt:
            "Delayed probe: explain how you would diagnose a similar subset-user API failure without overgeneralizing from the original case."
        }
      }
    });

    await tx.evidenceEvent.create({
      data: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        concept_id: item.concept_id,
        event_type: "transfer_attempt_scored",
        evidence_value: result.score,
        confidence_rating: data.confidence_rating,
        metadata: {
          transfer_attempt_id: created.id,
          retention_probe_id: probe.id,
          calibration_error: result.confidenceCalibration,
          scoring_provider: result.provider,
          scoring_model: result.model,
          provider_error: result.providerError,
          uncertainty_flags: result.uncertaintyFlags,
          requires_expert_validation: result.requiresExpertValidation
        }
      }
    });

    return created;
  });

  return NextResponse.json({ attempt, result });
}
