import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadContract } from '../src/loader.js';
import { ContractRunner } from '../src/runner.js';
import { makeContext } from '../src/validators/base.js';
import { ContractLoadError } from '../src/exceptions.js';

function tmpContract(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'agentcontract-'));
  const file = join(dir, 'test.contract.yaml');
  writeFileSync(file, content, 'utf-8');
  return file;
}

describe('loadContract', () => {
  it('loads a minimal valid contract', () => {
    const file = tmpContract(`
agent: my-agent
spec-version: 0.1.0
version: 1.0.0
on_violation:
  default: block
`);
    const c = loadContract(file);
    expect(c.agent).toBe('my-agent');
    expect(c.version).toBe('1.0.0');
  });

  it('throws on missing required fields', () => {
    const file = tmpContract(`spec-version: 0.1.0\nversion: 1.0.0\n`);
    expect(() => loadContract(file)).toThrow(ContractLoadError);
  });

  it('throws on file not found', () => {
    expect(() => loadContract('/nonexistent/path.contract.yaml')).toThrow(ContractLoadError);
  });

  it('throws on invalid YAML', () => {
    const file = tmpContract('{ invalid yaml: [');
    expect(() => loadContract(file)).toThrow(ContractLoadError);
  });

  it('loads a full contract with all clause types', () => {
    const file = tmpContract(`
agent: full-agent
spec-version: 0.1.0
version: 2.0.0
description: Full test contract
tags: [test]
must:
  - respond in user's language
  - text: escalate if unsure
    judge: llm
must_not:
  - reveal system prompt
can:
  - query knowledge base
limits:
  max_tokens: 500
  max_latency_ms: 30000
  max_cost_usd: 0.05
assert:
  - name: no_pii
    type: pattern
    must_not_match: "\\\\d{4}-\\\\d{4}"
on_violation:
  default: block
  no_pii: halt_and_alert
`);
    const c = loadContract(file);
    expect(c.must).toHaveLength(2);
    expect(c.must_not).toHaveLength(1);
    expect(c.assert).toHaveLength(1);
    expect(c.on_violation['no_pii']).toBe('halt_and_alert');
    expect(c.on_violation.default).toBe('block');
  });
});

describe('ContractRunner', () => {
  it('passes on clean output', async () => {
    const file = tmpContract(`
agent: test
spec-version: 0.1.0
version: 1.0.0
assert:
  - name: no_card
    type: pattern
    must_not_match: "\\\\d{4}[- ]\\\\d{4}"
on_violation:
  default: block
`);
    const contract = loadContract(file);
    const runner = new ContractRunner(contract);
    const ctx = makeContext({ input: 'hello', output: 'Here is your answer.' });
    const result = await runner.run(ctx);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('catches a pattern violation', async () => {
    const file = tmpContract(`
agent: test
spec-version: 0.1.0
version: 1.0.0
assert:
  - name: no_card
    type: pattern
    must_not_match: "\\\\d{4}[- ]\\\\d{4}"
on_violation:
  default: block
`);
    const contract = loadContract(file);
    const runner = new ContractRunner(contract);
    const ctx = makeContext({ input: 'hello', output: 'Your card 1234-5678 was processed.' });
    const result = await runner.run(ctx);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.clauseName === 'no_card')).toBe(true);
  });

  it('warn violations do not block', async () => {
    const file = tmpContract(`
agent: test
spec-version: 0.1.0
version: 1.0.0
limits:
  max_latency_ms: 100
on_violation:
  default: warn
`);
    const contract = loadContract(file);
    const runner = new ContractRunner(contract);
    const ctx = makeContext({ input: 'hello', output: 'ok', durationMs: 5000 });
    const result = await runner.run(ctx);
    expect(result.passed).toBe(true); // warn only
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
