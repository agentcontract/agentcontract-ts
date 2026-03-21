/** Latency validator. */

import type { RunContext, ValidationResult, Validator } from './base.js';

export class LatencyValidator implements Validator {
  constructor(
    private name: string,
    private maxMs: number,
    private description = '',
  ) {}

  validate(context: RunContext): ValidationResult {
    const passed = context.durationMs <= this.maxMs;
    return {
      passed,
      clauseName: this.name,
      clauseText: this.description || `latency must not exceed ${this.maxMs}ms`,
      clauseType: 'assert',
      judge: 'deterministic',
      details: passed
        ? ''
        : `Run took ${Math.round(context.durationMs)}ms, exceeded limit of ${this.maxMs}ms`,
    };
  }
}
