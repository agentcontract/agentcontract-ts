/** Cost validator. */

import type { RunContext, ValidationResult, Validator } from './base.js';

export class CostValidator implements Validator {
  constructor(
    private name: string,
    private maxUsd: number,
    private description = '',
  ) {}

  validate(context: RunContext): ValidationResult {
    const passed = context.costUsd <= this.maxUsd;
    return {
      passed,
      clauseName: this.name,
      clauseText: this.description || `cost must not exceed $${this.maxUsd.toFixed(4)} USD`,
      clauseType: 'assert',
      judge: 'deterministic',
      details: passed
        ? ''
        : `Run cost $${context.costUsd.toFixed(4)} exceeded limit $${this.maxUsd.toFixed(4)}`,
    };
  }
}
