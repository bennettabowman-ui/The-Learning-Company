import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeCalibrationMetrics } from "@/lib/research/calibration";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId");

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  const reviews = await prisma.expertReview.findMany({
    where: { domain_id: domainId },
    include: { concept: true, assessmentItem: true, reviewer: true },
    orderBy: { created_at: "desc" }
  });

  const byTargetType = ["learner_response", "transfer_attempt", "retention_probe"].map((type) => {
    const targetReviews = reviews.filter((review) => review.review_target_type === type);
    return {
      review_target_type: type,
      ...computeCalibrationMetrics(targetReviews)
    };
  });

  return NextResponse.json({
    overall: computeCalibrationMetrics(reviews),
    byTargetType,
    recentReviews: reviews.slice(0, 20)
  });
}
