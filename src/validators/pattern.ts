/** Regex pattern validator. */

import type { RunContext, ValidationResult, Validator } from './base.js';

export class PatternValidator implements Validator {
  constructor(
    private name: string,
    private mustNotMatch?: string,
    private mustMatch?: string,
    private description = '',
  ) {}

  validate(context: RunContext): ValidationResult {
    const output = context.output;

    if (this.mustNotMatch) {
      const re = new RegExp(this.mustNotMatch);
      const match = re.exec(output);
      if (match) {
        return {
          passed: false,
          clauseName: this.name,
          clauseText: this.description || `must_not_match: ${this.mustNotMatch}`,
          clauseType: 'assert',
          judge: 'deterministic',
          details: `Forbidden pattern found: '${match[0].slice(0, 50)}'`,
        };
      }
    }

    if (this.mustMatch) {
      const re = new RegExp(this.mustMatch);
      if (!re.test(output)) {
        return {
          passed: false,
          clauseName: this.name,
          clauseText: this.description || `must_match: ${this.mustMatch}`,
          clauseType: 'assert',
          judge: 'deterministic',
          details: 'Required pattern not found in output.',
        };
      }
    }

    return {
      passed: true,
      clauseName: this.name,
      clauseText: this.description || this.name,
      clauseType: 'assert',
      judge: 'deterministic',
      details: '',
    };
  }
}
