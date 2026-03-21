/** Zod schemas for the AgentContract specification. */

import { z } from 'zod';

export const JudgeType = z.enum(['deterministic', 'llm']).default('deterministic');
export type JudgeType = z.infer<typeof JudgeType>;

export const ViolationAction = z.enum(['warn', 'block', 'rollback', 'halt_and_alert']).default('block');
export type ViolationAction = z.infer<typeof ViolationAction>;

export const AssertionType = z.enum(['pattern', 'schema', 'llm', 'cost', 'latency', 'custom']);
export type AssertionType = z.infer<typeof AssertionType>;

/** A clause is either a plain string or an object with text + judge. */
export const ClauseObject = z.object({
  text: z.string().min(1),
  judge: JudgeType,
  description: z.string().default(''),
});
export type ClauseObject = z.infer<typeof ClauseObject>;

export const Clause = z.union([z.string().min(1), ClauseObject]);
export type Clause = z.infer<typeof Clause>;

export const PreconditionClause = z.union([
  z.string().min(1),
  z.object({
    text: z.string().min(1),
    judge: JudgeType,
    on_fail: z.enum(['block', 'warn']).default('block'),
    description: z.string().default(''),
  }),
]);
export type PreconditionClause = z.infer<typeof PreconditionClause>;

export const Assertion = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: AssertionType,
  description: z.string().default(''),
  // pattern
  must_not_match: z.string().optional(),
  must_match: z.string().optional(),
  // schema
  schema: z.record(z.string(), z.unknown()).optional(),
  // llm
  prompt: z.string().optional(),
  pass_when: z.string().optional(),
  model: z.string().optional(),
  // cost
  max_usd: z.number().nonnegative().optional(),
  // latency
  max_ms: z.number().int().positive().optional(),
  // custom
  plugin: z.string().optional(),
}).passthrough();
export type Assertion = z.infer<typeof Assertion>;

export const Limits = z.object({
  max_tokens: z.number().int().positive().optional(),
  max_input_tokens: z.number().int().positive().optional(),
  max_latency_ms: z.number().int().positive().optional(),
  max_cost_usd: z.number().nonnegative().optional(),
  max_tool_calls: z.number().int().nonnegative().optional(),
  max_steps: z.number().int().positive().optional(),
}).default({});
export type Limits = z.infer<typeof Limits>;

export const OnViolation = z.object({
  default: ViolationAction,
}).catchall(z.string()).default({ default: 'block' });
export type OnViolation = z.infer<typeof OnViolation>;

export const Contract = z.object({
  agent: z.string().min(1),
  'spec-version': z.string(),
  version: z.string(),
  description: z.string().default(''),
  author: z.string().default(''),
  created: z.string().default(''),
  tags: z.array(z.string()).default([]),
  extends: z.string().optional(),
  must: z.array(Clause).default([]),
  must_not: z.array(Clause).default([]),
  can: z.array(z.string()).default([]),
  requires: z.array(PreconditionClause).default([]),
  ensures: z.array(Clause).default([]),
  invariant: z.array(Clause).default([]),
  assert: z.array(Assertion).default([]),
  limits: Limits,
  on_violation: OnViolation,
});
export type Contract = z.infer<typeof Contract>;

/** Helpers */
export function getClauseText(clause: Clause): string {
  return typeof clause === 'string' ? clause : clause.text;
}

export function getClauseJudge(clause: Clause): JudgeType {
  return typeof clause === 'string' ? 'deterministic' : clause.judge;
}

export function getViolationAction(onViolation: OnViolation, name: string): string {
  return (onViolation as Record<string, string>)[name] ?? onViolation.default;
}
