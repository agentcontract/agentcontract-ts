/** Regex pattern validator. */

import type { RunContext, ValidationResult, Validator } from './base.js';

export class PatternValidator implements Validator {
  constructor(
    private name: string,
    private mustNotMatch?: string,
    private mustMatch?: string,
    private description = '',
  ) {}

  private _compile(pattern: string): RegExp {
    // Convert Python-style inline flags e.g. (?i) → RegExp flags
    const inlineFlagMap: Record<string, string> = { i: 'i', m: 'm', s: 's' };
    let flags = '';
    const stripped = pattern.replace(/^\(\?([imsx]+)\)/, (_, f: string) => {
      for (const ch of f) if (inlineFlagMap[ch]) flags += inlineFlagMap[ch];
      return '';
    });
    return new RegExp(stripped, flags);
  }

  validate(context: RunContext): ValidationResult {
    const output = context.output;

    if (this.mustNotMatch) {
      const re = this._compile(this.mustNotMatch);
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
      const re = this._compile(this.mustMatch);
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
