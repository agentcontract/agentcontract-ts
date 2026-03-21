/** Audit trail — tamper-evident JSONL entries for every run. */

import { createHash, createHmac } from 'crypto';
import { appendFileSync } from 'fs';
import type { RunResult } from './runner.js';

export class AuditWriter {
  constructor(private logPath = 'agentcontract-audit.jsonl') {}

  write(result: RunResult, contractPath = ''): Record<string, unknown> {
    const entry = this._buildEntry(result, contractPath);
    appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf-8');
    return entry;
  }

  private _buildEntry(result: RunResult, contractPath: string): Record<string, unknown> {
    const ctx = result.context;
    const inputHash = createHash('sha256').update(ctx.input).digest('hex');
    const outputHash = createHash('sha256').update(ctx.output).digest('hex');

    const entry: Record<string, unknown> = {
      run_id: result.runId,
      agent: result.agent,
      contract: contractPath,
      contract_version: result.contractVersion,
      timestamp: new Date().toISOString(),
      input_hash: inputHash,
      output_hash: outputHash,
      duration_ms: Math.round(ctx.durationMs * 100) / 100,
      cost_usd: Math.round(ctx.costUsd * 1_000_000) / 1_000_000,
      violations: result.violations.map((v) => ({
        clause_type: v.clauseType,
        clause_name: v.clauseName,
        clause_text: v.clauseText,
        severity: v.severity,
        action_taken: v.actionTaken,
        judge: v.judge,
        details: v.details,
      })),
      outcome: result.outcome,
    };

    const auditKey = process.env['AGENTCONTRACT_AUDIT_KEY'];
    if (auditKey) {
      const payload = JSON.stringify(entry, Object.keys(entry).sort());
      entry['signature'] = createHmac('sha256', auditKey).update(payload).digest('hex');
    }

    return entry;
  }
}
