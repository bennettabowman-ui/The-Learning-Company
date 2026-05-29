import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "LEARNER"]).default("LEARNER"),
  experimental_condition: z.enum(["CONTROL", "EXPERIMENTAL"]).optional(),
  domain_id: z.string().optional()
});

type ExperimentalConditionInput = "CONTROL" | "EXPERIMENTAL";

async function balancedCondition(): Promise<ExperimentalConditionInput> {
  const counts = await prisma.user.groupBy({
    by: ["experimental_condition"],
    where: { role: "LEARNER" },
    _count: { _all: true }
  });
  const controlCount = counts.find((row) => row.experimental_condition === "CONTROL")?._count._all ?? 0;
  const experimentalCount = counts.find((row) => row.experimental_condition === "EXPERIMENTAL")?._count._all ?? 0;

  if (controlCount < experimentalCount) return "CONTROL";
  if (experimentalCount < controlCount) return "EXPERIMENTAL";
  return Math.random() < 0.5 ? "CONTROL" : "EXPERIMENTAL";
}

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const experimentalCondition =
    data.experimental_condition ?? (data.role === "LEARNER" ? await balancedCondition() : "EXPERIMENTAL");

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      experimental_condition: experimentalCondition
    }
  });

  if (data.domain_id) {
    const concepts = await prisma.concept.findMany({ where: { domain_id: data.domain_id } });
    await prisma.learnerConceptState.createMany({
      data: concepts.map((concept) => ({
        user_id: user.id,
        domain_id: data.domain_id!,
        concept_id: concept.id,
        mastery_level: "unassessed"
      }))
    });
  }

  return NextResponse.json({ user });
}
