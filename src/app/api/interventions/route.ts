import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scoreRepairResponse } from "@/lib/ai/scoring";

const schema = z.object({
  user_id: z.string(),
  domain_id: z.string(),
  concept_id: z.string(),
  misconception_id: z.string().optional(),
  intervention_type: z.string().default("socratic_repair"),
  prompt_used: z.string().min(2),
  learner_response: z.string().min(1),
  confidence_rating: z.coerce.number().min(1).max(5)
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const result = scoreRepairResponse(data.learner_response, data.confidence_rating);

  const intervention = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        session_type: data.intervention_type === "standard_explanation" ? "STANDARD_EXPLANATION" : "SOCRATIC_REPAIR",
        completed_at: new Date()
      }
    });

    const created = await tx.intervention.create({
      data: {
        session_id: session.id,
        user_id: data.user_id,
        concept_id: data.concept_id,
        misconception_id: data.misconception_id,
        intervention_type: data.intervention_type,
        prompt_used: data.prompt_used,
        learner_response: data.learner_response,
        ai_feedback: result.feedback,
        outcome_score: result.score
      }
    });

    if (data.misconception_id) {
      const existing = await tx.learnerMisconceptionState.findUnique({
        where: {
          user_id_domain_id_misconception_id: {
            user_id: data.user_id,
            domain_id: data.domain_id,
            misconception_id: data.misconception_id
          }
        }
      });
      const nextProbability = Math.max(0, (existing?.probability ?? 0.55) - (result.score >= 4 ? 0.35 : 0.15));

      await tx.learnerMisconceptionState.upsert({
        where: {
          user_id_domain_id_misconception_id: {
            user_id: data.user_id,
            domain_id: data.domain_id,
            misconception_id: data.misconception_id
          }
        },
        create: {
          user_id: data.user_id,
          domain_id: data.domain_id,
          misconception_id: data.misconception_id,
          probability: nextProbability,
          confidence_weighted_error_score: 0,
          evidence_count: 1,
          repaired_at: result.score >= 4 ? new Date() : null,
          status: result.score >= 4 ? "REPAIRED" : "REPAIRING"
        },
        update: {
          probability: nextProbability,
          evidence_count: { increment: 1 },
          repaired_at: result.score >= 4 ? new Date() : undefined,
          status: result.score >= 4 ? "REPAIRED" : "REPAIRING"
        }
      });
    }

    await tx.evidenceEvent.create({
      data: {
        user_id: data.user_id,
        domain_id: data.domain_id,
        concept_id: data.concept_id,
        event_type: data.intervention_type === "standard_explanation" ? "control_explanation_completed" : "socratic_repair_completed",
        evidence_value: result.score,
        confidence_rating: data.confidence_rating,
        metadata: {
          intervention_id: created.id,
          misconception_id: data.misconception_id,
          calibration_error: result.confidenceCalibration
        }
      }
    });

    return created;
  });

  return NextResponse.json({ intervention, result });
}
