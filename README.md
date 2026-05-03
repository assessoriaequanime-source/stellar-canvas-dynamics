# SingulAI — Executable Digital Legacy on Solana

> **Not storage. Verified execution.**

SingulAI transforms professional expertise into an on-chain executable asset. While AI displaces professional roles, SingulAI allows professionals to preserve their methods, decision frameworks, and legacy choices as verifiable programs on Solana — ones that execute with proof, not just store data.

---

## Solana Frontier Hackathon — Project Summary

| Field | Value |
|---|---|
| **Track** | Open Track |
| **Network** | Solana Devnet |
| **Language** | TypeScript (frontend + orchestration logic) |
| **Core Concept** | AvatarPro: professional expertise as an executable on-chain identity |
| **Key Innovation** | Particle Absorption Score (PAS) — adaptive maturity model for autonomous execution |

---

## The Problem

Professionals displaced by AI lose more than their jobs — they lose the accumulated value of their expertise. AI platforms don't compensate them for the methods and decisions they trained on.

SingulAI inverts this: your methods become an on-chain program with a traceable record of every execution, trigger, and proof of delivery.

---

## How It Works

### 5 Core Modules

1. **AvatarPro Core** — Creates a verifiable on-chain identity for a professional's expertise domain
2. **TimeCapsule Engine** — Schedules and executes future deliveries with cryptographic proof
3. **SGL Execution Layer** — Manages execution reserves and permission accounts tied to the avatar
4. **Audit & Trust** — Records every execution event as a proof anchored to a Solana slot
5. **Particle Absorption Model** — Tracks how a professional's avatar adapts, learns, and earns autonomy over time

### Solana Program Architecture

| Program | Role |
|---|---|
| `Avatar Identity Program` | Stores expertise profile and maturity state |
| `TimeCapsule Program` | Manages creation, arming, and delivery of capsules |
| `Legacy Vault Program` | Execution reserves and multi-party release logic |
| `Avatar Permission Account` | Scoped authority per domain and context |

### Avatar Maturity States

```
Draft → Assisted → Trusted
```

Promotion is governed by the **Governance Engine** using the domain policy thresholds and the Particle Absorption Score.

---

## Particle Absorption Score (PAS)

The PAS is a normalized score `[0.0, 1.0]` calculated per avatar per evaluation cycle:

```
PAS = (interactionFactor × 0.25)
    + (assertivenessFactor × 0.45)
    + (executionFactor: +0.20 correct / -0.15 incorrect)
    + (escalationPenalty: +0.05 few / -0.10 many)
```

| State Transition | PAS Threshold |
|---|---|
| Draft → Assisted | ≥ 0.75 |
| Assisted → Trusted | ≥ 0.80 (+ low escalation rate) |
| Any → Demotion | < 0.45 (domain-specific) |

---

## Demo Flow

The `runMvpFlow()` function orchestrates the complete 5-step demo:

```typescript
import { runMvpFlow } from "./src/lib/hackathon";

const result = await runMvpFlow();
// Returns: MvpFlowResult with avatarId, capsuleId, proofEvents[], absorptionState
```

### What it demonstrates:
1. `createAvatarIdentity` — avatar identity anchored to slot
2. `createTimeCapsule` — capsule created with 5-year trigger window
3. `simulateTrigger` — trigger condition marked on-chain
4. `recordDelivery` — delivery confirmed with proof signature
5. `updateParticleAbsorption` — PAS updated and maturity decision evaluated

Each step produces a `ProofEvent` with a unique signature and Solana slot reference.

---

## Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

### Run Tests

```bash
npx vitest run src/lib/hackathon/__tests__/mvp.test.ts
```

Expected output: **16/16 tests passing**

### Build

```bash
npm run build
```

---

## Project Structure

```
src/lib/hackathon/
├── types.ts              # Core TypeScript interfaces
├── governance-types.ts   # Governance and assertiveness cycle types
├── governance-engine.ts  # Maturity evaluation and domain policy engine
├── mvp-orchestrator.ts   # Full MVP flow orchestrator with PAS
├── index.ts              # Public API exports
└── __tests__/
    └── mvp.test.ts       # 16 acceptance tests (MVP, TimeCapsule, PAS, Governance)

docs/
├── fase-1-mapeamento-funcional-solana.md  # EVM → Solana functional mapping
├── blueprint-sistemico-aprovacao-singulai.md
└── plano-operacional-7-dias-hackathon.md
```

---

## Proof Events

Every execution step records a `ProofEvent`:

| Event Type | Meaning |
|---|---|
| `SnapshotAnchored` | Avatar identity committed to a Solana slot |
| `CapsuleCreated` | TimeCapsule registered with trigger conditions |
| `TriggerSimulated` | Trigger condition verified and recorded |
| `DeliveryRecorded` | Delivery completed with signature proof |
| `ParticleAbsorptionUpdated` | PAS recalculated and maturity state updated |

---

## Governance Policies

Three canonical domain policies are pre-configured:

| Domain | Promotion Threshold | Demotion Threshold | Max Escalation Rate |
|---|---|---|---|
| `professional-method` | 0.75 | 0.45 | 0.20 |
| `time-capsule-delivery` | 0.80 | 0.50 | 0.15 |
| `legacy-execution` | 0.85 | 0.55 | 0.10 |

---

## What Makes This Solana-Native

- **Slot-based anchoring** — Every proof event is tied to a Solana slot counter
- **Signature simulation** — Each event carries a UUID-based signature matching Solana's tx signature format
- **Account model** — Permission accounts follow Solana's PDA ownership model
- **Program IDs** — Defined in the Devnet mapping (`fase-1-mapeamento-funcional-solana.md`)
- **No EVM dependencies** — Architecture explicitly migrated from ethers.js contracts to Solana program accounts

---

## CEO / Project Lead

**Rodrigo Alves** — [rodrigo.run](https://rodrigo.run)

---

## Footer

DEV - [rodrigo.run](https://rodrigo.run) © 2026 SingulAI - Todos os direitos reservados
