"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Database,
  Download,
  Flame,
  Gem,
  Home,
  MessageSquare,
  Microscope,
  NotebookPen,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sun,
  Target,
  Zap,
  Wrench
} from "lucide-react";

type ViewKey =
  | "Pilot Brief"
  | "Domain Setup"
  | "Diagnostic"
  | "Repair Lab"
  | "Transfer"
  | "Retention"
  | "Learner Mastery"
  | "Research";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "LEARNER";
  experimental_condition: "CONTROL" | "EXPERIMENTAL";
};

type LearnerAssignmentChoice = "AUTO_RANDOMIZED" | "CONTROL" | "EXPERIMENTAL";

type Concept = {
  id: string;
  domain_id: string;
  name: string;
  description: string;
  importance_score: number;
  difficulty_score: number;
};

type Misconception = {
  id: string;
  domain_id: string;
  concept_id: string;
  name: string;
  description: string;
  typical_signals: unknown;
  repair_strategy: string;
  example_wrong_answer: string;
  expert_correction: string;
  concept?: Concept;
};

type AssessmentItem = {
  id: string;
  domain_id: string;
  concept_id: string;
  item_type: string;
  prompt: string;
  correct_answer: string;
  scoring_rubric: unknown;
  target_misconceptions: unknown;
  difficulty: number;
  transfer_distance: number;
};

type Domain = {
  id: string;
  name: string;
  description: string;
  target_learner: string;
  learner_role: string;
  business_goal: string;
  target_performance_goal: string;
  allowed_source_material: unknown;
  examples: unknown;
  counterexamples: unknown;
  near_miss_cases: unknown;
  real_world_scenarios: unknown;
  transfer_scenarios: unknown;
  scoring_rubrics: unknown;
  expert_explanations: unknown;
  concepts: Concept[];
  misconceptions: Misconception[];
  assessmentItems: AssessmentItem[];
};

type ConceptState = {
  id: string;
  concept_id: string;
  recall_strength: number;
  explanation_quality: number;
  application_accuracy: number;
  transfer_score: number;
  confidence_calibration: number;
  misconception_probability: number;
  retention_risk: number;
  mastery_level: string;
  concept: Concept;
};

type MisconceptionState = {
  id: string;
  misconception_id: string;
  probability: number;
  confidence_weighted_error_score: number;
  evidence_count: number;
  status: string;
  misconception: Misconception & { concept: Concept };
};

type RetentionProbe = {
  id: string;
  concept_id: string;
  scheduled_at: string;
  completed_at: string | null;
  score: number | null;
  confidence_rating: number | null;
  result: unknown;
  simulated: boolean;
  completed_early: boolean;
  concept: Concept;
};

type Dashboard = {
  conceptStates: ConceptState[];
  misconceptionStates: MisconceptionState[];
  responses: Array<{ id: string; ai_score: number; confidence_rating: number; created_at: string }>;
  transfers: Array<{ id: string; score: number; confidence_rating: number; created_at: string }>;
  probes: RetentionProbe[];
  evidence: Array<{ id: string; event_type: string; evidence_value: number; created_at: string }>;
  nextRecommendedPractice: string;
};

type Research = {
  learners: Array<{
    user_id: string;
    name: string;
    condition: string;
    diagnostic_score: number | null;
    immediate_transfer_score: number | null;
    delayed_retention_score: number | null;
    ai_diagnostic_score: number | null;
    ai_immediate_transfer_score: number | null;
    ai_delayed_retention_score: number | null;
    expert_review_count: number;
    primary_outcome_source: string;
    high_confidence_errors: number;
  }>;
  conditions: Array<{
    condition: string;
    learner_count: number;
    diagnostic_score: number | null;
    immediate_transfer_score: number | null;
    delayed_retention_score: number | null;
    ai_diagnostic_score: number | null;
    ai_immediate_transfer_score: number | null;
    ai_delayed_retention_score: number | null;
    expert_review_count: number;
    high_confidence_errors: number;
  }>;
  misconceptionFrequency: Array<{ name: string; count: number; avg_probability: number }>;
  totals: {
    responses: number;
    transfers: number;
    retention_probes: number;
    evidence_events: number;
    expert_reviews: number;
    repair_success_rate: number;
  };
};

type ExpertQueueItem = {
  review_target_type: "learner_response" | "transfer_attempt" | "retention_probe";
  review_target_id: string;
  concept_id: string;
  concept_name: string;
  assessment_item_id?: string;
  item_type: string;
  prompt: string;
  response_text: string;
};

type CalibrationMetrics = {
  review_count: number;
  scored_pair_count: number;
  minimum_n_for_agreement: number;
  agreement_status: "insufficient_n" | "reportable";
  mean_absolute_error: number | null;
  bias_ai_minus_expert: number | null;
  pearson_correlation: number | null;
  spearman_correlation: number | null;
  quadratic_weighted_kappa: number | null;
  misconception_precision: number | null;
  misconception_recall: number | null;
  misconception_f1: number | null;
};

type CalibrationResponse = {
  overall: CalibrationMetrics;
  byTargetType: Array<CalibrationMetrics & { review_target_type: string }>;
};

type RepairStep = {
  label: string;
  prompt: string;
};

type Bootstrap = {
  users: User[];
  domain: Domain | null;
};

const demoConcepts: Concept[] = [
  {
    id: "demo-concept-auth",
    domain_id: "demo-domain",
    name: "Authentication",
    description: "How an API verifies the identity of a caller.",
    importance_score: 5,
    difficulty_score: 2
  },
  {
    id: "demo-concept-permissions",
    domain_id: "demo-domain",
    name: "Authorization",
    description: "How the API decides whether an authenticated caller may perform an action.",
    importance_score: 5,
    difficulty_score: 3
  },
  {
    id: "demo-concept-diagnosis",
    domain_id: "demo-domain",
    name: "Integration failure diagnosis",
    description: "Distinguishing auth, permissions, rate limits, environment mismatch, and policy issues.",
    importance_score: 5,
    difficulty_score: 5
  }
];

const demoMisconceptions: Misconception[] = [
  {
    id: "demo-misconception-token",
    domain_id: "demo-domain",
    concept_id: "demo-concept-permissions",
    name: "Valid token means sufficient permission",
    description: "Assumes that once a token is accepted, all requested API actions should work.",
    typical_signals: ["valid token", "authenticated so allowed"],
    repair_strategy: "Contrast identity verification with action authorization using same-token different-scope cases.",
    example_wrong_answer: "The token is valid, so the issue cannot be permissions.",
    expert_correction: "A token can authenticate identity while still lacking scopes or permissions for a specific action."
  },
  {
    id: "demo-misconception-all-auth",
    domain_id: "demo-domain",
    concept_id: "demo-concept-diagnosis",
    name: "All API errors are authentication errors",
    description: "Treats failures as token problems without checking rate limits, scopes, roles, policies, or environment.",
    typical_signals: ["refresh the token", "auth issue"],
    repair_strategy: "Ask learners to separate symptoms and fixes across 401, 403, 429, and environment mismatch cases.",
    example_wrong_answer: "Generate a new token and retry because API errors usually mean auth failed.",
    expert_correction: "API failures need differential diagnosis across identity, permissions, quota, environment, and policy."
  }
];

const demoBootstrap: Bootstrap = {
  users: [
    {
      id: "demo-admin",
      name: "Admin Researcher",
      email: "admin@mfl.local",
      role: "ADMIN",
      experimental_condition: "EXPERIMENTAL"
    },
    {
      id: "demo-learner",
      name: "Avery Experimental",
      email: "avery@mfl.local",
      role: "LEARNER",
      experimental_condition: "EXPERIMENTAL"
    }
  ],
  domain: {
    id: "demo-domain",
    name: "API Authentication and Permissions",
    description: "Technical onboarding for B2B software sales engineers learning API authentication, permissions, and integration diagnosis.",
    target_learner: "New sales engineers, solutions engineers, customer success engineers, and technical support specialists.",
    learner_role: "B2B software sales engineer",
    business_goal: "Reduce time-to-proficiency by repairing misconceptions before customer-facing technical scenarios.",
    target_performance_goal: "Correctly diagnose novel API auth and permission failures with calibrated confidence.",
    allowed_source_material: [
      {
        title: "API auth onboarding source",
        content:
          "Authentication proves identity. Authorization determines what that identity can do. Valid tokens can still lack scopes, roles, organization policy, or user-level permission."
      }
    ],
    examples: ["Valid token with insufficient scope returns a permission failure."],
    counterexamples: ["A valid token does not imply all actions are allowed."],
    near_miss_cases: ["403 from missing scope versus 401 from invalid credential."],
    real_world_scenarios: ["Integration works for most users but fails for a subset after role changes."],
    transfer_scenarios: ["Customer says integration worked yesterday but now fails for only one subset of users."],
    scoring_rubrics: {
      explanation_quality: "0 no meaningful explanation; 5 clear causal transferable explanation",
      transfer: "0 cannot apply; 5 adapts flexibly and explains limits"
    },
    expert_explanations: ["Separate identity, permission, environment, quota, and organization policy before recommending a fix."],
    concepts: demoConcepts,
    misconceptions: demoMisconceptions,
    assessmentItems: [
      {
        id: "demo-item-auth",
        domain_id: "demo-domain",
        concept_id: "demo-concept-permissions",
        item_type: "explain",
        prompt: "In your own words, explain the difference between authentication and authorization for an API request.",
        correct_answer: "Authentication verifies identity. Authorization determines whether that identity can perform the action.",
        scoring_rubric: {},
        target_misconceptions: ["demo-misconception-token"],
        difficulty: 2,
        transfer_distance: 1
      },
      {
        id: "demo-item-transfer",
        domain_id: "demo-domain",
        concept_id: "demo-concept-diagnosis",
        item_type: "transfer",
        prompt:
          "A customer says their integration worked yesterday but now fails for only one subset of users. What would you check first and why?",
        correct_answer: "Check user role changes, org policy, audit logs, token validity, scopes, environment, and rate-limit signals.",
        scoring_rubric: {},
        target_misconceptions: ["demo-misconception-all-auth"],
        difficulty: 5,
        transfer_distance: 5
      }
    ]
  }
};

function BookLogo() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <path d="M18 10.5C14.6 7.9 10.8 6.7 6.7 6.4v16.4c4 .3 7.8 1.6 11.3 4.1V10.5Z" fill="#35b86f" />
      <path d="M18 10.5c3.4-2.6 7.2-3.8 11.3-4.1v16.4c-4 .3-7.8 1.6-11.3 4.1V10.5Z" fill="#64d494" />
      <path d="M18 10.5v16.4" stroke="#168449" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const nav: Array<{ key: ViewKey; label: string; icon: ComponentType<{ size?: number }> }> = [
  { key: "Pilot Brief", label: "Home", icon: Home },
  { key: "Domain Setup", label: "Domain", icon: Database },
  { key: "Diagnostic", label: "Diagnostic", icon: ClipboardList },
  { key: "Repair Lab", label: "Repair", icon: Wrench },
  { key: "Transfer", label: "Transfer", icon: Target },
  { key: "Retention", label: "Retention", icon: CalendarClock },
  { key: "Learner Mastery", label: "Mastery", icon: BarChart3 },
  { key: "Research", label: "Research", icon: Microscope }
];

const pilotCards = [
  {
    title: "Why this exists",
    body:
      "Complex technical onboarding fails when learners carry hidden misconceptions into customer work. The MVP makes those misconceptions visible before they become field mistakes."
  },
  {
    title: "Study goal",
    body:
      "Test whether misconception-first Socratic repair improves delayed transfer performance compared with a standard explanation path."
  },
  {
    title: "How it works",
    body:
      "The system collects confidence-rated reasoning, estimates misconception risk, repairs the highest-risk mental model, and tests transfer on a novel scenario."
  },
  {
    title: "Expected result",
    body:
      "A usable pilot should produce joinable learner evidence, expert blind scores, scorer provenance, and a delayed-transfer outcome for each participant."
  }
];

const pilotLoop = [
  "Create learner with auto-balanced assignment",
  "Complete diagnostic with confidence ratings",
  "Run repair or control explanation",
  "Score immediate transfer",
  "Collect T+24h retention probe",
  "Blind-score artifacts",
  "Export CSV and inspect provenance"
];

const pilotAcceptance = [
  "At least one learner completes diagnostic and immediate transfer",
  "At least one delayed probe is completed",
  "At least three artifacts receive expert blind review",
  "Fallback-scored rows are visible and filterable",
  "Calibration endpoint reports review counts"
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function score(value: number | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(1);
}

function metricValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(2);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "learner";
}

function statusClass(value: number) {
  if (value >= 0.7) return "red";
  if (value >= 0.4) return "amber";
  return "green";
}

function labelFromStepType(stepType: string) {
  return stepType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ConfidenceControl({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="confidence" aria-label="Confidence rating from 1 to 5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={value === rating ? "active" : ""}
          onClick={() => onChange(rating)}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

function TopMetrics({ dashboard, research }: { dashboard: Dashboard | null; research: Research | null }) {
  const transfer = dashboard?.transfers[0]?.score ?? 0;
  const likely = dashboard?.misconceptionStates.filter((state) => state.probability >= 0.5).length ?? 0;
  const retentionRisk =
    dashboard?.conceptStates.reduce((max, state) => Math.max(max, state.retention_risk), 0) ?? 0;

  return (
    <div className="metric-row">
      <div className="metric">
        <span className="small-label">Transfer readiness</span>
        <span className="metric-value">{score(transfer)}/5</span>
      </div>
      <div className="metric">
        <span className="small-label">Likely misconceptions</span>
        <span className="metric-value">{likely}</span>
      </div>
      <div className="metric">
        <span className="small-label">Retention risk</span>
        <span className="metric-value">{pct(retentionRisk)}</span>
      </div>
      <div className="metric">
        <span className="small-label">Evidence events</span>
        <span className="metric-value">{research?.totals.evidence_events ?? 0}</span>
      </div>
    </div>
  );
}

function HeaderStat({
  icon: Icon,
  value,
  label,
  tone = "green"
}: {
  icon: ComponentType<{ size?: number }>;
  value: string | number;
  label: string;
  tone?: "green" | "blue" | "amber";
}) {
  return (
    <div className={`header-stat ${tone}`}>
      <Icon size={18} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function MflApp() {
  const [activeView, setActiveView] = useState<ViewKey>("Pilot Brief");
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [research, setResearch] = useState<Research | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function loadBootstrap() {
    try {
      const response = await fetch("/api/bootstrap");
      if (!response.ok) {
        throw new Error(`Bootstrap failed with ${response.status}`);
      }
      const data = (await response.json()) as Bootstrap;
      if (!data.domain || data.users.length === 0) {
        throw new Error("Bootstrap returned no domain or users");
      }
      setDemoMode(false);
      setError("");
      setBootstrap(data);
      setCurrentUserId(
        (existing) => existing || data.users.find((user) => user.role === "LEARNER")?.id || data.users[0]?.id || ""
      );
      return data;
    } catch (err) {
      setDemoMode(true);
      setBootstrap(demoBootstrap);
      setDashboard(null);
      setResearch(null);
      setCurrentUserId((existing) => existing || demoBootstrap.users.find((user) => user.role === "LEARNER")?.id || "");
      setError(
        `Demo mode: backend seed data is unavailable. Configure DATABASE_URL and run migrations to enable saved learner actions. ${
          err instanceof Error ? err.message : "Unknown bootstrap error"
        }`
      );
      return demoBootstrap;
    }
  }

  async function loadRuntime(userId = currentUserId, domainId = bootstrap?.domain?.id) {
    if (demoMode) return;
    if (!userId || !domainId) return;
    const [dashboardResponse, researchResponse] = await Promise.all([
      fetch(`/api/dashboard?userId=${userId}&domainId=${domainId}`),
      fetch(`/api/research?domainId=${domainId}`)
    ]);
    if (!dashboardResponse.ok || !researchResponse.ok) {
      throw new Error("Runtime dashboard data could not be loaded");
    }
    setDashboard((await dashboardResponse.json()) as Dashboard);
    setResearch((await researchResponse.json()) as Research);
  }

  async function refreshAll() {
    setError("");
    const data = await loadBootstrap();
    if (data !== demoBootstrap && data.domain) {
      const nextUserId = currentUserId || data.users.find((user) => user.role === "LEARNER")?.id || data.users[0]?.id || "";
      await loadRuntime(nextUserId, data.domain.id);
    }
  }

  useEffect(() => {
    loadBootstrap().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (demoMode) return;
    loadRuntime().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, bootstrap?.domain?.id, demoMode]);

  const domain = bootstrap?.domain ?? null;
  const users = bootstrap?.users ?? [];
  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];
  const title =
    activeView === "Pilot Brief"
      ? `Good morning, ${firstName(currentUser?.name ?? "")}`
      : activeView === "Research"
        ? "Research cohort"
        : activeView;

  if (!bootstrap || !domain || !currentUser) {
    return (
      <main className="main">
        <div className="panel">
          <h1 className="section-title">MFL Engine</h1>
          <p className="section-copy">Loading seed data. Run `npx prisma db push` and `npm run db:seed` if this remains empty.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BookLogo />
          </div>
          <div>
            <p className="brand-title">The Learning Company</p>
            <p className="brand-subtitle">MFL Engine</p>
          </div>
        </div>

        <div className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-button ${activeView === item.key ? "active" : ""}`}
                onClick={() => setActiveView(item.key)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="sidebar-card">
          <div className="sidebar-card-icon">
            <Flame size={18} />
          </div>
          <div>
            <p className="brand-subtitle">Current pilot</p>
            <strong>{research?.totals.evidence_events ?? 0} evidence events</strong>
            <p className="brand-subtitle">Collect first human data</p>
          </div>
          <div className="week-dots" aria-label="Pilot progress markers">
            {[0, 1, 2, 3, 4].map((item) => (
              <span key={item} className={item < Math.min(5, research?.totals.evidence_events ?? 0) ? "active" : ""} />
            ))}
          </div>
        </div>

        <div className="user-panel">
          <div className="field">
            <label htmlFor="user">Prototype login</label>
            <select id="user" value={currentUser.id} onChange={(event) => setCurrentUserId(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.experimental_condition}
                </option>
              ))}
            </select>
          </div>
          <p className="brand-subtitle" style={{ marginTop: 10 }}>
            {currentUser.email}
          </p>
          <span className={`status ${currentUser.experimental_condition === "EXPERIMENTAL" ? "green" : "amber"}`}>
            {currentUser.experimental_condition.toLowerCase()}
          </span>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>
              {title}
              {activeView === "Pilot Brief" ? <Sun className="title-sun" size={27} /> : null}
            </h1>
            <p>
              {activeView === "Pilot Brief"
                ? "What misconception will you repair today?"
                : `${domain.name}: diagnose hidden misconceptions, repair them through active reasoning, and measure delayed transfer.`}
            </p>
          </div>
          <div className="topbar-actions">
            <HeaderStat icon={Zap} value={research?.totals.evidence_events ?? 0} label="Evidence events" tone="amber" />
            <HeaderStat icon={Gem} value={research?.totals.expert_reviews ?? 0} label="Expert reviews" tone="blue" />
            <button className="button" onClick={() => refreshAll()} disabled={busy}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {error ? <div className="feedback">{error}</div> : null}
        {activeView === "Pilot Brief" ? null : <TopMetrics dashboard={dashboard} research={research} />}

        {activeView === "Pilot Brief" ? (
          <PilotBrief
            domain={domain}
            dashboard={dashboard}
            research={research}
            onStartDiagnostic={() => setActiveView("Diagnostic")}
            onOpenResearch={() => setActiveView("Research")}
          />
        ) : null}
        {activeView === "Domain Setup" ? (
          <DomainSetup domain={domain} onRefresh={refreshAll} busy={busy} setBusy={setBusy} />
        ) : null}
        {activeView === "Diagnostic" ? (
          <DiagnosticScreen
            domain={domain}
            user={currentUser}
            dashboard={dashboard}
            onRefresh={refreshAll}
            busy={busy}
            setBusy={setBusy}
          />
        ) : null}
        {activeView === "Repair Lab" ? (
          <RepairScreen
            domain={domain}
            user={currentUser}
            dashboard={dashboard}
            onRefresh={refreshAll}
            busy={busy}
            setBusy={setBusy}
          />
        ) : null}
        {activeView === "Transfer" ? (
          <TransferScreen domain={domain} user={currentUser} onRefresh={refreshAll} busy={busy} setBusy={setBusy} />
        ) : null}
        {activeView === "Retention" ? (
          <RetentionScreen
            domain={domain}
            user={currentUser}
            dashboard={dashboard}
            onRefresh={refreshAll}
            busy={busy}
            setBusy={setBusy}
          />
        ) : null}
        {activeView === "Learner Mastery" ? <MasteryScreen dashboard={dashboard} /> : null}
        {activeView === "Research" ? (
          <ResearchScreen
            domain={domain}
            user={currentUser}
            research={research}
            onRefresh={refreshAll}
            busy={busy}
            setBusy={setBusy}
          />
        ) : null}
      </main>
    </div>
  );
}

function PilotBrief({
  domain,
  dashboard,
  research,
  onStartDiagnostic,
  onOpenResearch
}: {
  domain: Domain;
  dashboard: Dashboard | null;
  research: Research | null;
  onStartDiagnostic: () => void;
  onOpenResearch: () => void;
}) {
  const learnerCount = research?.conditions.reduce((sum, row) => sum + row.learner_count, 0) ?? 0;
  const expertReviews = research?.totals.expert_reviews ?? 0;
  const retentionProbes = research?.totals.retention_probes ?? 0;
  const conceptStates = dashboard?.conceptStates ?? [];
  const responses = dashboard?.responses ?? [];
  const transfers = dashboard?.transfers ?? [];
  const probes = dashboard?.probes ?? [];
  const likelyMisconceptions = dashboard?.misconceptionStates.filter((state) => state.probability >= 0.5) ?? [];
  const explanationPct = Math.round(average(conceptStates.map((state) => state.explanation_quality / 5)) * 100);
  const applicationPct = Math.round(average(conceptStates.map((state) => state.application_accuracy / 5)) * 100);
  const transferPct = Math.round(average(conceptStates.map((state) => state.transfer_score / 5)) * 100);
  const misconceptionPct = Math.round((1 - average(conceptStates.map((state) => state.misconception_probability))) * 100);
  const retentionPct = Math.round((1 - average(conceptStates.map((state) => state.retention_risk))) * 100);
  const masteryPct = Math.round(average([explanationPct, applicationPct, transferPct, misconceptionPct, retentionPct]));
  const nextPractice = dashboard?.nextRecommendedPractice ?? "Run the diagnostic to create the first evidence row.";
  const immediateTransfer = transfers[0]?.score ?? 0;
  const nextProbe = probes.find((probe) => !probe.completed_at) ?? probes[0];
  const transferItem = domain.assessmentItems.find((item) => item.item_type === "transfer");

  const pathCards = [
    {
      icon: CheckCircle2,
      step: 1,
      title: "Diagnostic Check",
      status: responses.length ? "Completed" : "Ready",
      tone: "green",
      progress: responses.length ? 100 : 12
    },
    {
      icon: MessageSquare,
      step: 2,
      title: "Misconception Repair",
      status: likelyMisconceptions.length ? "In progress" : responses.length ? "Ready" : "Locked",
      tone: "purple",
      progress: likelyMisconceptions.length ? 42 : responses.length ? 18 : 0
    },
    {
      icon: Target,
      step: 3,
      title: "Transfer Challenge",
      status: transfers.length ? "Completed" : "Not started",
      tone: "amber",
      progress: transfers.length ? 100 : 0
    },
    {
      icon: CalendarClock,
      step: 4,
      title: "Delayed Retention",
      status: probes.some((probe) => probe.completed_at) ? "Completed" : probes.length ? "Scheduled" : "Locked",
      tone: "blue",
      progress: probes.some((probe) => probe.completed_at) ? 100 : probes.length ? 35 : 0
    }
  ];

  const understanding = [
    { label: "Auth Flow", value: explanationPct },
    { label: "Permissions", value: applicationPct },
    { label: "Error Diagnosis", value: transferPct },
    { label: "Environments", value: retentionPct },
    { label: "API Concepts", value: misconceptionPct }
  ];

  return (
    <div className="home-dashboard">
      <div className="home-main">
        <section className="focus-card">
          <div>
            <span className="focus-label">Today&apos;s focus</span>
            <h2>API Auth & Permissions</h2>
            <p>Understand how authentication, permissions, environments, and integration failures work together.</p>
            <div className="focus-actions">
              <button className="button primary light" onClick={onStartDiagnostic}>
                Continue lesson
                <ArrowRight size={17} />
              </button>
              <span className="time-note">
                <Clock3 size={15} />
                7 min estimated
              </span>
            </div>
          </div>
          <div className="mastery-orbit">
            <div
              className="mastery-ring"
              style={{
                background: `conic-gradient(#35d17d ${masteryPct * 3.6}deg, rgba(255,255,255,0.14) 0deg)`
              }}
            >
              <div>
                <strong>{masteryPct}%</strong>
                <span>Mastery</span>
              </div>
            </div>
          </div>
        </section>

        <section className="path-section">
          <div className="section-heading-row">
            <h2>Your learning path</h2>
            <button className="text-link" onClick={onOpenResearch}>
              View research <ArrowRight size={14} />
            </button>
          </div>
          <div className="learning-path">
            {pathCards.map((card) => {
              const Icon = card.icon;
              return (
                <div className={`path-card ${card.tone}`} key={card.title}>
                  <div className="path-icon">
                    <Icon size={18} />
                  </div>
                  <span className="path-step">{card.step}</span>
                  <strong>{card.title}</strong>
                  <div className="path-progress">
                    <span style={{ width: `${card.progress}%` }} />
                  </div>
                  <p>{card.status}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="continue-section">
          <h2>Continue where you left off</h2>
          <div className="continue-grid">
            <div className="continue-card wave-card">
              <div>
                <strong>Socratic Repair</strong>
                <p>{nextPractice}</p>
              </div>
              <button className="text-link" onClick={onStartDiagnostic}>
                Continue <ArrowRight size={14} />
              </button>
            </div>
            <div className="continue-card">
              <div>
                <strong>Last Challenge</strong>
                <p>{transferItem?.prompt ?? "Complete a novel API failure scenario after repair."}</p>
              </div>
              <div className="challenge-row">
                <span>{score(immediateTransfer)}/5 transfer</span>
                <div className="mini-terminal">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="path-progress">
                <span style={{ width: `${Math.round((immediateTransfer / 5) * 100)}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="panel brief-panel">
          <h2>Why, goal, method, result</h2>
          <div className="brief-grid">
            {pilotCards.map((card) => (
              <div key={card.title}>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="home-rail">
        <section className="panel understanding-card">
          <h2>Your understanding</h2>
          <UnderstandingRadar values={understanding} />
        </section>

        <section className="panel insights-card">
          <h2>Insights</h2>
          <InsightRow
            icon={Activity}
            tone="red"
            label="Weakest area"
            value={likelyMisconceptions[0]?.misconception.name ?? "Run diagnostic"}
          />
          <InsightRow
            icon={ArrowRight}
            tone="green"
            label="Next best lesson"
            value={nextPractice}
          />
          <InsightRow icon={Clock3} tone="amber" label="Retention risk" value={`${100 - retentionPct}% risk`} />
          <InsightRow icon={ShieldCheck} tone="purple" label="Expert reviews" value={`${expertReviews} submitted`} />
        </section>

        <section className="panel upcoming-card">
          <div className="section-heading-row">
            <h2>Upcoming review</h2>
            <span className="brand-subtitle">{retentionProbes} probes</span>
          </div>
          <div className="review-list">
            <ReviewRow
              title={nextProbe?.concept.name ?? "Delayed retention probe"}
              due={nextProbe ? new Date(nextProbe.scheduled_at).toLocaleDateString() : "After transfer"}
            />
            <ReviewRow title="Expert calibration" due={`${expertReviews} reviews`} />
          </div>
          <button className="text-link" onClick={onOpenResearch}>
            View all reviews <ArrowRight size={14} />
          </button>
        </section>

        <section className="panel pilot-mini">
          <h2>First data point</h2>
          <p className="brand-subtitle">
            {learnerCount} learners assigned. Complete these checks before adding more pilot participants.
          </p>
          <div className="pilot-loop compact">
            {pilotLoop.slice(0, 4).map((step, index) => (
              <div className="flow-step" key={step}>
                <span className="small-label">Step {index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
          <div className="acceptance-list">
            {pilotAcceptance.slice(0, 3).map((item) => (
              <span key={item}>
                <CheckCircle2 size={13} />
                {item}
              </span>
            ))}
          </div>
          <p className="brand-subtitle">Full checklist: docs/PILOT_PACKET.md</p>
        </section>
      </aside>
    </div>
  );
}

function UnderstandingRadar({ values }: { values: Array<{ label: string; value: number }> }) {
  const center = 92;
  const radius = 58;
  const chartPoints = values
    .map((item, index) => {
      const angle = (-90 + index * 72) * (Math.PI / 180);
      const distance = Math.max(5, radius * (item.value / 100));
      return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
    })
    .join(" ");
  const gridRings = [0.35, 0.65, 1].map((scale) =>
    values
      .map((_, index) => {
        const angle = (-90 + index * 72) * (Math.PI / 180);
        return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
      })
      .join(" ")
  );

  return (
    <div className="radar-wrap">
      <svg className="radar-chart" viewBox="0 0 184 184" aria-label="Understanding by concept area">
        {gridRings.map((points) => (
          <polygon key={points} points={points} fill="none" stroke="#e5eaf2" strokeWidth="1" />
        ))}
        {values.map((_, index) => {
          const angle = (-90 + index * 72) * (Math.PI / 180);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={center + Math.cos(angle) * radius}
              y2={center + Math.sin(angle) * radius}
              stroke="#edf1f6"
              strokeWidth="1"
            />
          );
        })}
        <polygon points={chartPoints} fill="rgba(53, 209, 125, 0.22)" stroke="#1fb65d" strokeWidth="2" />
        {values.map((item, index) => {
          const angle = (-90 + index * 72) * (Math.PI / 180);
          const distance = Math.max(5, radius * (item.value / 100));
          return <circle key={item.label} cx={center + Math.cos(angle) * distance} cy={center + Math.sin(angle) * distance} r="3.5" fill="#1fb65d" />;
        })}
      </svg>
      <div className="radar-labels">
        {values.map((item) => (
          <span key={item.label}>
            {item.label} <strong>{item.value}%</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  tone,
  label,
  value
}: {
  icon: ComponentType<{ size?: number }>;
  tone: "red" | "green" | "amber" | "purple";
  label: string;
  value: string;
}) {
  return (
    <div className="insight-row">
      <span className={`insight-icon ${tone}`}>
        <Icon size={17} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <ArrowRight size={15} />
    </div>
  );
}

function ReviewRow({ title, due }: { title: string; due: string }) {
  return (
    <div className="review-row">
      <span className="review-icon">
        <NotebookPen size={15} />
      </span>
      <strong>{title}</strong>
      <span>{due}</span>
    </div>
  );
}

function DomainSetup({
  domain,
  onRefresh,
  busy,
  setBusy
}: {
  domain: Domain;
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: domain.name,
    description: domain.description,
    target_learner: domain.target_learner,
    learner_role: domain.learner_role,
    business_goal: domain.business_goal,
    target_performance_goal: domain.target_performance_goal
  });
  const [concept, setConcept] = useState({
    name: "",
    description: "",
    importance_score: 4,
    difficulty_score: 3
  });
  const [misconception, setMisconception] = useState({
    concept_id: domain.concepts[0]?.id ?? "",
    name: "",
    description: "",
    typical_signals: "",
    repair_strategy: "",
    example_wrong_answer: "",
    expert_correction: ""
  });
  const [item, setItem] = useState({
    concept_id: domain.concepts[0]?.id ?? "",
    item_type: "explain",
    prompt: "",
    correct_answer: "",
    target_misconception: domain.misconceptions[0]?.id ?? "",
    difficulty: 3,
    transfer_distance: 2
  });

  useEffect(() => {
    setForm({
      name: domain.name,
      description: domain.description,
      target_learner: domain.target_learner,
      learner_role: domain.learner_role,
      business_goal: domain.business_goal,
      target_performance_goal: domain.target_performance_goal
    });
  }, [domain]);

  async function saveDomain() {
    setBusy(true);
    try {
      await postJson("/api/domain", {
        id: domain.id,
        ...form,
        allowed_source_material: domain.allowed_source_material,
        examples: domain.examples,
        counterexamples: domain.counterexamples,
        near_miss_cases: domain.near_miss_cases,
        real_world_scenarios: domain.real_world_scenarios,
        transfer_scenarios: domain.transfer_scenarios,
        scoring_rubrics: domain.scoring_rubrics,
        expert_explanations: domain.expert_explanations
      });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function addConcept() {
    setBusy(true);
    try {
      await postJson("/api/concepts", {
        domain_id: domain.id,
        ...concept,
        prerequisite_concept_ids: []
      });
      setConcept({ name: "", description: "", importance_score: 4, difficulty_score: 3 });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function addMisconception() {
    setBusy(true);
    try {
      await postJson("/api/misconceptions", {
        domain_id: domain.id,
        ...misconception,
        typical_signals: misconception.typical_signals
          .split(",")
          .map((signal) => signal.trim())
          .filter(Boolean)
      });
      setMisconception({
        concept_id: domain.concepts[0]?.id ?? "",
        name: "",
        description: "",
        typical_signals: "",
        repair_strategy: "",
        example_wrong_answer: "",
        expert_correction: ""
      });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    setBusy(true);
    try {
      await postJson("/api/assessment-items", {
        domain_id: domain.id,
        concept_id: item.concept_id,
        item_type: item.item_type,
        prompt: item.prompt,
        correct_answer: item.correct_answer,
        target_misconceptions: item.target_misconception ? [item.target_misconception] : [],
        difficulty: item.difficulty,
        transfer_distance: item.transfer_distance,
        scoring_rubric: {
          explanation_quality: "0 no explanation; 5 clear causal transferable explanation",
          transfer: "0 cannot apply; 5 flexible novel transfer with limits"
        }
      });
      setItem({
        concept_id: domain.concepts[0]?.id ?? "",
        item_type: "explain",
        prompt: "",
        correct_answer: "",
        target_misconception: domain.misconceptions[0]?.id ?? "",
        difficulty: 3,
        transfer_distance: 2
      });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h2>Domain model</h2>
        <div className="form-grid">
          <TextField label="Domain name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <TextField
            label="Learner role"
            value={form.learner_role}
            onChange={(value) => setForm({ ...form, learner_role: value })}
          />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
          <TextArea
            label="Target learner"
            value={form.target_learner}
            onChange={(value) => setForm({ ...form, target_learner: value })}
          />
          <TextArea
            label="Business goal"
            value={form.business_goal}
            onChange={(value) => setForm({ ...form, business_goal: value })}
          />
          <TextArea
            label="Target performance goal"
            value={form.target_performance_goal}
            onChange={(value) => setForm({ ...form, target_performance_goal: value })}
          />
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={saveDomain} disabled={busy}>
          <ShieldCheck size={15} />
          Save domain
        </button>
      </section>

      <section className="panel">
        <h2>Concepts and misconceptions</h2>
        <div className="table-wrap" style={{ marginBottom: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Concept</th>
                <th>Importance</th>
                <th>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {domain.concepts.map((existingConcept) => (
                <tr key={existingConcept.id}>
                  <td>
                    <strong>{existingConcept.name}</strong>
                    <p className="brand-subtitle">{existingConcept.description}</p>
                  </td>
                  <td>{existingConcept.importance_score}</td>
                  <td>{existingConcept.difficulty_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-grid">
          <TextField label="New concept" value={concept.name} onChange={(value) => setConcept({ ...concept, name: value })} />
          <TextField
            label="Importance 1-5"
            type="number"
            value={String(concept.importance_score)}
            onChange={(value) => setConcept({ ...concept, importance_score: Number(value) })}
          />
          <TextArea
            label="Concept description"
            value={concept.description}
            onChange={(value) => setConcept({ ...concept, description: value })}
          />
          <TextField
            label="Difficulty 1-5"
            type="number"
            value={String(concept.difficulty_score)}
            onChange={(value) => setConcept({ ...concept, difficulty_score: Number(value) })}
          />
        </div>
        <button className="button" style={{ marginTop: 12 }} onClick={addConcept} disabled={busy || !concept.name}>
          <Plus size={15} />
          Add concept
        </button>
      </section>

      <section className="panel">
        <h2>Add misconception</h2>
        <div className="form-grid">
          <SelectField
            label="Concept"
            value={misconception.concept_id}
            onChange={(value) => setMisconception({ ...misconception, concept_id: value })}
            options={domain.concepts.map((item) => ({ label: item.name, value: item.id }))}
          />
          <TextField
            label="Name"
            value={misconception.name}
            onChange={(value) => setMisconception({ ...misconception, name: value })}
          />
          <TextArea
            label="Description"
            value={misconception.description}
            onChange={(value) => setMisconception({ ...misconception, description: value })}
          />
          <TextArea
            label="Typical signals, comma separated"
            value={misconception.typical_signals}
            onChange={(value) => setMisconception({ ...misconception, typical_signals: value })}
          />
          <TextArea
            label="Repair strategy"
            value={misconception.repair_strategy}
            onChange={(value) => setMisconception({ ...misconception, repair_strategy: value })}
          />
          <TextArea
            label="Expert correction"
            value={misconception.expert_correction}
            onChange={(value) => setMisconception({ ...misconception, expert_correction: value })}
          />
          <TextArea
            label="Example wrong answer"
            value={misconception.example_wrong_answer}
            onChange={(value) => setMisconception({ ...misconception, example_wrong_answer: value })}
          />
        </div>
        <button className="button" style={{ marginTop: 12 }} onClick={addMisconception} disabled={busy || !misconception.name}>
          <Plus size={15} />
          Add misconception
        </button>
      </section>

      <section className="panel">
        <h2>Add diagnostic or transfer item</h2>
        <div className="form-grid">
          <SelectField
            label="Concept"
            value={item.concept_id}
            onChange={(value) => setItem({ ...item, concept_id: value })}
            options={domain.concepts.map((concept) => ({ label: concept.name, value: concept.id }))}
          />
          <SelectField
            label="Item type"
            value={item.item_type}
            onChange={(value) => setItem({ ...item, item_type: value })}
            options={[
              { label: "explain", value: "explain" },
              { label: "prediction", value: "prediction" },
              { label: "choose_best_action", value: "choose_best_action" },
              { label: "identify_invalid_example", value: "identify_invalid_example" },
              { label: "compare_cases", value: "compare_cases" },
              { label: "transfer", value: "transfer" }
            ]}
          />
          <TextArea label="Prompt" value={item.prompt} onChange={(value) => setItem({ ...item, prompt: value })} />
          <TextArea
            label="Correct answer / expert answer"
            value={item.correct_answer}
            onChange={(value) => setItem({ ...item, correct_answer: value })}
          />
          <SelectField
            label="Target misconception"
            value={item.target_misconception}
            onChange={(value) => setItem({ ...item, target_misconception: value })}
            options={domain.misconceptions.map((misconception) => ({ label: misconception.name, value: misconception.id }))}
          />
          <TextField
            label="Difficulty 1-5"
            type="number"
            value={String(item.difficulty)}
            onChange={(value) => setItem({ ...item, difficulty: Number(value) })}
          />
          <TextField
            label="Transfer distance 1-5"
            type="number"
            value={String(item.transfer_distance)}
            onChange={(value) => setItem({ ...item, transfer_distance: Number(value) })}
          />
        </div>
        <button className="button" style={{ marginTop: 12 }} onClick={addItem} disabled={busy || !item.prompt}>
          <Plus size={15} />
          Add item
        </button>
      </section>
    </div>
  );
}

function DiagnosticScreen({
  domain,
  user,
  dashboard,
  onRefresh,
  busy,
  setBusy
}: {
  domain: Domain;
  user: User;
  dashboard: Dashboard | null;
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const diagnosticItems = domain.assessmentItems.filter((item) => item.item_type !== "transfer");
  const [itemId, setItemId] = useState(diagnosticItems[0]?.id ?? "");
  const [responseText, setResponseText] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [result, setResult] = useState<{ feedback: string; score: number; provider?: string; model?: string } | null>(
    null
  );
  const item = diagnosticItems.find((candidate) => candidate.id === itemId) ?? diagnosticItems[0];

  useEffect(() => {
    if (!itemId && diagnosticItems[0]?.id) setItemId(diagnosticItems[0].id);
  }, [diagnosticItems, itemId]);

  async function submit() {
    if (!item) return;
    setBusy(true);
    try {
      const payload = await postJson<{ result: { feedback: string; score: number; provider?: string; model?: string } }>(
        "/api/responses",
        {
        user_id: user.id,
        assessment_item_id: item.id,
        response_text: responseText,
        confidence_rating: confidence,
        response_time: Math.round((Date.now() - startedAt) / 1000)
        }
      );
      setResult(payload.result);
      setResponseText("");
      setStartedAt(Date.now());
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h2>Diagnostic</h2>
        <div className="field">
          <label htmlFor="diagnostic-item">Question designed to reveal mental model</label>
          <select id="diagnostic-item" value={item?.id ?? ""} onChange={(event) => setItemId(event.target.value)}>
            {diagnosticItems.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.item_type} · difficulty {candidate.difficulty}
              </option>
            ))}
          </select>
        </div>
        <div className="panel compact" style={{ margin: "12px 0" }}>
          <span className="status blue">{item?.item_type}</span>
          <p style={{ lineHeight: 1.5 }}>{item?.prompt}</p>
        </div>
        <TextArea label="Learner answer" value={responseText} onChange={setResponseText} />
        <div className="field" style={{ marginTop: 10 }}>
          <label>Confidence rating required</label>
          <ConfidenceControl value={confidence} onChange={setConfidence} />
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={submit} disabled={busy || !responseText.trim()}>
          <Send size={15} />
          Submit diagnostic evidence
        </button>
        {result ? (
          <div className="feedback" style={{ marginTop: 12 }}>
            Score {score(result.score)}/5. {result.feedback} Scoring:{" "}
            {result.model ? `${result.provider} · ${result.model}` : result.provider ?? "deterministic_fallback"}.
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>{user.experimental_condition === "CONTROL" ? "Standard path" : "Initial misconception map"}</h2>
        {user.experimental_condition === "CONTROL" ? (
          <div className="empty">
            Diagnostic evidence is recorded for analysis. Control learners continue with standard explanation before
            taking the same transfer challenge.
          </div>
        ) : (
          <MisconceptionMap dashboard={dashboard} />
        )}
      </section>
    </div>
  );
}

function MisconceptionMap({ dashboard }: { dashboard: Dashboard | null }) {
  const states = dashboard?.misconceptionStates ?? [];
  if (states.length === 0) {
    return <div className="empty">No misconception evidence yet. Complete diagnostic responses with confidence ratings.</div>;
  }

  return (
    <div className="map-list">
      {states.map((state) => (
        <div className="map-row" key={state.id}>
          <div>
            <strong>{state.misconception.name}</strong>
            <p className="brand-subtitle">
              {state.misconception.concept.name} · evidence {state.evidence_count} · {state.status.toLowerCase()}
            </p>
            <div className="bar risk" style={{ marginTop: 8 }}>
              <span style={{ width: pct(state.probability) }} />
            </div>
          </div>
          <span className={`status ${statusClass(state.probability)}`}>{pct(state.probability)}</span>
        </div>
      ))}
    </div>
  );
}

function RepairScreen({
  domain,
  user,
  dashboard,
  onRefresh,
  busy,
  setBusy
}: {
  domain: Domain;
  user: User;
  dashboard: Dashboard | null;
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const target = dashboard?.misconceptionStates.find((state) => state.status !== "REPAIRED") ?? null;
  const targetMisconception = target?.misconception ?? domain.misconceptions[0];
  const isControl = user.experimental_condition === "CONTROL";
  const [stepIndex, setStepIndex] = useState(0);
  const [learnerResponse, setLearnerResponse] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [sequenceProvider, setSequenceProvider] = useState("deterministic_fallback");

  const fallbackSteps = useMemo<RepairStep[]>(
    () => [
      {
        label: "Prediction",
        prompt: `Before I explain, what do you think will happen if: ${targetMisconception?.example_wrong_answer ?? "the token is valid but the action fails"}?`
      },
      { label: "Reasoning", prompt: "Why do you think that? Name the mechanism, not just the fix." },
      {
        label: "Contrast",
        prompt: `Compare it with this similar case: ${targetMisconception?.expert_correction ?? "identity can be valid while action permission is missing"}. What changed?`
      },
      {
        label: "Contradiction",
        prompt: "Your answer predicts the same fix should work in both cases. What assumption might be wrong?"
      },
      {
        label: "Repair",
        prompt: `Key distinction to use after reasoning: ${targetMisconception?.expert_correction ?? "separate authentication from authorization and diagnosis."}`
      },
      { label: "Re-explain", prompt: "Explain the concept again in your own words, including a boundary condition." },
      { label: "Application", prompt: "Apply the corrected idea to a new customer API failure." },
      { label: "Confidence", prompt: "How confident are you, from 1 to 5?" },
      { label: "Transfer", prompt: "Here is a less familiar scenario. What would you do first, and what would you rule out?" }
    ],
    [targetMisconception]
  );
  const standardExplanation = useMemo(
    () =>
      targetMisconception
        ? `${targetMisconception.expert_correction} Use this as standard training material, then complete the same transfer challenge without misconception-targeted Socratic repair.`
        : "Review the standard API authentication and permissions material, then complete the same transfer challenge.",
    [targetMisconception]
  );
  const [steps, setSteps] = useState<RepairStep[]>(fallbackSteps);

  useEffect(() => {
    let cancelled = false;

    async function loadRepairSequence() {
      setSteps(fallbackSteps);
      setStepIndex(0);
      setSequenceProvider(isControl ? "standard_explanation" : "deterministic_fallback");
      if (isControl) return;
      const params = new URLSearchParams({
        domainId: domain.id,
        userId: user.id
      });
      if (targetMisconception?.id) params.set("misconceptionId", targetMisconception.id);

      try {
        const response = await fetch(`/api/repair-sequence?${params.toString()}`);
        const data = (await response.json()) as {
          steps?: Array<{ step_type: string; prompt: string }>;
          provider?: string;
          model?: string;
        };
        if (!cancelled && data.steps?.length) {
          setSteps(data.steps.map((step) => ({ label: labelFromStepType(step.step_type), prompt: step.prompt })));
          setSequenceProvider(data.model ? `${data.provider} · ${data.model}` : data.provider ?? "deterministic_fallback");
        }
      } catch {
        if (!cancelled) setSteps(fallbackSteps);
      }
    }

    loadRepairSequence();
    return () => {
      cancelled = true;
    };
  }, [domain.id, fallbackSteps, isControl, targetMisconception?.id, user.id]);

  async function submit() {
    if (!targetMisconception) return;
    setBusy(true);
    try {
      const result = await postJson<{
        result: { feedback: string; score: number; nextPrompt?: string; provider?: string; model?: string };
      }>("/api/interventions", {
        user_id: user.id,
        domain_id: domain.id,
        concept_id: targetMisconception.concept_id,
        misconception_id: targetMisconception.id,
        intervention_type: isControl ? "standard_explanation" : "socratic_repair",
        prompt_used: isControl ? standardExplanation : steps[stepIndex].prompt,
        learner_response: learnerResponse,
        confidence_rating: confidence
      });
      const providerLabel = result.result.model
        ? `${result.result.provider} · ${result.result.model}`
        : result.result.provider ?? "deterministic_fallback";
      setFeedback(`Outcome ${score(result.result.score)}/5. ${result.result.feedback} Scoring: ${providerLabel}.`);
      setLearnerResponse("");
      if (!isControl) {
        const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
        if (result.result.nextPrompt) {
          setSteps((current) =>
            current.map((step, index) =>
              index === nextIndex ? { ...step, label: "Adaptive follow-up", prompt: result.result.nextPrompt! } : step
            )
          );
        }
        setStepIndex(nextIndex);
      }
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h2>{isControl ? "Standard explanation" : "Socratic repair sequence"}</h2>
        <p className="section-copy" style={{ marginBottom: 12 }}>
          Target: {targetMisconception?.name ?? "Complete a diagnostic first to identify a repair target."}
        </p>
        {!isControl ? (
          <>
            <p className="brand-subtitle" style={{ marginBottom: 10 }}>
              Repair sequence source: {sequenceProvider}
            </p>
            <div className="flow-steps">
              {steps.slice(0, 9).map((step, index) => (
                <button
                  key={step.label}
                  className={`flow-step ${index === stepIndex ? "active" : ""}`}
                  onClick={() => setStepIndex(index)}
                  type="button"
                >
                  <strong>{step.label}</strong>
                  <p className="brand-subtitle">Step {index + 1}</p>
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className="panel compact" style={{ marginTop: 14 }}>
          <span className="status blue">{isControl ? "Standard training material" : steps[stepIndex].label}</span>
          <p style={{ lineHeight: 1.5 }}>{isControl ? standardExplanation : steps[stepIndex].prompt}</p>
          {isControl ? (
            <p className="brand-subtitle">
              Control exposure is not scored as repair. The same immediate and delayed transfer outcomes are scored later.
            </p>
          ) : null}
        </div>
        <TextArea
          label={isControl ? "Learner note after explanation" : "Learner reasoning"}
          value={learnerResponse}
          onChange={setLearnerResponse}
        />
        <div className="field" style={{ marginTop: 10 }}>
          <label>{isControl ? "Confidence after explanation" : "Confidence after repair step"}</label>
          <ConfidenceControl value={confidence} onChange={setConfidence} />
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={submit} disabled={busy || !learnerResponse.trim()}>
          <Send size={15} />
          {isControl ? "Record explanation exposure" : "Record repair evidence"}
        </button>
        {feedback ? <div className="feedback" style={{ marginTop: 12 }}>{feedback}</div> : null}
      </section>

      <section className="panel">
        <h2>{isControl ? "Control guardrail" : "Repair priority"}</h2>
        {isControl ? (
          <div className="empty">
            This arm receives standard training material only. Misconception-targeted repair is withheld until after
            transfer and retention outcomes are recorded.
          </div>
        ) : (
          <MisconceptionMap dashboard={dashboard} />
        )}
      </section>
    </div>
  );
}

function TransferScreen({
  domain,
  user,
  onRefresh,
  busy,
  setBusy
}: {
  domain: Domain;
  user: User;
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const transferItems = domain.assessmentItems.filter((item) => item.item_type === "transfer");
  const [scenarioId, setScenarioId] = useState(transferItems[0]?.id ?? "");
  const [responseText, setResponseText] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [feedback, setFeedback] = useState("");
  const scenario = transferItems.find((item) => item.id === scenarioId) ?? transferItems[0];

  async function submit() {
    if (!scenario) return;
    setBusy(true);
    try {
      const result = await postJson<{ result: { feedback: string; score: number; provider?: string; model?: string } }>(
        "/api/transfer-attempts",
        {
        user_id: user.id,
        domain_id: domain.id,
        scenario_id: scenario.id,
        response_text: responseText,
        confidence_rating: confidence
        }
      );
      const providerLabel = result.result.model
        ? `${result.result.provider} · ${result.result.model}`
        : result.result.provider ?? "deterministic_fallback";
      setFeedback(
        `Transfer score ${score(result.result.score)}/5. ${result.result.feedback} Scoring: ${providerLabel}. A 24-hour retention probe was scheduled.`
      );
      setResponseText("");
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Immediate transfer challenge</h2>
      <div className="field">
        <label htmlFor="transfer-scenario">Novel scenario</label>
        <select id="transfer-scenario" value={scenario?.id ?? ""} onChange={(event) => setScenarioId(event.target.value)}>
          {transferItems.map((item) => (
            <option key={item.id} value={item.id}>
              transfer distance {item.transfer_distance} · difficulty {item.difficulty}
            </option>
          ))}
        </select>
      </div>
      <div className="panel compact" style={{ margin: "12px 0" }}>
        <span className="status blue">Novel transfer</span>
        <p style={{ lineHeight: 1.55 }}>{scenario?.prompt}</p>
      </div>
      <TextArea label="Diagnosis, reasoning, and recommended action" value={responseText} onChange={setResponseText} />
      <div className="field" style={{ marginTop: 10 }}>
        <label>Confidence rating required</label>
        <ConfidenceControl value={confidence} onChange={setConfidence} />
      </div>
      <button className="button primary" style={{ marginTop: 12 }} onClick={submit} disabled={busy || !responseText.trim()}>
        <Target size={15} />
        Score transfer
      </button>
      {feedback ? <div className="feedback" style={{ marginTop: 12 }}>{feedback}</div> : null}
    </section>
  );
}

function RetentionScreen({
  domain,
  user,
  dashboard,
  onRefresh,
  busy,
  setBusy
}: {
  domain: Domain;
  user: User;
  dashboard: Dashboard | null;
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const probes = useMemo(() => dashboard?.probes ?? [], [dashboard?.probes]);
  const [probeId, setProbeId] = useState(probes[0]?.id ?? "");
  const [responseText, setResponseText] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [feedback, setFeedback] = useState("");
  const selectedProbe = probes.find((probe) => probe.id === probeId) ?? probes[0];

  useEffect(() => {
    if (!probeId && probes[0]?.id) setProbeId(probes[0].id);
  }, [probeId, probes]);

  async function createProbe() {
    const concept = domain.concepts[0];
    if (!concept) return;
    setBusy(true);
    try {
      await postJson("/api/retention-probes", {
        user_id: user.id,
        domain_id: domain.id,
        concept_id: concept.id,
        delay_hours: 24
      });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function completeProbe() {
    if (!selectedProbe) return;
    setBusy(true);
    try {
      const result = await postJson<{
        result: { feedback: string; score: number; provider?: string; model?: string; simulated?: boolean };
      }>(
        "/api/retention-probes",
        {
          user_id: user.id,
          domain_id: domain.id,
          probe_id: selectedProbe.id,
          response_text: responseText,
          confidence_rating: confidence
        }
      );
      const providerLabel = result.result.model
        ? `${result.result.provider} · ${result.result.model}`
        : result.result.provider ?? "deterministic_fallback";
      const exclusionNote = result.result.simulated
        ? " This row is marked simulated/early and excluded from primary delayed-retention analysis."
        : "";
      setFeedback(
        `Retention score ${score(result.result.score)}/5. ${result.result.feedback} Scoring: ${providerLabel}.${exclusionNote}`
      );
      setResponseText("");
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h2>Delayed retention probe</h2>
        {probes.length === 0 ? (
          <div className="empty">
            No delayed probes yet. Complete a transfer challenge or schedule a 24-hour probe for smoke testing.
          </div>
        ) : (
          <>
            <SelectField
              label="Scheduled probe"
              value={selectedProbe?.id ?? ""}
              onChange={setProbeId}
              options={probes.map((probe) => ({
                label: `${probe.concept.name} · ${probe.completed_at ? "completed" : "scheduled"} · ${new Date(
                  probe.scheduled_at
                ).toLocaleString()}`,
                value: probe.id
              }))}
            />
            <div className="panel compact" style={{ margin: "12px 0" }}>
              <span className={`status ${selectedProbe?.completed_at ? "green" : "amber"}`}>
                {selectedProbe?.completed_at ? "completed" : "scheduled"}
              </span>
              <p style={{ lineHeight: 1.5 }}>{probePrompt(selectedProbe)}</p>
            </div>
            <TextArea label="Delayed explanation and application" value={responseText} onChange={setResponseText} />
            <div className="field" style={{ marginTop: 10 }}>
              <label>Confidence rating required</label>
              <ConfidenceControl value={confidence} onChange={setConfidence} />
            </div>
            <button className="button primary" style={{ marginTop: 12 }} onClick={completeProbe} disabled={busy || !responseText.trim()}>
              <CalendarClock size={15} />
              Complete retention probe
            </button>
          </>
        )}
        <button className="button" style={{ marginTop: 12 }} onClick={createProbe} disabled={busy}>
          <Plus size={15} />
          Schedule 24-hour probe
        </button>
        {feedback ? <div className="feedback" style={{ marginTop: 12 }}>{feedback}</div> : null}
      </section>

      <section className="panel">
        <h2>Retention schedule</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concept</th>
                <th>Scheduled</th>
                <th>Analysis status</th>
                <th>Score</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {probes.map((probe) => (
                <tr key={probe.id}>
                  <td>{probe.concept.name}</td>
                  <td>{new Date(probe.scheduled_at).toLocaleString()}</td>
                  <td>{probe.simulated || probe.completed_early ? "excluded: simulated/early" : "eligible"}</td>
                  <td>{probe.score === null ? "pending" : score(probe.score)}</td>
                  <td>{probe.confidence_rating ?? "pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MasteryScreen({ dashboard }: { dashboard: Dashboard | null }) {
  if (!dashboard) return <div className="empty">No learner dashboard loaded.</div>;

  return (
    <div className="grid two">
      <section className="panel">
        <h2>Learner mastery dashboard</h2>
        <p className="section-copy" style={{ marginBottom: 12 }}>
          Next recommended practice: {dashboard.nextRecommendedPractice}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concept</th>
                <th>Mastery</th>
                <th>Explanation</th>
                <th>Application</th>
                <th>Transfer</th>
                <th>Calibration</th>
                <th>Retention risk</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.conceptStates.map((state) => (
                <tr key={state.id}>
                  <td>{state.concept.name}</td>
                  <td>
                    <span className={`status ${state.mastery_level === "transfer-ready" ? "green" : "amber"}`}>
                      {state.mastery_level}
                    </span>
                  </td>
                  <td>{score(state.explanation_quality)}</td>
                  <td>{score(state.application_accuracy)}</td>
                  <td>{score(state.transfer_score)}</td>
                  <td>{pct(state.confidence_calibration)}</td>
                  <td>{pct(state.retention_risk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Likely and repaired misconceptions</h2>
        <MisconceptionMap dashboard={dashboard} />
      </section>
    </div>
  );
}

function ResearchScreen({
  domain,
  user,
  research,
  onRefresh,
  busy,
  setBusy
}: {
  domain: Domain;
  user: User;
  research: Research | null;
  onRefresh: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const [learner, setLearner] = useState({
    name: "",
    email: "",
    experimental_condition: "AUTO_RANDOMIZED" as LearnerAssignmentChoice
  });
  const [reviewQueue, setReviewQueue] = useState<ExpertQueueItem[]>([]);
  const [calibration, setCalibration] = useState<CalibrationResponse | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [expertForm, setExpertForm] = useState({
    explanationScore: "3",
    transferScore: "3",
    calibrationScore: "3",
    notes: "",
    misconceptionLabels: [] as string[]
  });

  const selectedTarget =
    reviewQueue.find((item) => `${item.review_target_type}:${item.review_target_id}` === selectedTargetId) ??
    reviewQueue[0];

  async function loadCalibration() {
    const [queueResponse, calibrationResponse] = await Promise.all([
      fetch(`/api/expert-reviews?domainId=${domain.id}&reviewerId=${user.id}`),
      fetch(`/api/calibration?domainId=${domain.id}`)
    ]);
    const queueData = (await queueResponse.json()) as { queue: ExpertQueueItem[] };
    const calibrationData = (await calibrationResponse.json()) as CalibrationResponse;
    setReviewQueue(queueData.queue ?? []);
    setCalibration(calibrationData);
    if (queueData.queue?.length) {
      setSelectedTargetId((current) => current || `${queueData.queue[0].review_target_type}:${queueData.queue[0].review_target_id}`);
    }
  }

  useEffect(() => {
    loadCalibration().catch(() => {
      setReviewQueue([]);
      setCalibration(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.id, user.id]);

  async function addLearner() {
    setBusy(true);
    try {
      const body = {
        name: learner.name,
        email: learner.email,
        role: "LEARNER",
        domain_id: domain.id,
        ...(learner.experimental_condition === "AUTO_RANDOMIZED"
          ? {}
          : { experimental_condition: learner.experimental_condition })
      };

      await postJson("/api/users", {
        ...body
      });
      setLearner({ name: "", email: "", experimental_condition: "AUTO_RANDOMIZED" });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  function toggleMisconceptionLabel(id: string) {
    setExpertForm((current) => ({
      ...current,
      misconceptionLabels: current.misconceptionLabels.includes(id)
        ? current.misconceptionLabels.filter((label) => label !== id)
        : [...current.misconceptionLabels, id]
    }));
  }

  async function submitExpertReview() {
    if (!selectedTarget) return;
    setBusy(true);
    try {
      const isTransferLike =
        selectedTarget.review_target_type === "transfer_attempt" || selectedTarget.review_target_type === "retention_probe";
      await postJson("/api/expert-reviews", {
        reviewer_user_id: user.id,
        domain_id: domain.id,
        concept_id: selectedTarget.concept_id,
        assessment_item_id: selectedTarget.assessment_item_id,
        review_target_type: selectedTarget.review_target_type,
        review_target_id: selectedTarget.review_target_id,
        prompt: selectedTarget.prompt,
        response_text: selectedTarget.response_text,
        expert_explanation_quality_score: isTransferLike ? null : Number(expertForm.explanationScore),
        expert_transfer_score: isTransferLike ? Number(expertForm.transferScore) : null,
        expert_confidence_calibration_score: Number(expertForm.calibrationScore),
        expert_misconception_labels: expertForm.misconceptionLabels,
        notes: expertForm.notes
      });
      setExpertForm({
        explanationScore: "3",
        transferScore: "3",
        calibrationScore: "3",
        notes: "",
        misconceptionLabels: []
      });
      setSelectedTargetId("");
      await loadCalibration();
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h2>Expert calibration</h2>
        <p className="brand-subtitle">
          Agreement status: {calibration?.overall.agreement_status === "reportable" ? "reportable" : "insufficient n"};
          minimum n={calibration?.overall.minimum_n_for_agreement ?? 10}. MAE and bias remain descriptive before the
          threshold.
        </p>
        <div className="metric-row" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <div className="metric">
            <span className="small-label">Reviewed pairs</span>
            <span className="metric-value">{calibration?.overall.scored_pair_count ?? 0}</span>
          </div>
          <div className="metric">
            <span className="small-label">MAE</span>
            <span className="metric-value">{metricValue(calibration?.overall.mean_absolute_error)}</span>
          </div>
          <div className="metric">
            <span className="small-label">Weighted kappa</span>
            <span className="metric-value">{metricValue(calibration?.overall.quadratic_weighted_kappa)}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Slice</th>
                <th>Pairs</th>
                <th>Pearson</th>
                <th>Spearman</th>
                <th>Bias</th>
                <th>Misconception F1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>overall</td>
                <td>{calibration?.overall.scored_pair_count ?? 0}</td>
                <td>{metricValue(calibration?.overall.pearson_correlation)}</td>
                <td>{metricValue(calibration?.overall.spearman_correlation)}</td>
                <td>{metricValue(calibration?.overall.bias_ai_minus_expert)}</td>
                <td>{metricValue(calibration?.overall.misconception_f1)}</td>
              </tr>
              {(calibration?.byTargetType ?? []).map((row) => (
                <tr key={row.review_target_type}>
                  <td>{row.review_target_type}</td>
                  <td>{row.scored_pair_count}</td>
                  <td>{metricValue(row.pearson_correlation)}</td>
                  <td>{metricValue(row.spearman_correlation)}</td>
                  <td>{metricValue(row.bias_ai_minus_expert)}</td>
                  <td>{metricValue(row.misconception_f1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Blind expert review queue</h2>
        {selectedTarget ? (
          <>
            <SelectField
              label="Review target"
              value={`${selectedTarget.review_target_type}:${selectedTarget.review_target_id}`}
              onChange={setSelectedTargetId}
              options={reviewQueue.map((item) => ({
                label: `${item.item_type} · ${item.concept_name}`,
                value: `${item.review_target_type}:${item.review_target_id}`
              }))}
            />
            <div className="panel compact" style={{ marginTop: 12 }}>
              <span className="status blue">{selectedTarget.item_type}</span>
              <p className="brand-subtitle" style={{ marginTop: 8 }}>
                Concept: {selectedTarget.concept_name}
              </p>
              <p style={{ lineHeight: 1.45 }}>{selectedTarget.prompt}</p>
              <strong>Learner response</strong>
              <p style={{ lineHeight: 1.45 }}>{selectedTarget.response_text}</p>
            </div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <TextField
                label="Explanation quality 0-5"
                type="number"
                value={expertForm.explanationScore}
                onChange={(value) => setExpertForm({ ...expertForm, explanationScore: value })}
              />
              <TextField
                label="Transfer score 0-5"
                type="number"
                value={expertForm.transferScore}
                onChange={(value) => setExpertForm({ ...expertForm, transferScore: value })}
              />
              <TextField
                label="Confidence calibration 0-5"
                type="number"
                value={expertForm.calibrationScore}
                onChange={(value) => setExpertForm({ ...expertForm, calibrationScore: value })}
              />
              <TextArea
                label="Expert notes"
                value={expertForm.notes}
                onChange={(value) => setExpertForm({ ...expertForm, notes: value })}
              />
            </div>
            <div className="field full" style={{ marginTop: 12 }}>
              <label>Expert misconception labels</label>
              <div className="map-list">
                {domain.misconceptions.map((misconception) => (
                  <label className="map-row" key={misconception.id} style={{ gridTemplateColumns: "22px minmax(0, 1fr)" }}>
                    <input
                      type="checkbox"
                      checked={expertForm.misconceptionLabels.includes(misconception.id)}
                      onChange={() => toggleMisconceptionLabel(misconception.id)}
                    />
                    <span>{misconception.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="button primary" style={{ marginTop: 12 }} onClick={submitExpertReview} disabled={busy}>
              <ShieldCheck size={15} />
              Submit blind review
            </button>
            <p className="brand-subtitle" style={{ marginTop: 10 }}>
              AI score, AI feedback, learner identity, and condition are hidden in this queue.
            </p>
          </>
        ) : (
          <div className="empty">No scored learner artifacts are waiting for expert review.</div>
        )}
      </section>

      <section className="panel">
        <h2>Condition comparison</h2>
        <div className="table-wrap">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Learners</th>
                <th>Expert delayed</th>
                <th>AI delayed</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {(research?.conditions ?? []).map((row) => (
                <tr key={row.condition}>
                  <td>{row.condition}</td>
                  <td>{row.learner_count}</td>
                  <td>{score(row.delayed_retention_score)}</td>
                  <td>{score(row.ai_delayed_retention_score)}</td>
                  <td>{row.expert_review_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a className="button" style={{ marginTop: 12, textDecoration: "none" }} href={`/api/export?domainId=${domain.id}`}>
          <Download size={15} />
          Export CSV
        </a>
      </section>

      <section className="panel">
        <h2>Add pilot learner</h2>
        <div className="form-grid">
          <TextField label="Name" value={learner.name} onChange={(value) => setLearner({ ...learner, name: value })} />
          <TextField label="Email" value={learner.email} onChange={(value) => setLearner({ ...learner, email: value })} />
          <SelectField
            label="Condition"
            value={learner.experimental_condition}
            onChange={(value) => setLearner({ ...learner, experimental_condition: value as LearnerAssignmentChoice })}
            options={[
              { label: "AUTO BALANCED", value: "AUTO_RANDOMIZED" },
              { label: "EXPERIMENTAL", value: "EXPERIMENTAL" },
              { label: "CONTROL", value: "CONTROL" }
            ]}
          />
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={addLearner} disabled={busy || !learner.email}>
          <Plus size={15} />
          Add learner
        </button>
      </section>

      <section className="panel">
        <h2>Misconception frequency</h2>
        <div className="map-list">
          {(research?.misconceptionFrequency ?? []).map((item) => (
            <div className="map-row" key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <p className="brand-subtitle">Observed in {item.count} learner state records</p>
                <div className="bar risk" style={{ marginTop: 8 }}>
                  <span style={{ width: pct(item.avg_probability) }} />
                </div>
              </div>
              <span className={`status ${statusClass(item.avg_probability)}`}>{pct(item.avg_probability)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Learner-by-learner mastery graph</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Condition</th>
                <th>Expert delayed</th>
                <th>AI delayed</th>
                <th>Reviews</th>
                <th>High-confidence errors</th>
              </tr>
            </thead>
            <tbody>
              {(research?.learners ?? []).map((row) => (
                <tr key={row.user_id}>
                  <td>{row.name}</td>
                  <td>{row.condition}</td>
                  <td>{score(row.delayed_retention_score)}</td>
                  <td>{score(row.ai_delayed_retention_score)}</td>
                  <td>{row.expert_review_count}</td>
                  <td>{row.high_confidence_errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="field full">
      <label>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function probePrompt(probe: RetentionProbe | undefined) {
  if (!probe || typeof probe.result !== "object" || probe.result === null || !("prompt" in probe.result)) {
    return "Explain the key distinction and apply it to a less familiar API failure.";
  }
  const value = (probe.result as { prompt?: unknown }).prompt;
  return typeof value === "string" ? value : "Explain the key distinction and apply it to a less familiar API failure.";
}
