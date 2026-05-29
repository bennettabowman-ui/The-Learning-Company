import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  domain_id: z.string(),
  name: z.string().min(2),
  description: z.string().min(5),
  prerequisite_concept_ids: z.array(z.string()).optional(),
  importance_score: z.coerce.number().min(1).max(5),
  difficulty_score: z.coerce.number().min(1).max(5)
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const concept = await prisma.concept.create({
    data: {
      ...data,
      prerequisite_concept_ids: data.prerequisite_concept_ids ?? []
    }
  });

  return NextResponse.json({ concept });
}
