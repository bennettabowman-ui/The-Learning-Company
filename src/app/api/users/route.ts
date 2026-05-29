import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "LEARNER"]).default("LEARNER"),
  experimental_condition: z.enum(["CONTROL", "EXPERIMENTAL"]).default("EXPERIMENTAL"),
  domain_id: z.string().optional()
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      experimental_condition: data.experimental_condition
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
