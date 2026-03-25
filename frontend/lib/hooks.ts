/**
 * TanStack Query hooks for all Agent Architect Pro backend services.
 *
 * Each hook provides:
 * - Automatic caching and deduplication
 * - Background refetch on window focus
 * - Loading/error states
 * - Type-safe data access
 *
 * Usage:
 *   const { data, isLoading, error } = useRuns();
 *   const { mutate: createRun } = useCreateRun();
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  runsApi,
  plansApi,
  identityApi,
  authApi,
  auditApi,
  swarmApi,
  runtimeApi,
  sandboxApi,
  modelGatewayApi,
  policyApi,
  retrievalApi,
  artifactCatalogApi,
  evaluationApi,
  simulationApi,
  replayApi,
  releaseApi,
  signerApi,
  resultAggregatorApi,
} from "@/lib/api";
import type {
  RunStatus,
  AgentSpec,
  AuditEvent,
  RuntimeInstance,
  SandboxStatus,
  PolicyBundle,
  SearchResult,
  ArtifactRecord,
  EvaluationReport,
  ScenarioSuite,
  ReplaySession,
  Release,
} from "@/lib/api";


// ── Query Keys ────────────────────────────────────────────

export const queryKeys = {
  runs: {
    all: ["runs"] as const,
    detail: (id: string) => ["runs", id] as const,
  },
  plans: {
    all: ["plans"] as const,
  },
  agents: {
    all: ["agents"] as const,
    detail: (id: string) => ["agents", id] as const,
    versions: (id: string) => ["agents", id, "versions"] as const,
    instances: (id: string) => ["agents", id, "instances"] as const,
  },
  audit: {
    run: (runId: string) => ["audit", "run", runId] as const,
    stats: ["audit", "stats"] as const,
  },
  swarm: {
    capacity: ["swarm", "capacity"] as const,
    queue: ["swarm", "queue"] as const,
  },
  runtime: {
    instances: ["runtime", "instances"] as const,
    detail: (id: string) => ["runtime", "instances", id] as const,
  },
  sandbox: {
    detail: (id: string) => ["sandbox", id] as const,
    logs: (id: string) => ["sandbox", id, "logs"] as const,
  },
  models: {
    all: ["models"] as const,
  },
  policy: {
    bundles: ["policy", "bundles"] as const,
    detail: (id: string) => ["policy", "bundles", id] as const,
  },
  retrieval: {
    search: (query: string) => ["retrieval", "search", query] as const,
  },
  artifacts: {
    all: (agentId?: string) => ["artifacts", agentId ?? "all"] as const,
    detail: (id: string) => ["artifacts", id] as const,
    lineage: (id: string) => ["artifacts", id, "lineage"] as const,
  },
  evaluations: {
    all: (agentId?: string) => ["evaluations", agentId ?? "all"] as const,
    detail: (id: string) => ["evaluations", id] as const,
  },
  simulations: {
    suite: (id: string) => ["simulations", id] as const,
  },
  replay: {
    sessions: (agentId?: string) => ["replay", "sessions", agentId ?? "all"] as const,
    detail: (id: string) => ["replay", id] as const,
  },
  releases: {
    all: (agentId?: string) => ["releases", agentId ?? "all"] as const,
    detail: (id: string) => ["releases", id] as const,
    canary: (id: string) => ["releases", id, "canary"] as const,
  },
  signing: {
    keys: ["signing", "keys"] as const,
  },
  results: {
    detail: (runId: string) => ["results", runId] as const,
  },
} as const;


// ── Runs Hooks ────────────────────────────────────────────

export function useRun(runId: string) {
  return useQuery({
    queryKey: queryKeys.runs.detail(runId),
    queryFn: () => runsApi.get(runId),
    enabled: !!runId,
    refetchInterval: (query: { state: { data?: RunStatus | undefined } }) => {
      const state = query.state.data?.state;
      return state === "running" || state === "planning" ? 3000 : false;
    },
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ objective, constraints }: { objective: string; constraints?: Record<string, unknown> }) =>
      runsApi.create(objective, constraints),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all }),
  });
}

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => runsApi.cancel(runId),
    onSuccess: (_data: unknown, runId: string) => {
      qc.invalidateQueries({ queryKey: queryKeys.runs.detail(runId) });
      qc.invalidateQueries({ queryKey: queryKeys.runs.all });
    },
  });
}

// ── Plans Hooks ───────────────────────────────────────────

export function useCreatePlan() {
  return useMutation({
    mutationFn: ({ goal, budget }: { goal: string; budget?: Record<string, unknown> }) =>
      plansApi.create(goal, budget),
  });
}

// ── Identity / Agents Hooks ───────────────────────────────

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.all,
    queryFn: () => identityApi.listAgents(),
  });
}

export function useAgent(agentId: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(agentId),
    queryFn: () => identityApi.getAgent(agentId),
    enabled: !!agentId,
  });
}

export function useRegisterAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spec: Partial<AgentSpec>) => identityApi.registerAgent(spec),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents.all }),
  });
}

export function useAgentVersions(agentId: string) {
  return useQuery({
    queryKey: queryKeys.agents.versions(agentId),
    queryFn: () => identityApi.listVersions(agentId),
    enabled: !!agentId,
  });
}

// ── Auth Hooks ────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
  });
}

// ── Audit Hooks ───────────────────────────────────────────

export function useRunAudit(runId: string) {
  return useQuery({
    queryKey: queryKeys.audit.run(runId),
    queryFn: () => auditApi.getRunAudit(runId),
    enabled: !!runId,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: queryKeys.audit.stats,
    queryFn: () => auditApi.getStats(),
  });
}

export function useVerifyAuditChain() {
  return useMutation({
    mutationFn: (runId: string) => auditApi.verifyChain(runId),
  });
}

// ── Swarm Hooks ───────────────────────────────────────────

export function useSwarmCapacity() {
  return useQuery({
    queryKey: queryKeys.swarm.capacity,
    queryFn: () => swarmApi.getCapacity(),
    refetchInterval: 10000,
  });
}

export function useTaskQueue() {
  return useQuery({
    queryKey: queryKeys.swarm.queue,
    queryFn: () => swarmApi.getTaskQueue(),
    refetchInterval: 5000,
  });
}

// ── Runtime Hooks ─────────────────────────────────────────

export function useRuntimeInstances() {
  return useQuery({
    queryKey: queryKeys.runtime.instances,
    queryFn: () => runtimeApi.listInstances(),
    refetchInterval: 15000,
  });
}

export function useRuntimeInstance(instanceId: string) {
  return useQuery({
    queryKey: queryKeys.runtime.detail(instanceId),
    queryFn: () => runtimeApi.getInstance(instanceId),
    enabled: !!instanceId,
  });
}

export function useStartInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, config }: { agentId: string; config?: Record<string, unknown> }) =>
      runtimeApi.startInstance(agentId, config),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runtime.instances }),
  });
}

export function useStopInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => runtimeApi.stopInstance(instanceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runtime.instances }),
  });
}

// ── Sandbox Hooks ─────────────────────────────────────────

export function useSandbox(sandboxId: string) {
  return useQuery({
    queryKey: queryKeys.sandbox.detail(sandboxId),
    queryFn: () => sandboxApi.get(sandboxId),
    enabled: !!sandboxId,
  });
}

export function useSandboxLogs(sandboxId: string) {
  return useQuery({
    queryKey: queryKeys.sandbox.logs(sandboxId),
    queryFn: () => sandboxApi.getLogs(sandboxId),
    enabled: !!sandboxId,
    refetchInterval: 3000,
  });
}

export function useCreateSandbox() {
  return useMutation({
    mutationFn: (spec: { task_id: string; agent_id: string; runtime?: string }) =>
      sandboxApi.create(spec),
  });
}

export function useExecInSandbox() {
  return useMutation({
    mutationFn: ({ sandboxId, command }: { sandboxId: string; command: string }) =>
      sandboxApi.exec(sandboxId, command),
  });
}

export function useDestroySandbox() {
  return useMutation({
    mutationFn: (sandboxId: string) => sandboxApi.destroy(sandboxId),
  });
}

// ── Model Gateway Hooks ───────────────────────────────────

export function useModels() {
  return useQuery({
    queryKey: queryKeys.models.all,
    queryFn: () => modelGatewayApi.listModels(),
  });
}

export function useGenerate() {
  return useMutation({
    mutationFn: ({ taskType, prompt, modelPolicy }: { taskType: string; prompt: string; modelPolicy?: string }) =>
      modelGatewayApi.generate(taskType, prompt, modelPolicy),
  });
}

// ── Policy Hooks ──────────────────────────────────────────

export function usePolicyBundles() {
  return useQuery({
    queryKey: queryKeys.policy.bundles,
    queryFn: () => policyApi.listBundles(),
  });
}

export function usePolicyBundle(bundleId: string) {
  return useQuery({
    queryKey: queryKeys.policy.detail(bundleId),
    queryFn: () => policyApi.getBundle(bundleId),
    enabled: !!bundleId,
  });
}

export function usePolicyCheck() {
  return useMutation({
    mutationFn: ({ action, context }: { action: string; context: Record<string, unknown> }) =>
      policyApi.check(action, context),
  });
}

// ── Retrieval / Search Hooks ──────────────────────────────

export function useKnowledgeSearch(query: string, topK = 8) {
  return useQuery({
    queryKey: queryKeys.retrieval.search(query),
    queryFn: () => retrievalApi.search(query, topK),
    enabled: !!query && query.length >= 3,
    staleTime: 60 * 1000,
  });
}

// ── Artifact Catalog Hooks ────────────────────────────────

export function useArtifacts(agentId?: string) {
  return useQuery({
    queryKey: queryKeys.artifacts.all(agentId),
    queryFn: () => artifactCatalogApi.list(agentId),
  });
}

export function useArtifact(artifactId: string) {
  return useQuery({
    queryKey: queryKeys.artifacts.detail(artifactId),
    queryFn: () => artifactCatalogApi.get(artifactId),
    enabled: !!artifactId,
  });
}

export function useArtifactLineage(artifactId: string) {
  return useQuery({
    queryKey: queryKeys.artifacts.lineage(artifactId),
    queryFn: () => artifactCatalogApi.getLineage(artifactId),
    enabled: !!artifactId,
  });
}

export function useRegisterArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (artifact: Partial<ArtifactRecord>) => artifactCatalogApi.register(artifact),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artifacts"] }),
  });
}

// ── Evaluation Hooks ──────────────────────────────────────

export function useEvaluations(agentId?: string) {
  return useQuery({
    queryKey: queryKeys.evaluations.all(agentId),
    queryFn: () => evaluationApi.listReports(agentId),
  });
}

export function useEvaluation(evalId: string) {
  return useQuery({
    queryKey: queryKeys.evaluations.detail(evalId),
    queryFn: () => evaluationApi.getReport(evalId),
    enabled: !!evalId,
  });
}

export function useSubmitEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, version }: { agentId: string; version: string }) =>
      evaluationApi.submitCandidate(agentId, version),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] }),
  });
}

// ── Simulation Hooks ──────────────────────────────────────

export function useSimulationSuite(suiteId: string) {
  return useQuery({
    queryKey: queryKeys.simulations.suite(suiteId),
    queryFn: () => simulationApi.getSuite(suiteId),
    enabled: !!suiteId,
  });
}

export function useGenerateSimulation() {
  return useMutation({
    mutationFn: ({ agentId, domain, count }: { agentId: string; domain: string; count?: number }) =>
      simulationApi.generate(agentId, domain, count),
  });
}

export function useGenerateAdversarial() {
  return useMutation({
    mutationFn: ({ agentId, attackTypes }: { agentId: string; attackTypes?: string[] }) =>
      simulationApi.generateAdversarial(agentId, attackTypes),
  });
}

// ── Replay Hooks ──────────────────────────────────────────

export function useReplaySessions(agentId?: string) {
  return useQuery({
    queryKey: queryKeys.replay.sessions(agentId),
    queryFn: () => replayApi.listSessions(agentId),
  });
}

export function useReplaySession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.replay.detail(sessionId),
    queryFn: () => replayApi.getSession(sessionId),
    enabled: !!sessionId,
  });
}

export function useRunReplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agentId,
      sourceVersion,
      targetVersion,
    }: {
      agentId: string;
      sourceVersion: string;
      targetVersion: string;
    }) => replayApi.run(agentId, sourceVersion, targetVersion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["replay"] }),
  });
}

// ── Release Hooks ─────────────────────────────────────────

export function useReleases(agentId?: string) {
  return useQuery({
    queryKey: queryKeys.releases.all(agentId),
    queryFn: () => releaseApi.listReleases(agentId),
  });
}

export function useRelease(releaseId: string) {
  return useQuery({
    queryKey: queryKeys.releases.detail(releaseId),
    queryFn: () => releaseApi.getRelease(releaseId),
    enabled: !!releaseId,
  });
}

export function useCanaryStatus(releaseId: string) {
  return useQuery({
    queryKey: queryKeys.releases.canary(releaseId),
    queryFn: () => releaseApi.getCanaryStatus(releaseId),
    enabled: !!releaseId,
    refetchInterval: 5000,
  });
}

export function usePromoteRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agentId,
      version,
      targetEnv,
    }: {
      agentId: string;
      version: string;
      targetEnv: string;
    }) => releaseApi.promote(agentId, version, targetEnv),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["releases"] }),
  });
}

export function useRollbackRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (releaseId: string) => releaseApi.rollback(releaseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["releases"] }),
  });
}

// ── Artifact Signer Hooks ─────────────────────────────────

export function useSigningKeys() {
  return useQuery({
    queryKey: queryKeys.signing.keys,
    queryFn: () => signerApi.listKeys(),
  });
}

export function useSignArtifact() {
  return useMutation({
    mutationFn: ({
      artifactId,
      agentId,
      version,
      contentHash,
    }: {
      artifactId: string;
      agentId: string;
      version: string;
      contentHash: string;
    }) => signerApi.sign(artifactId, agentId, version, contentHash),
  });
}

export function useVerifySignature() {
  return useMutation({
    mutationFn: ({
      artifactId,
      contentHash,
      signature,
    }: {
      artifactId: string;
      contentHash: string;
      signature: string;
    }) => signerApi.verify(artifactId, contentHash, signature),
  });
}

export function useRotateKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => signerApi.rotateKey(keyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signing.keys }),
  });
}

// ── Result Aggregator Hooks ───────────────────────────────

export function useRunResult(runId: string) {
  return useQuery({
    queryKey: queryKeys.results.detail(runId),
    queryFn: () => resultAggregatorApi.getResult(runId),
    enabled: !!runId,
  });
}
