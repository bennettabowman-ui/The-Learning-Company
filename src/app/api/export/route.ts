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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId");

  if (!domainId) {
    return new Response("domainId is required", { status: 400 });
  }

  const [responses, transfers, probes, evidence] = await Promise.all([
    prisma.learnerResponse.findMany({
      where: { assessmentItem: { domain_id: domainId } },
      include: { user: true, assessmentItem: { include: { concept: true } } }
    }),
    prisma.transferAttempt.findMany({ where: { domain_id: domainId }, include: { user: true } }),
    prisma.retentionProbe.findMany({ where: { domain_id: domainId }, include: { user: true, concept: true } }),
    prisma.evidenceEvent.findMany({ where: { domain_id: domainId }, include: { user: true, concept: true } })
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
      probe.result,
      (probe.completed_at ?? probe.scheduled_at).toISOString()
    ]),
    ...evidence.map((event) => [
      "evidence_event",
      event.user.name,
      event.user.experimental_condition,
      event.concept?.name ?? "",
      event.event_type,
      event.evidence_value,
      event.confidence_rating ?? "",
      event.id,
      event.metadata,
      event.created_at.toISOString()
    ])
  ];

  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=mfl-engine-export.csv"
    }
  });
}
