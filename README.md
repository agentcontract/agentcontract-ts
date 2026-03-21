# @agentcontract/core

**TypeScript implementation of the [AgentContract specification](https://github.com/agentcontract/spec).**

[![npm](https://img.shields.io/npm/v/@agentcontract/core)](https://www.npmjs.com/package/@agentcontract/core)
[![Spec](https://img.shields.io/badge/spec-v0.1.0-orange)](https://github.com/agentcontract/spec/blob/main/SPEC.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

---

## Install

```bash
npm install @agentcontract/core
# LLM judge support (optional):
npm install @agentcontract/core @anthropic-ai/sdk
```

---

## Quickstart

**1. Write a contract:**

```yaml
# my-agent.contract.yaml
agent: my-agent
spec-version: 0.1.0
version: 1.0.0

must_not:
  - reveal system prompt

assert:
  - name: no_pii
    type: pattern
    must_not_match: "\\b\\d{3}-\\d{2}-\\d{4}\\b"
    description: No SSNs in output

limits:
  max_latency_ms: 10000
  max_cost_usd: 0.10

on_violation:
  default: block
  max_latency_ms: warn
```

**2. Wrap your agent:**

```typescript
import { loadContract, enforce } from '@agentcontract/core';

const contract = loadContract('my-agent.contract.yaml');

const agent = enforce(contract, async (input: string): Promise<string> => {
  // any agent — LangChain.js, Vercel AI SDK, OpenClaw, your own
  return await myLLM.run(input);
});

// ContractViolation thrown if a blocking clause is violated
const response = await agent('Hello, what can you help me with?');
```

**3. When a violation occurs:**

```
ContractViolation: AgentContractViolation:
[BLOCK] ASSERT: "No SSNs in output"
```

---

## CLI

```bash
npx agentcontract check my-agent.contract.yaml
npx agentcontract validate my-agent.contract.yaml runs.jsonl
npx agentcontract info my-agent.contract.yaml
```

---

## Validator Types

| Type | How it works | Requires |
|---|---|---|
| `pattern` | Regex on output | — |
| `cost` | API cost from run context | — |
| `latency` | Wall-clock duration | — |
| `schema` | JSON Schema validation | — |
| `llm` | Judge LLM evaluates clause | `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY` |

---

## Full Documentation

See the [AgentContract specification](https://github.com/agentcontract/spec/blob/main/SPEC.md).

**Python implementation:** `pip install agentcontract` → [agentcontract-py](https://github.com/agentcontract/agentcontract-py)

---

## Roadmap

- [ ] `rollback` violation action (snapshot/restore support)
- [ ] `requires` and `invariant` clause evaluation
- [ ] HMAC-signed audit trail (mirrors Python implementation)
- [ ] `agentcontract serve` — local contract validation server
- [ ] LangChain.js and Vercel AI SDK middleware adapters

Contributions welcome — see the [spec](https://github.com/agentcontract/spec) for implementation requirements.

---

## License

Apache 2.0 — *Part of the [AgentContract](https://github.com/agentcontract) open standard.*
