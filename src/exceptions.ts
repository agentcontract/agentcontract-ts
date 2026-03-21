/** AgentContract exceptions. */

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export class ContractLoadError extends ContractError {
  constructor(message: string) {
    super(message);
    this.name = 'ContractLoadError';
  }
}

export class ContractPreconditionError extends ContractError {
  clause: string;
  details: string;

  constructor(clause: string, details = '') {
    super(`[PRECONDITION FAILED] ${clause}${details ? ': ' + details : ''}`);
    this.name = 'ContractPreconditionError';
    this.clause = clause;
    this.details = details;
  }
}

export class ContractViolation extends ContractError {
  violations: Array<{ clause_type: string; clause_text: string; action_taken: string }>;

  constructor(violations: Array<{ clause_type: string; clause_text: string; action_taken: string }>) {
    const lines = violations.map(
      (v) => `[${v.action_taken.toUpperCase()}] ${v.clause_type.toUpperCase()}: "${v.clause_text}"`
    );
    super('AgentContractViolation:\n' + lines.join('\n'));
    this.name = 'ContractViolation';
    this.violations = violations;
  }
}
