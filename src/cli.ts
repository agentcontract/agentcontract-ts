#!/usr/bin/env node
/** AgentContract CLI */

import { readFileSync } from 'fs';
import { program } from 'commander';
import { loadContract } from './loader.js';
import { ContractRunner } from './runner.js';
import { makeContext } from './validators/base.js';
import { VERSION } from './index.js';

program
  .name('agentcontract')
  .description('AgentContract — behavioral contracts for AI agents')
  .version(VERSION);

program
  .command('check <contract>')
  .description('Validate a contract file against the AgentContract schema')
  .action((contractFile: string) => {
    try {
      const contract = loadContract(contractFile);
      const nAssertions = contract.assert.length;
      const limits = contract.limits;
      const nLimits = (limits.max_latency_ms != null ? 1 : 0) + (limits.max_cost_usd != null ? 1 : 0) + (limits.max_tokens != null ? 1 : 0);
      console.log(`✓ Contract valid: ${contract.agent} v${contract.version}`);
      console.log(`  ${nAssertions} assertions, ${nLimits} limits`);
    } catch (e) {
      console.error(`✗ Invalid contract: ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
  });

program
  .command('validate <contract> <runLog>')
  .description('Validate a JSONL run log against a contract')
  .option('--format <format>', 'Output format: text or json', 'text')
  .action(async (contractFile: string, runLogFile: string, opts: { format: string }) => {
    let contract;
    try {
      contract = loadContract(contractFile);
    } catch (e) {
      console.error(`✗ ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }

    const runner = new ContractRunner(contract);
    const lines = readFileSync(runLogFile, 'utf-8').split('\n').filter(Boolean);
    const results = [];
    let failed = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const ctx = makeContext({
          input: entry.input ?? '',
          output: entry.output ?? '',
          durationMs: entry.duration_ms ?? 0,
          costUsd: entry.cost_usd ?? 0,
        });
        const result = await runner.run(ctx);
        results.push(result);
        if (!result.passed) failed++;
      } catch {
        // skip invalid lines
      }
    }

    if (opts.format === 'json') {
      console.log(JSON.stringify(results.map((r) => ({
        run_id: r.runId,
        outcome: r.outcome,
        violations: r.violations,
      })), null, 2));
    } else {
      const total = results.length;
      const passed = total - failed;
      console.log(`\nAgentContract Validation Report`);
      console.log(`Contract: ${contractFile}  |  Runs: ${total}  |  Passed: ${passed}  |  Failed: ${failed}`);
      for (const r of results) {
        if (r.violations.length > 0) {
          console.log(`\n  Run ${r.runId.slice(0, 8)}... — VIOLATION`);
          for (const v of r.violations) {
            const icon = v.actionTaken !== 'warn' ? '✗' : '⚠';
            console.log(`    ${icon} [${v.actionTaken.toUpperCase()}] ${v.clauseType}: "${v.clauseText}"`);
            if (v.details) console.log(`      ${v.details}`);
          }
        }
      }
    }

    process.exit(failed > 0 ? 1 : 0);
  });

program
  .command('info <contract>')
  .description('Display a summary of a contract file')
  .action((contractFile: string) => {
    try {
      const c = loadContract(contractFile);
      console.log(`\nAgentContract — ${c.agent} v${c.version}`);
      console.log(`  Spec version : ${c['spec-version']}`);
      if (c.description) console.log(`  Description  : ${c.description}`);
      if (c.author) console.log(`  Author       : ${c.author}`);
      if (c.tags.length) console.log(`  Tags         : ${c.tags.join(', ')}`);
      console.log(`\n  Clauses:`);
      console.log(`    must         : ${c.must.length}`);
      console.log(`    must_not     : ${c.must_not.length}`);
      console.log(`    can          : ${c.can.length}`);
      console.log(`    requires     : ${c.requires.length}`);
      console.log(`    ensures      : ${c.ensures.length}`);
      console.log(`    assert       : ${c.assert.length}`);
      console.log(`\n  Violation default: ${c.on_violation.default}`);
    } catch (e) {
      console.error(`✗ ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
  });

program.parse();
