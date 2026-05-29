import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const domainId = searchParams.get("domainId");

  if (!userId || !domainId) {
    return NextResponse.json({ error: "userId and domainId are required" }, { status: 400 });
  }

  const [conceptStates, misconceptionStates, responses, transfers, probes, evidence] = await Promise.all([
    prisma.learnerConceptState.findMany({
      where: { user_id: userId, domain_id: domainId },
      include: { concept: true },
      orderBy: { last_updated: "desc" }
    }),
    prisma.learnerMisconceptionState.findMany({
      where: { user_id: userId, domain_id: domainId },
      include: { misconception: { include: { concept: true } } },
      orderBy: [{ probability: "desc" }, { evidence_count: "desc" }]
    }),
    prisma.learnerResponse.findMany({
      where: { user_id: userId, assessmentItem: { domain_id: domainId } },
      include: { assessmentItem: true },
      orderBy: { created_at: "desc" },
      take: 10
    }),
    prisma.transferAttempt.findMany({
      where: { user_id: userId, domain_id: domainId },
      orderBy: { created_at: "desc" },
      take: 5
    }),
    prisma.retentionProbe.findMany({
      where: { user_id: userId, domain_id: domainId },
      include: { concept: true },
      orderBy: { scheduled_at: "asc" }
    }),
    prisma.evidenceEvent.findMany({
      where: { user_id: userId, domain_id: domainId },
      orderBy: { created_at: "desc" },
      take: 20
    })
  ]);

  const likely = misconceptionStates.find((state) => state.probability >= 0.5 && state.status !== "REPAIRED");
  const weak = conceptStates.find((state) => state.mastery_level !== "transfer-ready");
  const nextRecommendedPractice = likely
    ? `Repair misconception: ${likely.misconception.name}`
    : weak
      ? `Practice transfer for ${weak.concept.name}`
      : "Complete delayed retention probe";

  return NextResponse.json({
    conceptStates,
    misconceptionStates,
    responses,
    transfers,
    probes,
    evidence,
    nextRecommendedPractice
  });
}
