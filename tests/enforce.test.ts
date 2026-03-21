import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadContract } from '../src/loader.js';
import { enforce } from '../src/enforce.js';
import { ContractViolation, ContractPreconditionError } from '../src/exceptions.js';
import { Contract } from '../src/models.js';

function tmpContract(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'agentcontract-'));
  const file = join(dir, 'test.contract.yaml');
  writeFileSync(file, content, 'utf-8');
  return file;
}

function makeContract(overrides: Partial<Record<string, unknown>> = {}): Contract {
  return Contract.parse({
    agent: 'test',
    'spec-version': '0.1.0',
    version: '1.0.0',
    on_violation: { default: 'block' },
    ...overrides,
  });
}

describe('enforce()', () => {
  it('passes through clean output', async () => {
    const contract = makeContract();
    const agent = enforce(contract, async (input) => `Response to: ${input}`, { audit: false });
    const result = await agent('hello');
    expect(result).toBe('Response to: hello');
  });

  it('throws ContractViolation on blocking assertion', async () => {
    const contract = makeContract({
      assert: [{ name: 'no_secret', type: 'pattern', must_not_match: 'SECRET' }],
      on_violation: { default: 'block' },
    });
    const agent = enforce(contract, async () => 'The SECRET is out.', { audit: false });
    await expect(agent('hi')).rejects.toThrow(ContractViolation);
  });

  it('does not throw on warn-only violation', async () => {
    const contract = makeContract({
      assert: [{ name: 'no_secret', type: 'pattern', must_not_match: 'SECRET' }],
      on_violation: { default: 'warn' },
    });
    const agent = enforce(contract, async () => 'The SECRET is out.', { audit: false });
    const result = await agent('hi');
    expect(result).toBe('The SECRET is out.');
  });

  it('throws ContractPreconditionError on empty input', async () => {
    const contract = makeContract({
      requires: ['input is non-empty'],
      on_violation: { default: 'block' },
    });
    const agent = enforce(contract, async (input) => input, { audit: false });
    await expect(agent('')).rejects.toThrow(ContractPreconditionError);
  });

  it('works with sync-style agents', async () => {
    const contract = makeContract();
    const agent = enforce(contract, (input) => `sync: ${input}` as unknown as Promise<string>, { audit: false });
    const result = await agent('test');
    expect(result).toBe('sync: test');
  });
});
