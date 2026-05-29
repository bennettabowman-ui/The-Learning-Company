import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...parts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = parts.join("=").replace(/^"|"$/g, "");
    }
  }
}

function sqlitePathFromUrl(url) {
  const value = url?.replace(/^file:/, "") || "./dev.db";
  if (path.isAbsolute(value)) return value;
  return path.resolve(process.cwd(), "prisma", value);
}

loadEnv();

const dbPath = sqlitePathFromUrl(process.env.DATABASE_URL);
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'LEARNER',
  "experimental_condition" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Domain" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "target_learner" TEXT NOT NULL,
  "learner_role" TEXT NOT NULL,
  "business_goal" TEXT NOT NULL,
  "target_performance_goal" TEXT NOT NULL,
  "allowed_source_material" JSONB NOT NULL,
  "examples" JSONB NOT NULL,
  "counterexamples" JSONB NOT NULL,
  "near_miss_cases" JSONB NOT NULL,
  "real_world_scenarios" JSONB NOT NULL,
  "transfer_scenarios" JSONB NOT NULL,
  "scoring_rubrics" JSONB NOT NULL,
  "expert_explanations" JSONB NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Concept" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "domain_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "prerequisite_concept_ids" JSONB NOT NULL,
  "importance_score" INTEGER NOT NULL,
  "difficulty_score" INTEGER NOT NULL,
  CONSTRAINT "Concept_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Misconception" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "domain_id" TEXT NOT NULL,
  "concept_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "typical_signals" JSONB NOT NULL,
  "repair_strategy" TEXT NOT NULL,
  "example_wrong_answer" TEXT NOT NULL,
  "expert_correction" TEXT NOT NULL,
  CONSTRAINT "Misconception_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Misconception_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "AssessmentItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "domain_id" TEXT NOT NULL,
  "concept_id" TEXT NOT NULL,
  "item_type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "correct_answer" TEXT NOT NULL,
  "scoring_rubric" JSONB NOT NULL,
  "target_misconceptions" JSONB NOT NULL,
  "difficulty" INTEGER NOT NULL,
  "transfer_distance" INTEGER NOT NULL,
  CONSTRAINT "AssessmentItem_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssessmentItem_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LearnerConceptState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "concept_id" TEXT NOT NULL,
  "recall_strength" REAL NOT NULL DEFAULT 0,
  "explanation_quality" REAL NOT NULL DEFAULT 0,
  "application_accuracy" REAL NOT NULL DEFAULT 0,
  "transfer_score" REAL NOT NULL DEFAULT 0,
  "confidence_calibration" REAL NOT NULL DEFAULT 0,
  "misconception_probability" REAL NOT NULL DEFAULT 0,
  "retention_risk" REAL NOT NULL DEFAULT 1,
  "mastery_level" TEXT NOT NULL DEFAULT 'unassessed',
  "last_updated" DATETIME NOT NULL,
  CONSTRAINT "LearnerConceptState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearnerConceptState_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearnerConceptState_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LearnerMisconceptionState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "misconception_id" TEXT NOT NULL,
  "probability" REAL NOT NULL DEFAULT 0,
  "confidence_weighted_error_score" REAL NOT NULL DEFAULT 0,
  "evidence_count" INTEGER NOT NULL DEFAULT 0,
  "last_detected_at" DATETIME,
  "repaired_at" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'UNSEEN',
  CONSTRAINT "LearnerMisconceptionState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearnerMisconceptionState_misconception_id_fkey" FOREIGN KEY ("misconception_id") REFERENCES "Misconception" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "session_type" TEXT NOT NULL,
  "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" DATETIME,
  CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Session_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LearnerResponse" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "assessment_item_id" TEXT NOT NULL,
  "response_text" TEXT NOT NULL,
  "selected_answer" TEXT,
  "confidence_rating" INTEGER NOT NULL,
  "response_time" INTEGER NOT NULL,
  "ai_score" REAL NOT NULL,
  "ai_feedback" TEXT NOT NULL,
  "detected_misconceptions" JSONB NOT NULL,
  "scoring_provider" TEXT,
  "scoring_model" TEXT,
  "scoring_error" TEXT,
  "requires_expert_validation" BOOLEAN NOT NULL DEFAULT false,
  "uncertainty_flags" JSONB,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnerResponse_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearnerResponse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearnerResponse_assessment_item_id_fkey" FOREIGN KEY ("assessment_item_id") REFERENCES "AssessmentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Intervention" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "concept_id" TEXT NOT NULL,
  "misconception_id" TEXT,
  "intervention_type" TEXT NOT NULL,
  "prompt_used" TEXT NOT NULL,
  "learner_response" TEXT NOT NULL,
  "ai_feedback" TEXT NOT NULL,
  "outcome_score" REAL NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Intervention_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Intervention_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Intervention_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Intervention_misconception_id_fkey" FOREIGN KEY ("misconception_id") REFERENCES "Misconception" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "TransferAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "scenario_id" TEXT NOT NULL,
  "response_text" TEXT NOT NULL,
  "score" REAL NOT NULL,
  "rubric_feedback" TEXT NOT NULL,
  "transfer_distance" INTEGER NOT NULL,
  "confidence_rating" INTEGER NOT NULL,
  "scoring_provider" TEXT,
  "scoring_model" TEXT,
  "scoring_error" TEXT,
  "requires_expert_validation" BOOLEAN NOT NULL DEFAULT false,
  "uncertainty_flags" JSONB,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransferAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransferAttempt_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "RetentionProbe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "concept_id" TEXT NOT NULL,
  "scheduled_at" DATETIME NOT NULL,
  "completed_at" DATETIME,
  "score" REAL,
  "confidence_rating" INTEGER,
  "result" JSONB,
  "scoring_provider" TEXT,
  "scoring_model" TEXT,
  "scoring_error" TEXT,
  "requires_expert_validation" BOOLEAN NOT NULL DEFAULT false,
  "uncertainty_flags" JSONB,
  CONSTRAINT "RetentionProbe_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RetentionProbe_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RetentionProbe_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "EvidenceEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "concept_id" TEXT,
  "event_type" TEXT NOT NULL,
  "evidence_value" REAL NOT NULL,
  "confidence_rating" INTEGER,
  "metadata" JSONB NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EvidenceEvent_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EvidenceEvent_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ExpertReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reviewer_user_id" TEXT NOT NULL,
  "domain_id" TEXT NOT NULL,
  "concept_id" TEXT NOT NULL,
  "assessment_item_id" TEXT,
  "review_target_type" TEXT NOT NULL,
  "review_target_id" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "response_text" TEXT NOT NULL,
  "ai_score" REAL,
  "ai_misconception_labels" JSONB NOT NULL,
  "expert_explanation_quality_score" REAL,
  "expert_transfer_score" REAL,
  "expert_misconception_labels" JSONB NOT NULL,
  "expert_confidence_calibration_score" REAL,
  "notes" TEXT,
  "blind_review" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpertReview_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExpertReview_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExpertReview_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExpertReview_assessment_item_id_fkey" FOREIGN KEY ("assessment_item_id") REFERENCES "AssessmentItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "Concept_domain_id_idx" ON "Concept"("domain_id");
CREATE INDEX IF NOT EXISTS "Misconception_domain_id_idx" ON "Misconception"("domain_id");
CREATE INDEX IF NOT EXISTS "Misconception_concept_id_idx" ON "Misconception"("concept_id");
CREATE INDEX IF NOT EXISTS "AssessmentItem_domain_id_idx" ON "AssessmentItem"("domain_id");
CREATE INDEX IF NOT EXISTS "AssessmentItem_concept_id_idx" ON "AssessmentItem"("concept_id");
CREATE INDEX IF NOT EXISTS "LearnerConceptState_domain_id_idx" ON "LearnerConceptState"("domain_id");
CREATE UNIQUE INDEX IF NOT EXISTS "LearnerConceptState_user_id_domain_id_concept_id_key" ON "LearnerConceptState"("user_id", "domain_id", "concept_id");
CREATE INDEX IF NOT EXISTS "LearnerMisconceptionState_domain_id_idx" ON "LearnerMisconceptionState"("domain_id");
CREATE UNIQUE INDEX IF NOT EXISTS "LearnerMisconceptionState_user_id_domain_id_misconception_id_key" ON "LearnerMisconceptionState"("user_id", "domain_id", "misconception_id");
CREATE INDEX IF NOT EXISTS "Session_user_id_domain_id_idx" ON "Session"("user_id", "domain_id");
CREATE INDEX IF NOT EXISTS "LearnerResponse_user_id_idx" ON "LearnerResponse"("user_id");
CREATE INDEX IF NOT EXISTS "LearnerResponse_assessment_item_id_idx" ON "LearnerResponse"("assessment_item_id");
CREATE INDEX IF NOT EXISTS "Intervention_user_id_idx" ON "Intervention"("user_id");
CREATE INDEX IF NOT EXISTS "Intervention_concept_id_idx" ON "Intervention"("concept_id");
CREATE INDEX IF NOT EXISTS "TransferAttempt_user_id_domain_id_idx" ON "TransferAttempt"("user_id", "domain_id");
CREATE INDEX IF NOT EXISTS "RetentionProbe_user_id_domain_id_idx" ON "RetentionProbe"("user_id", "domain_id");
CREATE INDEX IF NOT EXISTS "EvidenceEvent_user_id_domain_id_idx" ON "EvidenceEvent"("user_id", "domain_id");
CREATE INDEX IF NOT EXISTS "EvidenceEvent_event_type_idx" ON "EvidenceEvent"("event_type");
CREATE UNIQUE INDEX IF NOT EXISTS "ExpertReview_reviewer_user_id_review_target_type_review_target_id_key" ON "ExpertReview"("reviewer_user_id", "review_target_type", "review_target_id");
CREATE INDEX IF NOT EXISTS "ExpertReview_domain_id_idx" ON "ExpertReview"("domain_id");
CREATE INDEX IF NOT EXISTS "ExpertReview_review_target_type_review_target_id_idx" ON "ExpertReview"("review_target_type", "review_target_id");
`);

function addColumn(table, columnSql) {
  try {
    db.exec(`ALTER TABLE "${table}" ADD COLUMN ${columnSql};`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column name")) throw error;
  }
}

for (const table of ["LearnerResponse", "TransferAttempt", "RetentionProbe"]) {
  addColumn(table, '"scoring_provider" TEXT');
  addColumn(table, '"scoring_model" TEXT');
  addColumn(table, '"scoring_error" TEXT');
  addColumn(table, '"requires_expert_validation" BOOLEAN NOT NULL DEFAULT false');
  addColumn(table, '"uncertainty_flags" JSONB');
}

db.close();
console.log(`Initialized SQLite database at ${dbPath}`);
