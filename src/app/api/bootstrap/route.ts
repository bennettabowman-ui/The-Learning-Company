import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [users, domain] = await Promise.all([
    prisma.user.findMany({ orderBy: { created_at: "asc" } }),
    prisma.domain.findFirst({
      orderBy: { created_at: "asc" },
      include: {
        concepts: { orderBy: { importance_score: "desc" } },
        misconceptions: { orderBy: { name: "asc" } },
        assessmentItems: { orderBy: [{ transfer_distance: "asc" }, { difficulty: "asc" }] }
      }
    })
  ]);

  const research = domain
    ? await prisma.evidenceEvent.findMany({
        where: { domain_id: domain.id },
        orderBy: { created_at: "desc" },
        take: 20
      })
    : [];

  return NextResponse.json({ users, domain, recentEvidence: research });
}
