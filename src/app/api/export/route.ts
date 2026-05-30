import { prisma } from "@/lib/db";

function csvCell(value: unknown) {
  const text =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? ""
        : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function metadataRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId");

  if (!domainId) {
    return new Response("domainId is required", { status: 400 });
  }

  const [responses, transfers, probes, evidence, expertReviews] = await Promise.all([
    prisma.learnerResponse.findMany({
      where: { assessmentItem: { domain_id: domainId } },
      include: { user: true, assessmentItem: { include: { concept: true } } }
    }),
    prisma.transferAttempt.findMany({ where: { domain_id: domainId }, include: { user: true } }),
    prisma.retentionProbe.findMany({ where: { domain_id: domainId }, include: { user: true, concept: true } }),
    prisma.evidenceEvent.findMany({ where: { domain_id: domainId }, include: { user: true, concept: true } }),
    prisma.expertReview.findMany({
      where: { domain_id: domainId },
      include: { reviewer: true, concept: true, assessmentItem: true }
    })
  ]);

  const rows = [
    [
      "record_type",
      "user_name",
      "condition",
      "concept",
      "event_type",
      "score",
      "confidence",
      "item_or_scenario",
      "scoring_provider",
      "scoring_model",
      "requires_expert_validation",
      "uncertainty_flags",
      "analysis_inclusion_status",
      "scoring_error",
      "metadata",
      "created_at"
    ],
    ...responses.map((response) => [
      "diagnostic_response",
      response.user.name,
      response.user.experimental_condition,
      response.assessmentItem.concept.name,
      response.assessmentItem.item_type,
      response.ai_score,
      response.confidence_rating,
      response.assessment_item_id,
      response.scoring_provider ?? "",
      response.scoring_model ?? "",
      response.requires_expert_validation,
      response.uncertainty_flags ?? "",
      "eligible_proxy",
      response.scoring_error ?? "",
      response.detected_misconceptions,
      response.created_at.toISOString()
    ]),
    ...transfers.map((transfer) => [
      "transfer_attempt",
      transfer.user.name,
      transfer.user.experimental_condition,
      "",
      "transfer_attempt_scored",
      transfer.score,
      transfer.confidence_rating,
      transfer.scenario_id,
      transfer.scoring_provider ?? "",
      transfer.scoring_model ?? "",
      transfer.requires_expert_validation,
      transfer.uncertainty_flags ?? "",
      "eligible_proxy",
      transfer.scoring_error ?? "",
      transfer.rubric_feedback,
      transfer.created_at.toISOString()
    ]),
    ...probes.map((probe) => [
      "retention_probe",
      probe.user.name,
      probe.user.experimental_condition,
      probe.concept.name,
      probe.completed_at ? "retention_probe_completed" : "retention_probe_scheduled",
      probe.score ?? "",
      probe.confidence_rating ?? "",
      probe.id,
      probe.scoring_provider ?? "",
      probe.scoring_model ?? "",
      probe.requires_expert_validation,
      probe.uncertainty_flags ?? "",
      probe.simulated || probe.completed_early ? "excluded_simulated_or_early" : "eligible_primary_candidate",
      probe.scoring_error ?? "",
      probe.result,
      (probe.completed_at ?? probe.scheduled_at).toISOString()
    ]),
    ...evidence.map((event) => {
      const metadata = metadataRecord(event.metadata);
      return [
        "evidence_event",
        event.user.name,
        event.user.experimental_condition,
        event.concept?.name ?? "",
        event.event_type,
        event.evidence_value,
        event.confidence_rating ?? "",
        event.id,
        metadata.scoring_provider ?? "",
        metadata.scoring_model ?? "",
        metadata.requires_expert_validation ?? "",
        metadata.uncertainty_flags ?? "",
        metadata.simulated || metadata.completed_early ? "excluded_simulated_or_early" : metadata.analysis_inclusion_status ?? "",
        metadata.provider_error ?? "",
        event.metadata,
        event.created_at.toISOString()
      ];
    }),
    ...expertReviews.map((review) => [
      "expert_review",
      review.reviewer.name,
      "BLIND_EXPERT",
      review.concept.name,
      review.review_target_type,
      review.expert_transfer_score ?? review.expert_explanation_quality_score ?? "",
      "",
      review.review_target_id,
      "",
      "",
      "",
      "",
      "expert_primary",
      "",
      {
        ai_score: review.ai_score,
        ai_misconception_labels: review.ai_misconception_labels,
        expert_misconception_labels: review.expert_misconception_labels,
        expert_confidence_calibration_score: review.expert_confidence_calibration_score,
        notes: review.notes
      },
      review.created_at.toISOString()
    ])
  ];

  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=mfl-engine-export.csv"
    }
  });
}
