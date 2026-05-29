import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const postSchema = z
  .object({
    reviewer_user_id: z.string(),
    domain_id: z.string(),
    concept_id: z.string(),
    assessment_item_id: z.string().optional(),
    review_target_type: z.enum(["learner_response", "transfer_attempt", "retention_probe"]),
    review_target_id: z.string(),
    prompt: z.string().min(1),
    response_text: z.string().min(1),
    ai_score: z.number().min(0).max(5).optional().nullable(),
    ai_misconception_labels: z.array(z.string()).default([]),
    expert_explanation_quality_score: z.number().min(0).max(5).optional().nullable(),
    expert_transfer_score: z.number().min(0).max(5).optional().nullable(),
    expert_misconception_labels: z.array(z.string()).default([]),
    expert_confidence_calibration_score: z.number().min(0).max(5).optional().nullable(),
    notes: z.string().optional()
  })
  .refine((value) => value.expert_explanation_quality_score !== undefined || value.expert_transfer_score !== undefined, {
    message: "At least one expert score is required"
  });

function jsonLabels(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null && "misconception_id" in item) {
        const id = (item as { misconception_id?: unknown }).misconception_id;
        return typeof id === "string" ? id : "";
      }
      return "";
    })
    .filter(Boolean);
}

function probePrompt(result: unknown) {
  if (typeof result === "object" && result !== null && "prompt" in result) {
    const prompt = (result as { prompt?: unknown }).prompt;
    if (typeof prompt === "string") return prompt;
  }
  return "Delayed retention probe";
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId");
  const reviewerId = searchParams.get("reviewerId");

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  const [reviews, responses, transfers, probes, assessmentItems] = await Promise.all([
    prisma.expertReview.findMany({
      where: {
        domain_id: domainId,
        ...(reviewerId ? { reviewer_user_id: reviewerId } : {})
      },
      include: { reviewer: true, concept: true, assessmentItem: true },
      orderBy: { created_at: "desc" },
      take: 100
    }),
    prisma.learnerResponse.findMany({
      where: { assessmentItem: { domain_id: domainId } },
      include: { assessmentItem: { include: { concept: true } } },
      take: 250
    }),
    prisma.transferAttempt.findMany({
      where: { domain_id: domainId },
      take: 250
    }),
    prisma.retentionProbe.findMany({
      where: { domain_id: domainId, score: { not: null } },
      include: { concept: true },
      take: 250
    }),
    prisma.assessmentItem.findMany({
      where: { domain_id: domainId },
      include: { concept: true }
    })
  ]);

  const reviewedTargets = new Set(reviews.map((review) => `${review.review_target_type}:${review.review_target_id}`));
  const itemById = new Map(assessmentItems.map((item) => [item.id, item]));

  const queue = shuffle([
    ...responses.map((response) => ({
      review_target_type: "learner_response",
      review_target_id: response.id,
      concept_id: response.assessmentItem.concept_id,
      concept_name: response.assessmentItem.concept.name,
      assessment_item_id: response.assessment_item_id,
      item_type: response.assessmentItem.item_type,
      prompt: response.assessmentItem.prompt,
      response_text: response.response_text,
      ai_score: response.ai_score,
      ai_misconception_labels: jsonLabels(response.detected_misconceptions),
      created_at: response.created_at
    })),
    ...transfers.map((transfer) => {
      const item = itemById.get(transfer.scenario_id);
      return {
        review_target_type: "transfer_attempt",
        review_target_id: transfer.id,
        concept_id: item?.concept_id ?? "",
        concept_name: item?.concept.name ?? "Transfer scenario",
        assessment_item_id: item?.id,
        item_type: "transfer",
        prompt: item?.prompt ?? "Transfer scenario",
        response_text: transfer.response_text,
        ai_score: transfer.score,
        ai_misconception_labels: [],
        created_at: transfer.created_at
      };
    }),
    ...probes.map((probe) => ({
      review_target_type: "retention_probe",
      review_target_id: probe.id,
      concept_id: probe.concept_id,
      concept_name: probe.concept.name,
      assessment_item_id: undefined,
      item_type: "retention",
      prompt: probePrompt(probe.result),
      response_text:
        typeof probe.result === "object" && probe.result !== null && "response_text" in probe.result
          ? String((probe.result as { response_text?: unknown }).response_text ?? "")
          : "",
      ai_score: probe.score,
      ai_misconception_labels: [],
      created_at: probe.completed_at ?? probe.scheduled_at
    }))
  ])
    .filter((item) => item.concept_id)
    .filter((item) => !reviewedTargets.has(`${item.review_target_type}:${item.review_target_id}`))
    .slice(0, 25);

  return NextResponse.json({ queue, reviews });
}

export async function POST(request: Request) {
  const data = postSchema.parse(await request.json());
  const primaryScore = data.expert_transfer_score ?? data.expert_explanation_quality_score ?? 0;

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.expertReview.upsert({
      where: {
        reviewer_user_id_review_target_type_review_target_id: {
          reviewer_user_id: data.reviewer_user_id,
          review_target_type: data.review_target_type,
          review_target_id: data.review_target_id
        }
      },
      create: {
        ...data,
        ai_score: data.ai_score ?? null,
        expert_explanation_quality_score: data.expert_explanation_quality_score ?? null,
        expert_transfer_score: data.expert_transfer_score ?? null,
        expert_confidence_calibration_score: data.expert_confidence_calibration_score ?? null,
        notes: data.notes ?? null,
        blind_review: true
      },
      update: {
        prompt: data.prompt,
        response_text: data.response_text,
        ai_score: data.ai_score ?? null,
        ai_misconception_labels: data.ai_misconception_labels,
        expert_explanation_quality_score: data.expert_explanation_quality_score ?? null,
        expert_transfer_score: data.expert_transfer_score ?? null,
        expert_misconception_labels: data.expert_misconception_labels,
        expert_confidence_calibration_score: data.expert_confidence_calibration_score ?? null,
        notes: data.notes ?? null,
        blind_review: true
      }
    });

    await tx.evidenceEvent.create({
      data: {
        user_id: data.reviewer_user_id,
        domain_id: data.domain_id,
        concept_id: data.concept_id,
        event_type: "expert_review_submitted",
        evidence_value: primaryScore,
        confidence_rating: null,
        metadata: {
          expert_review_id: created.id,
          review_target_type: data.review_target_type,
          review_target_id: data.review_target_id,
          ai_score: data.ai_score,
          expert_explanation_quality_score: data.expert_explanation_quality_score,
          expert_transfer_score: data.expert_transfer_score,
          expert_misconception_labels: data.expert_misconception_labels
        }
      }
    });

    return created;
  });

  return NextResponse.json({ review });
}
