export interface PromptVersionInput {
  prompt: string;
  score: number;
  status: "promoted" | "rejected" | "rolled_back";
  reason: string;
}

export interface PromptPolicyStore {
  getState(key: string): string | null;
  setState(key: string, value: string): void;
  savePromptVersion(input: PromptVersionInput): number;
  getPreviousPromotedPrompt(): {
    id: number;
    prompt: string;
    score: number;
  } | null;
}

const POLICY_CHECKS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /portugu[eê]s brasileiro|pt-br/i, weight: 10 },
  { pattern: /somente fatos|use only facts|n[aã]o invent/i, weight: 20 },
  { pattern: /cita[cç][aã]o|cite sources|source citations/i, weight: 15 },
  { pattern: /evid[eê]ncia|evidence/i, weight: 15 },
  { pattern: /conciso|concise|high-signal/i, weight: 10 },
  { pattern: /espec[ií]fic|specific/i, weight: 10 },
  {
    pattern: /dado n[aã]o confi[aá]vel|untrusted.*data|never.*instruction/i,
    weight: 20,
  },
];

export function scorePromptPolicy(prompt: string): number {
  if (!prompt.trim()) return 0;
  return POLICY_CHECKS.reduce(
    (score, check) => score + (check.pattern.test(prompt) ? check.weight : 0),
    0,
  );
}

export function promotePromptCandidate(
  store: PromptPolicyStore,
  candidate: string,
): { promoted: boolean; score: number; reason: string } {
  const normalized = candidate.trim();
  const score = scorePromptPolicy(normalized);
  const current = store.getState("system_prompt") ?? "";
  const currentScore = scorePromptPolicy(current);
  const threshold = Math.max(70, currentScore);

  if (score < threshold) {
    const reason = `prompt policy regression: candidate=${score}, required=${threshold}`;
    store.savePromptVersion({
      prompt: normalized,
      score,
      status: "rejected",
      reason,
    });
    return { promoted: false, score, reason };
  }

  if (current.trim()) {
    store.savePromptVersion({
      prompt: current,
      score: currentScore,
      status: "promoted",
      reason: "baseline captured before promotion",
    });
  }
  store.setState("system_prompt", normalized);
  store.savePromptVersion({
    prompt: normalized,
    score,
    status: "promoted",
    reason: `candidate passed policy gate ${score}/${threshold}`,
  });
  return { promoted: true, score, reason: "policy gate passed" };
}

export function rollbackPrompt(store: PromptPolicyStore): boolean {
  const previous = store.getPreviousPromotedPrompt();
  if (!previous) return false;
  store.setState("system_prompt", previous.prompt);
  store.savePromptVersion({
    prompt: previous.prompt,
    score: previous.score,
    status: "rolled_back",
    reason: `rollback to prompt version ${previous.id}`,
  });
  return true;
}
