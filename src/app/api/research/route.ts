import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { expertOutcomeScore, isPrimaryRetentionCandidate, meanOrNull, meanOrZero } from "@/lib/research/outcomes";

function pushScore(map: Map<string, number[]>, userId: string | undefined, value: number | null) {
  if (!userId || value === null) return;
  const scores = map.get(userId) ?? [];
  scores.push(value);
  map.set(userId, scores);
}

function scoreCount(map: Map<string, number[]>, userId: string) {
  return map.get(userId)?.length ?? 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId");

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  const [users, responses, transfers, probes, misconceptionStates, evidence, expertReviews] = await Promise.all([
    prisma.user.findMany({ where: { role: "LEARNER" }, orderBy: { name: "asc" } }),
    prisma.learnerResponse.findMany({
      where: { assessmentItem: { domain_id: domainId } },
      include: { user: true, assessmentItem: { include: { concept: true } } }
    }),
    prisma.transferAttempt.findMany({ where: { domain_id: domainId }, include: { user: true } }),
    prisma.retentionProbe.findMany({ where: { domain_id: domainId }, include: { user: true, concept: true } }),
    prisma.learnerMisconceptionState.findMany({
      where: { domain_id: domainId },
      include: { user: true, misconception: { include: { concept: true } } }
    }),
    prisma.evidenceEvent.findMany({ where: { domain_id: domainId } }),
    prisma.expertReview.findMany({ where: { domain_id: domainId } })
  ]);

  const responseUserById = new Map(responses.map((response) => [response.id, response.user_id]));
  const transferUserById = new Map(transfers.map((transfer) => [transfer.id, transfer.user_id]));
  const probeUserById = new Map(
    probes.filter((probe) => isPrimaryRetentionCandidate(probe)).map((probe) => [probe.id, probe.user_id])
  );

  const expertDiagnosticByUser = new Map<string, number[]>();
  const expertTransferByUser = new Map<string, number[]>();
  const expertRetentionByUser = new Map<string, number[]>();

  for (const review of expertReviews) {
    const value = expertOutcomeScore(review);
    if (review.review_target_type === "learner_response") {
      pushScore(expertDiagnosticByUser, responseUserById.get(review.review_target_id), value);
    }
    if (review.review_target_type === "transfer_attempt") {
      pushScore(expertTransferByUser, transferUserById.get(review.review_target_id), value);
    }
    if (review.review_target_type === "retention_probe") {
      pushScore(expertRetentionByUser, probeUserById.get(review.review_target_id), value);
    }
  }

  const byCondition = users.map((user) => {
    const userTransfers = transfers.filter((transfer) => transfer.user_id === user.id);
    const userResponses = responses.filter((response) => response.user_id === user.id);
    const userProbes = probes.filter((probe) => probe.user_id === user.id && isPrimaryRetentionCandidate(probe));
    const highConfidenceErrors = userResponses.filter(
      (response) => response.confidence_rating >= 4 && response.ai_score < 3
    ).length;
    const expertReviewCount =
      scoreCount(expertDiagnosticByUser, user.id) +
      scoreCount(expertTransferByUser, user.id) +
      scoreCount(expertRetentionByUser, user.id);

    return {
      user_id: user.id,
      name: user.name,
      condition: user.experimental_condition,
      diagnostic_score: meanOrNull(expertDiagnosticByUser.get(user.id) ?? []),
      immediate_transfer_score: meanOrNull(expertTransferByUser.get(user.id) ?? []),
      delayed_retention_score: meanOrNull(expertRetentionByUser.get(user.id) ?? []),
      ai_diagnostic_score: meanOrNull(userResponses.map((response) => response.ai_score)),
      ai_immediate_transfer_score: meanOrNull(userTransfers.map((transfer) => transfer.score)),
      ai_delayed_retention_score: meanOrNull(userProbes.map((probe) => probe.score)),
      expert_review_count: expertReviewCount,
      primary_outcome_source: expertReviewCount > 0 ? "expert_blind" : "unreviewed",
      high_confidence_errors: highConfidenceErrors
    };
  });

  const conditions = ["CONTROL", "EXPERIMENTAL"].map((condition) => {
    const rows = byCondition.filter((row) => row.condition === condition);
    return {
      condition,
      learner_count: rows.length,
      diagnostic_score: meanOrNull(rows.map((row) => row.diagnostic_score)),
      immediate_transfer_score: meanOrNull(rows.map((row) => row.immediate_transfer_score)),
      delayed_retention_score: meanOrNull(rows.map((row) => row.delayed_retention_score)),
      ai_diagnostic_score: meanOrNull(rows.map((row) => row.ai_diagnostic_score)),
      ai_immediate_transfer_score: meanOrNull(rows.map((row) => row.ai_immediate_transfer_score)),
      ai_delayed_retention_score: meanOrNull(rows.map((row) => row.ai_delayed_retention_score)),
      expert_review_count: rows.reduce((sum, row) => sum + row.expert_review_count, 0),
      high_confidence_errors: rows.reduce((sum, row) => sum + row.high_confidence_errors, 0)
    };
  });

  const misconceptionFrequency = Object.values(
    misconceptionStates.reduce<Record<string, { name: string; count: number; avg_probability: number[] }>>(
      (acc, state) => {
        const key = state.misconception_id;
        acc[key] ??= { name: state.misconception.name, count: 0, avg_probability: [] };
        acc[key].count += 1;
        acc[key].avg_probability.push(state.probability);
        return acc;
      },
      {}
    )
  ).map((item) => ({
    name: item.name,
    count: item.count,
    avg_probability: meanOrZero(item.avg_probability)
  }));

  return NextResponse.json({
    learners: byCondition,
    conditions,
    misconceptionFrequency,
    totals: {
      responses: responses.length,
      transfers: transfers.length,
      retention_probes: probes.length,
      evidence_events: evidence.length,
      expert_reviews: expertReviews.length,
      repair_success_rate: meanOrZero(
        misconceptionStates.map((state) => (state.status === "REPAIRED" ? 1 : 0))
      )
    }
  });
}
