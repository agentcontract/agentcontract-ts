/** Base validator types. */

export interface RunContext {
  input: string;
  output: string;
  durationMs: number;
  costUsd: number;
  toolCalls: unknown[];
  steps: number;
  metadata: Record<string, unknown>;
}

export function makeContext(partial: Partial<RunContext> & { input: string; output: string }): RunContext {
  return {
    durationMs: 0,
    costUsd: 0,
    toolCalls: [],
    steps: 0,
    metadata: {},
    ...partial,
  };
}

export interface ValidationResult {
  passed: boolean;
  clauseName: string;
  clauseText: string;
  clauseType: string;
  judge: 'deterministic' | 'llm';
  details: string;
}

export interface Validator {
  validate(context: RunContext): ValidationResult | Promise<ValidationResult>;
}
