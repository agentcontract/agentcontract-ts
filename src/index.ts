/**
 * @agentcontract/core — Behavioral contracts for AI agents.
 * TypeScript reference implementation of the AgentContract specification.
 * https://github.com/agentcontract/spec
 */

export const VERSION = '0.1.1';
export const SPEC_VERSION = '0.1.0';

export { loadContract } from './loader.js';
export { enforce } from './enforce.js';
export { ContractRunner } from './runner.js';
export { AuditWriter } from './audit.js';
export { makeContext } from './validators/base.js';

export type { Contract, Clause, Assertion, Limits, OnViolation } from './models.js';
export type { RunContext, ValidationResult, Validator } from './validators/base.js';
export type { RunResult, ViolationRecord } from './runner.js';
export type { EnforceOptions } from './enforce.js';

export {
  ContractError,
  ContractLoadError,
  ContractPreconditionError,
  ContractViolation,
} from './exceptions.js';
