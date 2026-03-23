/** Contract validation runner — orchestrates all validators per spec §6.1. */

import { randomUUID } from 'crypto';
import {
  Contract,
  Assertion,
  getClauseText,
  getClauseJudge,
  getViolationAction,
} from './models.js';
import type { RunContext, ValidationResult } from './validators/base.js';
import { PatternValidator } from './validators/pattern.js';
import { CostValidator } from './validators/cost.js';
import { LatencyValidator } from './validators/latency.js';
import { LLMValidator } from './validators/llm.js';

export interface ViolationRecord {
  clauseType: string;
  clauseName: string;
  clauseText: string;
  severity: string;
  actionTaken: string;
  judge: string;
  details: string;
}

export interface RunResult {
  passed: boolean;
  runId: string;
  agent: string;
  contractVersion: string;
  violations: ViolationRecord[];
  clausesChecked: number;
  context: RunContext;
  outcome: 'pass' | 'violation';
}

export class ContractRunner {
  constructor(private contract: Contract) {}

  async run(context: RunContext, runId?: string): Promise<RunResult> {
    const rid = runId ?? randomUUID();
    const violations: ViolationRecord[] = [];
    const c = this.contract;
    const ov = c.on_violation;

    // 1. limits
    violations.push(...this._checkLimits(context));

    // 2. assert
    for (const assertion of c.assert) {
      const result = await this._runAssertion(assertion, context);
      if (!result.passed) {
        const action = getViolationAction(ov, assertion.name);
        violations.push({
          clauseType: 'assert',
          clauseName: assertion.name,
          clauseText: result.clauseText,
          severity: action,
          actionTaken: action,
          judge: result.judge,
          details: result.details,
        });
      }
    }

    // 3. must
    for (const clause of c.must) {
      const text = getClauseText(clause);
      const judge = getClauseJudge(clause);
      const result = await this._evaluateClause(text, 'must', judge, context);
      if (!result.passed) {
        const action = getViolationAction(ov, `must:${text.slice(0, 30)}`);
        violations.push({ clauseType: 'must', clauseName: `must:${text.slice(0, 30)}`, clauseText: text, severity: action, actionTaken: action, judge, details: result.details });
      }
    }

    // 4. must_not
    for (const clause of c.must_not) {
      const text = getClauseText(clause);
      const judge = getClauseJudge(clause);
      const result = await this._evaluateClause(text, 'must_not', judge, context);
      if (!result.passed) {
        const action = getViolationAction(ov, `must_not:${text.slice(0, 30)}`);
        violations.push({ clauseType: 'must_not', clauseName: `must_not:${text.slice(0, 30)}`, clauseText: text, severity: action, actionTaken: action, judge, details: result.details });
      }
    }

    // 5. ensures
    for (const clause of c.ensures) {
      const text = getClauseText(clause);
      const judge = getClauseJudge(clause);
      const result = await this._evaluateClause(text, 'ensures', judge, context);
      if (!result.passed) {
        const action = getViolationAction(ov, `ensures:${text.slice(0, 30)}`);
        violations.push({ clauseType: 'ensures', clauseName: `ensures:${text.slice(0, 30)}`, clauseText: text, severity: action, actionTaken: action, judge, details: result.details });
      }
    }

    const blocking = ['block', 'rollback', 'halt_and_alert'];
    const passed = !violations.some((v) => blocking.includes(v.actionTaken));

    return { passed, runId: rid, agent: c.agent, contractVersion: c.version, violations, clausesChecked: c.assert.length, context, outcome: passed ? 'pass' : 'violation' };
  }

  private _checkLimits(context: RunContext): ViolationRecord[] {
    const records: ViolationRecord[] = [];
    const limits = this.contract.limits;
    const ov = this.contract.on_violation;

    if (limits.max_latency_ms != null) {
      const r = new LatencyValidator('max_latency_ms', limits.max_latency_ms).validate(context);
      if (!r.passed) {
        const action = getViolationAction(ov, 'max_latency_ms');
        records.push({ clauseType: 'limits', clauseName: 'max_latency_ms', clauseText: r.clauseText, severity: action, actionTaken: action, judge: 'deterministic', details: r.details });
      }
    }

    if (limits.max_cost_usd != null) {
      const r = new CostValidator('max_cost_usd', limits.max_cost_usd).validate(context);
      if (!r.passed) {
        const action = getViolationAction(ov, 'max_cost_usd');
        records.push({ clauseType: 'limits', clauseName: 'max_cost_usd', clauseText: r.clauseText, severity: action, actionTaken: action, judge: 'deterministic', details: r.details });
      }
    }

    if (limits.max_tokens != null && context.output) {
      const estimated = Math.floor(context.output.length / 4);
      if (estimated > limits.max_tokens) {
        const action = getViolationAction(ov, 'max_tokens');
        records.push({ clauseType: 'limits', clauseName: 'max_tokens', clauseText: `output must not exceed ${limits.max_tokens} tokens`, severity: action, actionTaken: action, judge: 'deterministic', details: `Estimated ${estimated} tokens exceeds limit of ${limits.max_tokens}` });
      }
    }

    return records;
  }

  private async _runAssertion(assertion: Assertion, context: RunContext): Promise<ValidationResult> {
    switch (assertion.type) {
      case 'pattern':
        return new PatternValidator(assertion.name, assertion.must_not_match, assertion.must_match, assertion.description).validate(context);
      case 'cost':
        return new CostValidator(assertion.name, assertion.max_usd ?? 0, assertion.description).validate(context);
      case 'latency':
        return new LatencyValidator(assertion.name, assertion.max_ms ?? 0, assertion.description).validate(context);
      case 'llm':
        return new LLMValidator(assertion.name, assertion.description || assertion.name, 'assert', assertion.prompt, assertion.pass_when ?? 'NO', assertion.model).validate(context);
      default:
        return { passed: false, clauseName: assertion.name, clauseText: assertion.description || assertion.name, clauseType: 'assert', judge: 'deterministic', details: `Unsupported assertion type: ${assertion.type}` };
    }
  }

  private async _evaluateClause(text: string, clauseType: string, judge: string, context: RunContext): Promise<ValidationResult> {
    if (judge === 'llm') {
      return new LLMValidator(`${clauseType}:${text.slice(0, 30)}`, text, clauseType).validate(context);
    }
    // Deterministic natural language: pass by default (no handler registered)
    return { passed: true, clauseName: `${clauseType}:${text.slice(0, 30)}`, clauseText: text, clauseType, judge: 'deterministic', details: '' };
  }
}
