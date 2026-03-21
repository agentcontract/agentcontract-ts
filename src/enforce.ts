/** enforce() — wraps any agent function with contract validation. */

import { Contract, getViolationAction, PreconditionClause } from './models.js';
import { ContractPreconditionError, ContractViolation } from './exceptions.js';
import { ContractRunner } from './runner.js';
import { makeContext } from './validators/base.js';
import { LLMValidator } from './validators/llm.js';

export interface EnforceOptions {
  audit?: boolean;
  auditPath?: string;
  costFn?: (result: unknown) => number;
}

type AgentFn<T extends string | Promise<string>> = (input: string) => T;

export function enforce<T extends string | Promise<string>>(
  contract: Contract,
  fn: AgentFn<T>,
  options: EnforceOptions = {},
): AgentFn<Promise<string>> {
  const { audit = true, auditPath = 'agentcontract-audit.jsonl', costFn } = options;
  const runner = new ContractRunner(contract);

  return async (input: string): Promise<string> => {
    // Preconditions
    await checkPreconditions(contract, input);

    // Run agent with timing
    const start = performance.now();
    const result = await Promise.resolve(fn(input));
    const durationMs = performance.now() - start;

    const output = String(result ?? '');
    const costUsd = costFn ? costFn(result) : 0;

    const ctx = makeContext({ input, output, durationMs, costUsd });
    const runResult = await runner.run(ctx);

    if (audit) {
      const { AuditWriter } = await import('./audit.js');
      new AuditWriter(auditPath).write(runResult);
    }

    // Warn violations → stderr
    const warnViolations = runResult.violations.filter((v) => v.actionTaken === 'warn');
    for (const v of warnViolations) {
      process.stderr.write(
        `[AgentContract WARN] ${v.clauseType.toUpperCase()}: "${v.clauseText}" — ${v.details}\n`
      );
    }

    // Blocking violations → throw
    const blocking = runResult.violations.filter((v) =>
      ['block', 'rollback', 'halt_and_alert'].includes(v.actionTaken)
    );
    if (blocking.length > 0) {
      throw new ContractViolation(
        blocking.map((v) => ({
          clause_type: v.clauseType,
          clause_text: v.clauseText,
          action_taken: v.actionTaken,
        }))
      );
    }

    return output;
  };
}

async function checkPreconditions(contract: Contract, input: string): Promise<void> {
  for (const precondition of contract.requires) {
    let text: string;
    let judge: string;
    let onFail: string;

    if (typeof precondition === 'string') {
      text = precondition;
      judge = 'deterministic';
      onFail = 'block';
    } else {
      text = precondition.text;
      judge = precondition.judge;
      onFail = precondition.on_fail;
    }

    let passed = true;
    let details = '';

    if (judge === 'deterministic') {
      if (/non-empty|not empty/i.test(text)) {
        passed = input.trim().length > 0;
        details = passed ? '' : 'Input is empty.';
      }
    } else if (judge === 'llm') {
      const ctx = makeContext({ input, output: '' });
      const result = await new LLMValidator(`requires:${text.slice(0, 30)}`, text, 'requires').validate(ctx);
      passed = result.passed;
      details = result.details;
    }

    if (!passed && onFail === 'block') {
      throw new ContractPreconditionError(text, details);
    }
  }
}
