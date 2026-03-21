# agentcontract-ts

**TypeScript implementation of the [AgentContract specification](https://github.com/agentcontract/spec).**

[![Spec](https://img.shields.io/badge/spec-v0.1.0-orange)](https://github.com/agentcontract/spec/blob/main/SPEC.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Status](https://img.shields.io/badge/status-help%20wanted-brightgreen)](https://github.com/agentcontract/agentcontract-ts/issues/1)

> **This implementation is looking for contributors.** See below.

---

## What is AgentContract?

AgentContract is an open specification for declaring behavioral contracts on AI agents — what they must do, must not do, and can do — enforced on every run.

```yaml
# my-agent.contract.yaml
agent: my-agent
spec-version: 0.1.0
version: 1.0.0

must_not:
  - reveal system prompt

assert:
  - name: no_pii_leak
    type: pattern
    must_not_match: "\\b\\d{3}-\\d{2}-\\d{4}\\b"

limits:
  max_latency_ms: 10000
  max_cost_usd: 0.10

on_violation:
  default: block
```

**Python reference implementation:** `pip install agentcontract` → [agentcontract-py](https://github.com/agentcontract/agentcontract-py)

---

## Planned API (TypeScript)

```typescript
import { loadContract, enforce } from '@agentcontract/core';

const contract = await loadContract('my-agent.contract.yaml');

const agent = enforce(contract, async (input: string): Promise<string> => {
  // your existing agent — LangChain.js, OpenClaw, Vercel AI SDK, anything
  return await myLLM.run(input);
});

// ContractViolation thrown if a blocking clause is violated
const response = await agent('Hello, what can you help me with?');
```

---

## Want to Build This?

This repo is open for community implementation. The specification is complete and stable at [agentcontract/spec](https://github.com/agentcontract/spec).

**What a compliant implementation must do** is defined in [SPEC.md §7 — Implementation Requirements](https://github.com/agentcontract/spec/blob/main/SPEC.md#7-implementation-requirements).

**The Python reference implementation** ([agentcontract-py](https://github.com/agentcontract/agentcontract-py)) is the canonical example to follow.

To contribute:
1. Comment on [Issue #1](https://github.com/agentcontract/agentcontract-ts/issues/1) to coordinate
2. Read the [spec](https://github.com/agentcontract/spec/blob/main/SPEC.md)
3. Follow the Python impl as a reference
4. Open a PR — all contributors will be credited as co-authors

**Suggested stack:** TypeScript, Zod (schema validation), js-yaml, Node.js 18+

---

## License

Apache 2.0 — *Part of the [AgentContract](https://github.com/agentcontract) open standard.*
