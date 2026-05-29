import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  domain_id: z.string(),
  concept_id: z.string(),
  item_type: z.string().min(2),
  prompt: z.string().min(10),
  correct_answer: z.string().min(5),
  scoring_rubric: z.unknown().optional(),
  target_misconceptions: z.array(z.string()).optional(),
  difficulty: z.coerce.number().min(1).max(5),
  transfer_distance: z.coerce.number().min(1).max(5)
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const item = await prisma.assessmentItem.create({
    data: {
      ...data,
      scoring_rubric: data.scoring_rubric ?? {},
      target_misconceptions: data.target_misconceptions ?? []
    }
  });

  return NextResponse.json({ item });
}
