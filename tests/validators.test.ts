import { describe, it, expect } from 'vitest';
import { makeContext } from '../src/validators/base.js';
import { PatternValidator } from '../src/validators/pattern.js';
import { CostValidator } from '../src/validators/cost.js';
import { LatencyValidator } from '../src/validators/latency.js';

const ctx = (output = 'hello world', durationMs = 100, costUsd = 0.01) =>
  makeContext({ input: 'test', output, durationMs, costUsd });

describe('PatternValidator', () => {
  it('passes when forbidden pattern is absent', () => {
    const v = new PatternValidator('test', '\\d{4}-\\d{4}');
    expect(v.validate(ctx('no card here')).passed).toBe(true);
  });

  it('fails when forbidden pattern is present', () => {
    const v = new PatternValidator('test', '\\d{4}-\\d{4}');
    const result = v.validate(ctx('card: 1234-5678'));
    expect(result.passed).toBe(false);
    expect(result.details).toContain('1234-5678');
  });

  it('passes when required pattern is present', () => {
    const v = new PatternValidator('test', undefined, 'ticket_id');
    expect(v.validate(ctx('ticket_id: T-001')).passed).toBe(true);
  });

  it('fails when required pattern is absent', () => {
    const v = new PatternValidator('test', undefined, 'ticket_id');
    expect(v.validate(ctx('no ticket here')).passed).toBe(false);
  });
});

describe('CostValidator', () => {
  it('passes under limit', () => {
    expect(new CostValidator('c', 0.05).validate(ctx('x', 0, 0.03)).passed).toBe(true);
  });

  it('fails over limit', () => {
    const r = new CostValidator('c', 0.05).validate(ctx('x', 0, 0.10));
    expect(r.passed).toBe(false);
    expect(r.details).toContain('0.1000');
  });

  it('passes at exact limit', () => {
    expect(new CostValidator('c', 0.05).validate(ctx('x', 0, 0.05)).passed).toBe(true);
  });
});

describe('LatencyValidator', () => {
  it('passes under limit', () => {
    expect(new LatencyValidator('l', 1000).validate(ctx('x', 500)).passed).toBe(true);
  });

  it('fails over limit', () => {
    const r = new LatencyValidator('l', 1000).validate(ctx('x', 1500));
    expect(r.passed).toBe(false);
    expect(r.details).toContain('1500');
  });

  it('passes at exact limit', () => {
    expect(new LatencyValidator('l', 1000).validate(ctx('x', 1000)).passed).toBe(true);
  });
});
