import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scoreRepairResponseWithAi } from "@/lib/ai/evaluation";

const schema = z.object({
  user_id: z.string(),
  domain_id: z.string(),
  concept_id: z.string().optional(),
  probe_id: z.string().optional(),
  delay_hours: z.coerce.number().optional(),
  response_text: z.string().optional(),
  confidence_rating: z.coerce.number().min(1).max(5).optional(),
  simulate: z.boolean().optional().default(false)
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());

  if (data.probe_id && data.response_text && data.confidence_rating) {
    const probe = await prisma.retentionProbe.findUniqueOrThrow({
      where: { id: data.probe_id },
      include: { domain: true, concept: true }
    });
    const result = await scoreRepairResponseWithAi({
      domain: probe.domain,
      concept: probe.concept,
      promptUsed: "Delayed retention probe",
      learnerResponse: data.response_text,
      confidenceRating: data.confidence_rating
    });
    const completedAt = new Date();
    const completedEarly = completedAt < probe.scheduled_at;
    const simulated = data.simulate || completedEarly;
    const updated = await prisma.$transaction(async (tx) => {
      const completed = await tx.retentionProbe.update({
        where: { id: data.probe_id },
        data: {
          completed_at: completedAt,
          score: result.score,
          confidence_rating: data.confidence_rating,
          simulated,
          completed_early: completedEarly,
          scoring_provider: result.provider,
          scoring_model: result.model,
          scoring_error: result.providerError,
          requires_expert_validation: result.requiresExpertValidation,
          uncertainty_flags: result.uncertaintyFlags,
          result: {
            response_text: data.response_text,
            feedback: result.feedback,
            confidence_calibration: result.confidenceCalibration,
            scoring_provider: result.provider,
            scoring_model: result.model,
            provider_error: result.providerError,
            uncertainty_flags: result.uncertaintyFlags,
            requires_expert_validation: result.requiresExpertValidation,
            simulated,
            completed_early: completedEarly,
            scheduled_at: probe.scheduled_at.toISOString(),
            completed_at: completedAt.toISOString()
          }
        }
      });

      await tx.evidenceEvent.create({
        data: {
          user_id: probe.user_id,
          domain_id: probe.domain_id,
          concept_id: probe.concept_id,
          event_type: "retention_probe_completed",
          evidence_value: result.score,
          confidence_rating: data.confidence_rating,
          metadata: {
            probe_id: probe.id,
            feedback: result.feedback,
            calibration_error: result.confidenceCalibration,
            scoring_provider: result.provider,
            scoring_model: result.model,
            provider_error: result.providerError,
            uncertainty_flags: result.uncertaintyFlags,
            requires_expert_validation: result.requiresExpertValidation,
            simulated,
            completed_early: completedEarly,
            scheduled_at: probe.scheduled_at.toISOString(),
            completed_at: completedAt.toISOString()
          }
        }
      });

      return completed;
    });

    return NextResponse.json({ probe: updated, result: { ...result, simulated, completed_early: completedEarly } });
  }

  if (!data.concept_id) {
    return NextResponse.json({ error: "concept_id is required to create a probe" }, { status: 400 });
  }

  const created = await prisma.retentionProbe.create({
    data: {
      user_id: data.user_id,
      domain_id: data.domain_id,
      concept_id: data.concept_id,
      scheduled_at: new Date(Date.now() + (data.delay_hours ?? 24) * 60 * 60 * 1000),
      result: {
        prompt: "Delayed probe: re-explain the key distinction and apply it to a less familiar API failure."
      }
    }
  });

  return NextResponse.json({ probe: created });
}
