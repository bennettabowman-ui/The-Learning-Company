import type { PrismaClient } from "@prisma/client";

const sourceMaterial = [
  {
    title: "API auth onboarding source",
    content:
      "Authentication proves the caller's identity. Authorization determines what that identity can do. A valid token can still lack scopes, roles, organization policy, or user-level permission. Sandbox and production credentials are separate. Rate-limit failures should be diagnosed differently from permission failures. Audit logs help distinguish user role changes, organization policy changes, token expiration, and API access failures."
  }
];

const conceptSeeds = [
  {
    key: "authentication",
    name: "Authentication",
    description: "How an API verifies the identity of a caller.",
    importance_score: 5,
    difficulty_score: 2
  },
  {
    key: "authorization",
    name: "Authorization",
    description: "How the API decides whether an authenticated caller may perform an action.",
    importance_score: 5,
    difficulty_score: 3
  },
  {
    key: "scopes",
    name: "Scopes",
    description: "Permission boundaries encoded on tokens or grants for specific API actions.",
    importance_score: 5,
    difficulty_score: 3
  },
  {
    key: "roles",
    name: "Roles and permissions",
    description: "User, service account, and organization-level permissions that affect API behavior.",
    importance_score: 4,
    difficulty_score: 4
  },
  {
    key: "environments",
    name: "Environment mismatch",
    description: "Failures caused by using credentials, tokens, or endpoints from the wrong environment.",
    importance_score: 4,
    difficulty_score: 3
  },
  {
    key: "diagnosis",
    name: "Integration failure diagnosis",
    description: "Systematically distinguishing auth, permissions, rate limits, environment mismatch, and policy issues.",
    importance_score: 5,
    difficulty_score: 5
  }
];

const misconceptionSeeds = [
  {
    conceptKey: "authorization",
    name: "Valid token means sufficient permission",
    description: "Assumes that once a token is accepted, all requested API actions should work.",
    typical_signals: ["valid token", "authenticated so allowed", "token works", "login means permission"],
    repair_strategy: "Contrast identity verification with action authorization using same-token different-scope cases.",
    example_wrong_answer: "The token is valid, so the issue cannot be permissions.",
    expert_correction: "A token can authenticate identity while still lacking the scopes or permissions needed for a specific action."
  },
  {
    conceptKey: "diagnosis",
    name: "All API errors are authentication errors",
    description: "Treats failures as token or login problems without checking rate limits, scopes, roles, policies, or environment.",
    typical_signals: ["refresh the token", "auth issue", "new key", "login again"],
    repair_strategy: "Ask learners to separate symptoms and fixes across 401, 403, 429, and environment mismatch cases.",
    example_wrong_answer: "Generate a new token and retry because API errors usually mean auth failed.",
    expert_correction: "API failures need differential diagnosis: identity, permissions, quota, environment, policy, and service state can produce different symptoms."
  },
  {
    conceptKey: "roles",
    name: "User UI access implies API access",
    description: "Assumes admin UI access automatically grants API actions and integration scopes.",
    typical_signals: ["admin in UI", "can see it in dashboard", "same access in API"],
    repair_strategy: "Compare UI role, API scope, and organization policy boundaries in near-miss examples.",
    example_wrong_answer: "They are an admin in the UI, so API access should already be available.",
    expert_correction: "UI roles and API permissions can overlap but are not identical; integrations may require explicit API scopes or service account permissions."
  },
  {
    conceptKey: "environments",
    name: "Sandbox and production credentials behave identically",
    description: "Assumes sandbox tokens, endpoints, and org policies transfer directly to production.",
    typical_signals: ["worked in sandbox", "same token", "promote credentials"],
    repair_strategy: "Use contrastive sandbox-production cases where the same request shape fails for environment-specific reasons.",
    example_wrong_answer: "It worked in sandbox, so production should accept the same credentials.",
    expert_correction: "Sandbox and production credentials are separate and often have different endpoints, policies, data, and scopes."
  },
  {
    conceptKey: "diagnosis",
    name: "Rate limits are permission failures",
    description: "Confuses quota or throttling errors with missing permissions.",
    typical_signals: ["increase permissions", "role problem", "scope missing", "access denied"],
    repair_strategy: "Force comparison of 403 permission failures with 429 rate-limit failures and the different fixes.",
    example_wrong_answer: "The integration needs broader permissions because requests are being blocked.",
    expert_correction: "Rate limits are capacity/quota constraints; the fix is throttling, backoff, or quota adjustment, not broader permissions."
  }
];

const itemSeeds = [
  {
    conceptKey: "authorization",
    item_type: "explain",
    prompt: "In your own words, explain the difference between authentication and authorization for an API request.",
    correct_answer:
      "Authentication verifies who or what is calling. Authorization determines whether that identity can perform the requested action.",
    difficulty: 2,
    transfer_distance: 1,
    targetNames: ["Valid token means sufficient permission"]
  },
  {
    conceptKey: "scopes",
    item_type: "prediction",
    prompt:
      "A service account token is valid and can read customers, but a request to update billing settings returns 403. What do you predict is happening, and why?",
    correct_answer:
      "The token authenticates correctly but likely lacks the billing update scope, role, or organization policy needed for that action.",
    difficulty: 3,
    transfer_distance: 2,
    targetNames: ["Valid token means sufficient permission", "All API errors are authentication errors"]
  },
  {
    conceptKey: "diagnosis",
    item_type: "choose_best_action",
    prompt:
      "A customer reports intermittent failures after a traffic spike. Some calls return 429, but login and token validation still succeed. What is the best first action?",
    correct_answer:
      "Investigate rate-limit behavior, request volume, backoff, and quota before changing permissions or credentials.",
    difficulty: 3,
    transfer_distance: 2,
    targetNames: ["Rate limits are permission failures", "All API errors are authentication errors"]
  },
  {
    conceptKey: "environments",
    item_type: "identify_invalid_example",
    prompt:
      "Which statement is invalid: A) sandbox and production can have separate credentials, B) a production endpoint may reject a sandbox token, C) a sandbox success proves production credentials are correctly configured.",
    correct_answer:
      "C is invalid. Sandbox success does not prove production credentials, endpoint, scopes, or org policy are correct.",
    difficulty: 2,
    transfer_distance: 2,
    targetNames: ["Sandbox and production credentials behave identically"]
  },
  {
    conceptKey: "roles",
    item_type: "compare_cases",
    prompt:
      "Compare these cases: Case 1: an admin user succeeds in the UI but an integration using a service account cannot export audit logs. Case 2: the same service account succeeds after an audit-log scope is added. What changed?",
    correct_answer:
      "The API permission boundary changed. UI admin access did not automatically grant the service account the audit-log API scope.",
    difficulty: 4,
    transfer_distance: 3,
    targetNames: ["User UI access implies API access"]
  },
  {
    conceptKey: "diagnosis",
    item_type: "transfer",
    prompt:
      "A customer says their integration worked yesterday but now fails for only one subset of users. Distinguish whether the issue is token expiration, permissions scope, user role changes, organization policy, environment mismatch, or rate limiting. What would you check first and why?",
    correct_answer:
      "Because only a subset of users is affected after prior success, first check user role changes, org-level policy, and audit logs, while verifying token validity, scopes, environment, and rate-limit signals. The answer should avoid treating this as only authentication.",
    difficulty: 5,
    transfer_distance: 5,
    targetNames: ["All API errors are authentication errors", "User UI access implies API access", "Rate limits are permission failures"]
  }
];

async function clearDefaultData(prisma: PrismaClient) {
  await prisma.evidenceEvent.deleteMany();
  await prisma.expertReview.deleteMany();
  await prisma.retentionProbe.deleteMany();
  await prisma.transferAttempt.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.learnerResponse.deleteMany();
  await prisma.session.deleteMany();
  await prisma.learnerMisconceptionState.deleteMany();
  await prisma.learnerConceptState.deleteMany();
  await prisma.assessmentItem.deleteMany();
  await prisma.misconception.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.user.deleteMany();
}

async function createDefaultUsersAndStates(prisma: PrismaClient, domainId: string, conceptIds: string[]) {
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@mfl.local" },
      create: {
        name: "Admin Researcher",
        email: "admin@mfl.local",
        role: "ADMIN",
        experimental_condition: "EXPERIMENTAL"
      },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "avery@mfl.local" },
      create: {
        name: "Avery Experimental",
        email: "avery@mfl.local",
        role: "LEARNER",
        experimental_condition: "EXPERIMENTAL"
      },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "jordan@mfl.local" },
      create: {
        name: "Jordan Control",
        email: "jordan@mfl.local",
        role: "LEARNER",
        experimental_condition: "CONTROL"
      },
      update: {}
    })
  ]);

  for (const user of users) {
    for (const conceptId of conceptIds) {
      await prisma.learnerConceptState.upsert({
        where: {
          user_id_domain_id_concept_id: {
            user_id: user.id,
            domain_id: domainId,
            concept_id: conceptId
          }
        },
        create: {
          user_id: user.id,
          domain_id: domainId,
          concept_id: conceptId,
          mastery_level: "unassessed"
        },
        update: {}
      });
    }
  }
}

export async function seedDefaultData(prisma: PrismaClient, options: { reset?: boolean } = {}) {
  if (options.reset) {
    await clearDefaultData(prisma);
  }

  const existingDomain = await prisma.domain.findFirst({
    where: { name: "API Authentication and Permissions" },
    include: { concepts: true }
  });

  if (existingDomain) {
    await createDefaultUsersAndStates(
      prisma,
      existingDomain.id,
      existingDomain.concepts.map((concept) => concept.id)
    );
    return existingDomain;
  }

  const domain = await prisma.domain.create({
    data: {
      name: "API Authentication and Permissions",
      description:
        "Technical onboarding for B2B software sales engineers learning API authentication, permissions, and integration diagnosis.",
      target_learner:
        "New sales engineers, solutions engineers, customer success engineers, and technical support specialists.",
      learner_role: "B2B software sales engineer",
      business_goal: "Reduce time-to-proficiency by repairing misconceptions before customer-facing technical scenarios.",
      target_performance_goal: "Correctly diagnose novel API auth and permission failures with calibrated confidence.",
      allowed_source_material: sourceMaterial,
      examples: [
        "Valid token with insufficient scope returns a permission failure.",
        "Production endpoint rejects a sandbox token.",
        "429 after a traffic spike indicates rate-limit investigation."
      ],
      counterexamples: [
        "A valid token does not imply all actions are allowed.",
        "UI admin role does not automatically imply service account API scope."
      ],
      near_miss_cases: [
        "403 from missing scope versus 401 from invalid credential.",
        "429 throttling versus 403 permission denial.",
        "Sandbox success versus production failure."
      ],
      real_world_scenarios: [
        "Integration works for most users but fails for a subset after role changes.",
        "Customer rotates credentials and only production sync fails.",
        "High-volume sync starts returning 429 despite valid authentication."
      ],
      transfer_scenarios: ["Customer says integration worked yesterday but now fails for only one subset of users."],
      scoring_rubrics: {
        explanation_quality:
          "0 no meaningful explanation; 5 clear, causal, transferable explanation with boundaries and counterexamples",
        transfer: "0 cannot apply; 5 adapts flexibly and explains limits in a novel scenario"
      },
      expert_explanations: [
        "Separate identity, permission, environment, quota, and organization policy before recommending a fix."
      ]
    }
  });

  const conceptByKey = new Map<string, string>();
  for (const seed of conceptSeeds) {
    const concept = await prisma.concept.create({
      data: {
        domain_id: domain.id,
        name: seed.name,
        description: seed.description,
        prerequisite_concept_ids: [],
        importance_score: seed.importance_score,
        difficulty_score: seed.difficulty_score
      }
    });
    conceptByKey.set(seed.key, concept.id);
  }

  const misconceptionByName = new Map<string, string>();
  for (const seed of misconceptionSeeds) {
    const misconception = await prisma.misconception.create({
      data: {
        domain_id: domain.id,
        concept_id: conceptByKey.get(seed.conceptKey)!,
        name: seed.name,
        description: seed.description,
        typical_signals: seed.typical_signals,
        repair_strategy: seed.repair_strategy,
        example_wrong_answer: seed.example_wrong_answer,
        expert_correction: seed.expert_correction
      }
    });
    misconceptionByName.set(seed.name, misconception.id);
  }

  for (const seed of itemSeeds) {
    const targetMisconceptions = seed.targetNames
      .map((name) => misconceptionByName.get(name))
      .filter((id): id is string => Boolean(id));

    await prisma.assessmentItem.create({
      data: {
        domain_id: domain.id,
        concept_id: conceptByKey.get(seed.conceptKey)!,
        item_type: seed.item_type,
        prompt: seed.prompt,
        correct_answer: seed.correct_answer,
        scoring_rubric: {
          explanation_quality:
            "0 no meaningful explanation; 1 memorized phrase; 2 partial explanation; 3 mostly correct but brittle; 4 correct causal explanation; 5 transferable explanation with boundaries and counterexamples",
          transfer:
            "0 cannot apply; 1 surface similarity; 2 major errors; 3 familiar variation; 4 novel scenario; 5 flexible adaptation with limits"
        },
        target_misconceptions: targetMisconceptions,
        difficulty: seed.difficulty,
        transfer_distance: seed.transfer_distance
      }
    });
  }

  await createDefaultUsersAndStates(prisma, domain.id, [...conceptByKey.values()]);
  return domain;
}

export async function ensureDefaultSeed(prisma: PrismaClient) {
  const [domainCount, userCount] = await Promise.all([prisma.domain.count(), prisma.user.count()]);
  if (domainCount > 0 && userCount > 0) return false;
  await seedDefaultData(prisma);
  return true;
}
