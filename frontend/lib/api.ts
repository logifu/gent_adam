/**
 * Agent Architect Pro — Complete API Client
 *
 * Typed fetch wrapper with:
 * - Automatic trace_id injection
 * - Standard envelope parsing
 * - Error handling with typed error codes
 * - Tenant context propagation
 *
 * Covers all 15 backend services and 55+ endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/v1";

// ── Core Types ────────────────────────────────────────────

interface RequestMeta {
  tenant_id: string;
  trace_id: string;
  client_request_id: string;
  actor_id: string;
  policy_profile?: string;
}

interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  correlation_id?: string;
}

interface ApiResponse<T> {
  status: "ok" | "error";
  data?: T;
  error?: ApiError;
  meta?: Record<string, string>;
}

export class ApiCallError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public httpStatus: number
  ) {
    super(message);
    this.name = "ApiCallError";
  }
}

// ── Helpers ───────────────────────────────────────────────

function genTraceId(): string {
  return `trc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function genRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function defaultMeta(): RequestMeta {
  return {
    tenant_id: "tenant_dev",
    trace_id: genTraceId(),
    client_request_id: genRequestId(),
    actor_id: "user_dev",
  };
}

async function apiCall<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  const { body, ...fetchOptions } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "X-Trace-Id": genTraceId(),
      ...(fetchOptions.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new ApiCallError(
      result.error?.message || result.detail || "Unknown error",
      result.error?.code || "UNKNOWN",
      result.error?.retryable || false,
      response.status
    );
  }

  // Handle envelope-wrapped responses and raw responses
  return (result.data ?? result) as T;
}

// ── Runs API (Supervisor) ─────────────────────────────────

export interface RunStatus {
  run_id: string;
  tenant_id: string;
  state: "planning" | "queued" | "running" | "awaiting_review" | "completed" | "failed" | "cancelled";
  objective: string;
  plan_id?: string;
  next_action?: string;
  created_at?: string;
  updated_at?: string;
  cost_usd: number;
  task_progress: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
  error_message?: string;
}

export const runsApi = {
  create: (objective: string, constraints?: Record<string, unknown>) =>
    apiCall<{ run_id: string; state: string; next_action: string }>("/runs", {
      method: "POST",
      body: { ...defaultMeta(), objective, constraints },
    }),

  get: (runId: string) => apiCall<RunStatus>(`/runs/${runId}`),

  cancel: (runId: string) =>
    apiCall<{ run_id: string; state: string; message: string }>(
      `/runs/${runId}/cancel`,
      { method: "POST" }
    ),
};

// ── Plans API (Planner) ───────────────────────────────────

export interface TaskSpec {
  task_id: string;
  task_type: string;
  description: string;
  dependencies: string[];
  priority: number;
  estimated_cost: number;
}

export interface PlanSpec {
  plan_id: string;
  goal: string;
  tasks: TaskSpec[];
  total_estimated_cost: number;
  created_at: string;
}

export const plansApi = {
  create: (goal: string, budget?: Record<string, unknown>) =>
    apiCall<PlanSpec>("/plans", {
      method: "POST",
      body: { ...defaultMeta(), goal, budget },
    }),
};

// ── Identity API ──────────────────────────────────────────

export interface AgentSpec {
  agent_id: string;
  name: string;
  domain: string;
  description: string;
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const identityApi = {
  listAgents: () => apiCall<AgentSpec[]>("/identity/agents"),
  getAgent: (agentId: string) => apiCall<AgentSpec>(`/identity/agents/${agentId}`),
  registerAgent: (spec: Partial<AgentSpec>) =>
    apiCall<AgentSpec>("/identity/agents", { method: "POST", body: spec }),
  listVersions: (agentId: string) =>
    apiCall<{ versions: unknown[] }>(`/identity/agents/${agentId}/versions`),
  getInstances: (agentId: string) =>
    apiCall<{ instances: unknown[] }>(`/identity/agents/${agentId}/instances`),
  issueToken: (agentId: string) =>
    apiCall<{ token: string; expires_at: string }>("/identity/tokens/issue", {
      method: "POST",
      body: { agent_id: agentId },
    }),
};

// ── Auth API ──────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiCall<{ access_token: string; refresh_token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => apiCall<{ user_id: string; email: string; roles: string[] }>("/auth/me"),
  listRoles: () => apiCall<{ roles: unknown[] }>("/auth/roles"),
};

// ── Audit API ─────────────────────────────────────────────

export interface AuditEvent {
  event_id: string;
  run_id: string;
  event_type: string;
  actor: string;
  payload: Record<string, unknown>;
  timestamp: string;
  prev_hash: string;
  event_hash: string;
}

export const auditApi = {
  getRunAudit: (runId: string) => apiCall<AuditEvent[]>(`/audit/runs/${runId}`),
  verifyChain: (runId: string) =>
    apiCall<{ valid: boolean; checked: number; broken_at?: number }>(`/audit/runs/${runId}/verify`),
  getStats: () => apiCall<{ total_events: number; services: Record<string, number> }>("/audit/stats"),
};

// ── Swarm API ─────────────────────────────────────────────

export const swarmApi = {
  getCapacity: () =>
    apiCall<{ total_workers: number; available: number; busy: number; queue_depth: number }>("/swarm/capacity"),
  getTaskQueue: () => apiCall<unknown[]>("/swarm/queue"),
  submitTask: (taskSpec: Record<string, unknown>) =>
    apiCall<{ task_attempt_id: string }>("/swarm/submit", {
      method: "POST",
      body: taskSpec,
    }),
};

// ── Runtime Manager API ───────────────────────────────────

export interface RuntimeInstance {
  instance_id: string;
  agent_id: string;
  status: string;
  cpu_used: string;
  memory_used: string;
  uptime_seconds: number;
  last_heartbeat: string;
}

export const runtimeApi = {
  listInstances: () => apiCall<RuntimeInstance[]>("/runtime/instances"),
  getInstance: (instanceId: string) => apiCall<RuntimeInstance>(`/runtime/instances/${instanceId}`),
  startInstance: (agentId: string, config?: Record<string, unknown>) =>
    apiCall<RuntimeInstance>("/runtime/instances", {
      method: "POST",
      body: { agent_id: agentId, ...config },
    }),
  stopInstance: (instanceId: string) =>
    apiCall<{ status: string }>(`/runtime/instances/${instanceId}/stop`, { method: "POST" }),
};

// ── Sandbox Executor API ──────────────────────────────────

export interface SandboxStatus {
  sandbox_id: string;
  task_id: string;
  agent_id: string;
  status: string;
  runtime: string;
  created_at: string;
  resource_usage: Record<string, unknown>;
}

export const sandboxApi = {
  create: (spec: { task_id: string; agent_id: string; runtime?: string; cpu_limit?: string; memory_limit?: string }) =>
    apiCall<SandboxStatus>("/sandbox/create", { method: "POST", body: spec }),
  get: (sandboxId: string) => apiCall<SandboxStatus>(`/sandbox/${sandboxId}`),
  exec: (sandboxId: string, command: string) =>
    apiCall<{ exec_id: string; exit_code: number; stdout: string; stderr: string }>(
      `/sandbox/${sandboxId}/exec`,
      { method: "POST", body: { command } }
    ),
  destroy: (sandboxId: string) =>
    apiCall<{ status: string }>(`/sandbox/${sandboxId}`, { method: "DELETE" }),
  getLogs: (sandboxId: string) =>
    apiCall<{ timestamp: string; stream: string; message: string }[]>(`/sandbox/${sandboxId}/logs`),
};

// ── Model Gateway API ─────────────────────────────────────

export const modelGatewayApi = {
  generate: (taskType: string, prompt: string, modelPolicy?: string) =>
    apiCall<{
      response: string;
      model_route: string;
      token_counts: { input: number; output: number };
      latency_ms: number;
      cache_hit: boolean;
    }>("/models/generate", {
      method: "POST",
      body: { ...defaultMeta(), task_type: taskType, prompt, model_policy: modelPolicy },
    }),
  listModels: () => apiCall<{ models: { id: string; provider: string; status: string }[] }>("/models"),
};

// ── Tool Broker API ───────────────────────────────────────

export const toolBrokerApi = {
  execute: (toolName: string, params: Record<string, unknown>, grantId: string) =>
    apiCall<{ result: unknown; execution_time_ms: number; audit_id: string }>("/tools/execute", {
      method: "POST",
      body: { ...defaultMeta(), tool_name: toolName, parameters: params, tool_grant_id: grantId },
    }),
};

// ── Policy Enforcer API ───────────────────────────────────

export interface PolicyBundle {
  bundle_id: string;
  name: string;
  version: number;
  rules: Record<string, unknown>[];
  status: string;
}

export const policyApi = {
  check: (action: string, context: Record<string, unknown>) =>
    apiCall<{ decision: "allow" | "deny"; reason?: string; policy_id?: string }>("/policy/check", {
      method: "POST",
      body: { action, context },
    }),
  listBundles: () => apiCall<PolicyBundle[]>("/policy/bundles"),
  getBundle: (bundleId: string) => apiCall<PolicyBundle>(`/policy/bundles/${bundleId}`),
};

// ── Retrieval API ─────────────────────────────────────────

export interface SearchResult {
  document_id: string;
  title: string;
  content: string;
  source_name: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export const retrievalApi = {
  search: (query: string, topK = 8) =>
    apiCall<{ results: SearchResult[]; total_matches: number; query_latency_ms: number }>(
      "/retrieve/search",
      {
        method: "POST",
        body: { ...defaultMeta(), query, top_k: topK },
      }
    ),
};

// ── Artifact Catalog API ──────────────────────────────────

export interface ArtifactRecord {
  artifact_id: string;
  agent_id: string;
  artifact_type: string;
  name: string;
  version: string;
  content_hash: string;
  size_bytes: number;
  created_at: string;
  lineage: Record<string, unknown>;
}

export const artifactCatalogApi = {
  list: (agentId?: string) =>
    apiCall<ArtifactRecord[]>(`/artifacts${agentId ? `?agent_id=${agentId}` : ""}`),
  get: (artifactId: string) => apiCall<ArtifactRecord>(`/artifacts/${artifactId}`),
  register: (artifact: Partial<ArtifactRecord>) =>
    apiCall<ArtifactRecord>("/artifacts", { method: "POST", body: artifact }),
  getLineage: (artifactId: string) =>
    apiCall<{ chain: ArtifactRecord[] }>(`/artifacts/${artifactId}/lineage`),
};

// ── Evaluation API ────────────────────────────────────────

export interface EvaluationReport {
  evaluation_id: string;
  agent_id: string;
  agent_version: string;
  status: string;
  scores: {
    quality: number;
    safety: number;
    cost_efficiency: number;
    latency_p50_ms: number;
    latency_p99_ms: number;
  };
  verdict: "pass" | "fail" | "conditional";
  failures: { test_id: string; category: string; description: string; severity: string }[];
  created_at: string;
}

export const evaluationApi = {
  submitCandidate: (agentId: string, version: string) =>
    apiCall<{ evaluation_id: string; status: string }>("/evaluations/candidates", {
      method: "POST",
      body: { agent_id: agentId, agent_version: version },
    }),
  getReport: (evalId: string) => apiCall<EvaluationReport>(`/evaluations/${evalId}`),
  listReports: (agentId?: string) =>
    apiCall<EvaluationReport[]>(`/evaluations${agentId ? `?agent_id=${agentId}` : ""}`),
};

// ── Simulation API ────────────────────────────────────────

export interface Scenario {
  scenario_id: string;
  category: string;
  difficulty: string;
  user_input: string;
  expected_output?: string;
  expected_safety_flags: string[];
  tags: string[];
}

export interface ScenarioSuite {
  suite_id: string;
  agent_id: string;
  scenario_count: number;
  category_breakdown: Record<string, number>;
  scenarios: Scenario[];
}

export const simulationApi = {
  generate: (agentId: string, domain: string, count = 50) =>
    apiCall<ScenarioSuite>("/simulations/generate", {
      method: "POST",
      body: { agent_id: agentId, agent_domain: domain, count },
    }),
  getSuite: (suiteId: string) => apiCall<ScenarioSuite>(`/simulations/${suiteId}`),
  generateAdversarial: (agentId: string, attackTypes?: string[]) =>
    apiCall<ScenarioSuite>("/simulations/adversarial", {
      method: "POST",
      body: { agent_id: agentId, attack_types: attackTypes },
    }),
  generateLoadProfile: (agentId: string, durationMin = 30, peakRps = 100) =>
    apiCall<{ profile_id: string; phases: unknown[] }>(
      `/simulations/load-profile?agent_id=${agentId}&duration_minutes=${durationMin}&peak_rps=${peakRps}`,
      { method: "POST" }
    ),
};

// ── Replay API ────────────────────────────────────────────

export interface ReplaySession {
  session_id: string;
  agent_id: string;
  source_version: string;
  target_version: string;
  status: string;
  total_interactions: number;
  comparisons: {
    interaction_id: string;
    user_input: string;
    similarity_score: number;
    regression_detected: boolean;
  }[];
  summary: { total: number; regressions: number; verdict: string };
}

export const replayApi = {
  capture: (agentId: string, version: string, interactions: unknown[]) =>
    apiCall<{ captured: number }>("/replay/capture", {
      method: "POST",
      body: { agent_id: agentId, agent_version: version, interactions },
    }),
  run: (agentId: string, sourceVersion: string, targetVersion: string) =>
    apiCall<ReplaySession>("/replay/run", {
      method: "POST",
      body: { agent_id: agentId, source_version: sourceVersion, target_version: targetVersion },
    }),
  getSession: (sessionId: string) => apiCall<ReplaySession>(`/replay/${sessionId}`),
  listSessions: (agentId?: string) =>
    apiCall<{ session_id: string; verdict: string; started_at: string }[]>(
      `/replay/sessions${agentId ? `?agent_id=${agentId}` : ""}`
    ),
};

// ── Release Manager API ───────────────────────────────────

export interface Release {
  release_id: string;
  agent_id: string;
  agent_version: string;
  status: string;
  environment: string;
  canary_percentage: number;
  health_score: number;
  created_at: string;
}

export const releaseApi = {
  promote: (agentId: string, version: string, targetEnv: string) =>
    apiCall<Release>("/releases/promote", {
      method: "POST",
      body: { agent_id: agentId, agent_version: version, target_environment: targetEnv },
    }),
  getRelease: (releaseId: string) => apiCall<Release>(`/releases/${releaseId}`),
  listReleases: (agentId?: string) =>
    apiCall<Release[]>(`/releases${agentId ? `?agent_id=${agentId}` : ""}`),
  rollback: (releaseId: string) =>
    apiCall<{ status: string }>(`/releases/${releaseId}/rollback`, { method: "POST" }),
  getCanaryStatus: (releaseId: string) =>
    apiCall<{ healthy: boolean; error_rate: number; p99_latency_ms: number }>(
      `/releases/${releaseId}/canary`
    ),
};

// ── Artifact Signer API ───────────────────────────────────

export interface Signature {
  signature_id: string;
  artifact_id: string;
  signature: string;
  algorithm: string;
  key_id: string;
  signed_at: string;
}

export const signerApi = {
  sign: (artifactId: string, agentId: string, version: string, contentHash: string) =>
    apiCall<Signature>("/signing/sign", {
      method: "POST",
      body: { artifact_id: artifactId, agent_id: agentId, agent_version: version, content_hash: contentHash },
    }),
  verify: (artifactId: string, contentHash: string, signature: string) =>
    apiCall<{ valid: boolean; reason?: string }>("/signing/verify", {
      method: "POST",
      body: { artifact_id: artifactId, content_hash: contentHash, signature },
    }),
  listKeys: () =>
    apiCall<{ key_id: string; algorithm: string; status: string }[]>("/signing/keys"),
  rotateKey: (keyId: string) =>
    apiCall<{ key_id: string; version: number }>(`/signing/keys/rotate?key_id=${keyId}`, {
      method: "POST",
    }),
};

// ── Result Aggregator API ─────────────────────────────────

export const resultAggregatorApi = {
  getResult: (runId: string) =>
    apiCall<{ run_id: string; aggregated_output: unknown; task_results: unknown[] }>(
      `/results/${runId}`
    ),
  mergeResults: (runId: string, taskResults: unknown[]) =>
    apiCall<{ merged_output: unknown }>(`/results/${runId}/merge`, {
      method: "POST",
      body: { task_results: taskResults },
    }),
};
