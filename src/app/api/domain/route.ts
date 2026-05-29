import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const domainSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(5),
  target_learner: z.string().min(2),
  learner_role: z.string().min(2),
  business_goal: z.string().min(2),
  target_performance_goal: z.string().min(2),
  allowed_source_material: z.unknown().optional(),
  examples: z.unknown().optional(),
  counterexamples: z.unknown().optional(),
  near_miss_cases: z.unknown().optional(),
  real_world_scenarios: z.unknown().optional(),
  transfer_scenarios: z.unknown().optional(),
  scoring_rubrics: z.unknown().optional(),
  expert_explanations: z.unknown().optional()
});

export async function POST(request: Request) {
  const parsed = domainSchema.parse(await request.json());
  const payload = {
    name: parsed.name,
    description: parsed.description,
    target_learner: parsed.target_learner,
    learner_role: parsed.learner_role,
    business_goal: parsed.business_goal,
    target_performance_goal: parsed.target_performance_goal,
    allowed_source_material: parsed.allowed_source_material ?? [],
    examples: parsed.examples ?? [],
    counterexamples: parsed.counterexamples ?? [],
    near_miss_cases: parsed.near_miss_cases ?? [],
    real_world_scenarios: parsed.real_world_scenarios ?? [],
    transfer_scenarios: parsed.transfer_scenarios ?? [],
    scoring_rubrics: parsed.scoring_rubrics ?? {},
    expert_explanations: parsed.expert_explanations ?? []
  };

  const domain = parsed.id
    ? await prisma.domain.update({ where: { id: parsed.id }, data: payload })
    : await prisma.domain.create({ data: payload });

  return NextResponse.json({ domain });
}
