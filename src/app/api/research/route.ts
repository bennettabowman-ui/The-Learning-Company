import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
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

  const byCondition = users.map((user) => {
    const userTransfers = transfers.filter((transfer) => transfer.user_id === user.id);
    const userResponses = responses.filter((response) => response.user_id === user.id);
    const userProbes = probes.filter((probe) => probe.user_id === user.id && probe.score !== null);
    const highConfidenceErrors = userResponses.filter(
      (response) => response.confidence_rating >= 4 && response.ai_score < 3
    ).length;

    return {
      user_id: user.id,
      name: user.name,
      condition: user.experimental_condition,
      diagnostic_score: avg(userResponses.map((response) => response.ai_score)),
      immediate_transfer_score: avg(userTransfers.map((transfer) => transfer.score)),
      delayed_retention_score: avg(userProbes.map((probe) => probe.score ?? 0)),
      high_confidence_errors: highConfidenceErrors
    };
  });

  const conditions = ["CONTROL", "EXPERIMENTAL"].map((condition) => {
    const rows = byCondition.filter((row) => row.condition === condition);
    return {
      condition,
      learner_count: rows.length,
      diagnostic_score: avg(rows.map((row) => row.diagnostic_score).filter(Boolean)),
      immediate_transfer_score: avg(rows.map((row) => row.immediate_transfer_score).filter(Boolean)),
      delayed_retention_score: avg(rows.map((row) => row.delayed_retention_score).filter(Boolean)),
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
    avg_probability: avg(item.avg_probability)
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
      repair_success_rate: avg(
        misconceptionStates.map((state) => (state.status === "REPAIRED" ? 1 : 0))
      )
    }
  });
}
