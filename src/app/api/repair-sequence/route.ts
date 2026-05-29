import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSocraticRepairSequence } from "@/lib/ai/evaluation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId");
  const misconceptionId = searchParams.get("misconceptionId");
  const userId = searchParams.get("userId");

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  const domain = await prisma.domain.findUniqueOrThrow({ where: { id: domainId } });
  const misconception = misconceptionId
    ? await prisma.misconception.findUnique({
        where: { id: misconceptionId },
        include: { concept: true }
      })
    : null;
  const concept =
    misconception?.concept ??
    (await prisma.concept.findFirstOrThrow({
      where: { domain_id: domainId },
      orderBy: [{ importance_score: "desc" }, { difficulty_score: "desc" }]
    }));

  const learnerEvidence = userId
    ? await prisma.evidenceEvent.findMany({
        where: { user_id: userId, domain_id: domainId },
        orderBy: { created_at: "desc" },
        take: 8
      })
    : [];

  const sequence = await generateSocraticRepairSequence({
    domain,
    concept,
    misconception,
    learnerEvidence
  });

  return NextResponse.json(sequence);
}
