import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  domain_id: z.string(),
  concept_id: z.string(),
  name: z.string().min(2),
  description: z.string().min(5),
  typical_signals: z.array(z.string()).optional(),
  repair_strategy: z.string().min(5),
  example_wrong_answer: z.string().min(5),
  expert_correction: z.string().min(5)
});

export async function POST(request: Request) {
  const data = schema.parse(await request.json());
  const misconception = await prisma.misconception.create({
    data: {
      ...data,
      typical_signals: data.typical_signals ?? []
    }
  });

  return NextResponse.json({ misconception });
}
