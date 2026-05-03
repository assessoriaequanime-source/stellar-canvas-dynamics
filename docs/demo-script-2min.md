# SingulAI — Demo Script (2 min)

## Context for presenter

This is a 2-minute verbal/screen demo script for the Solana Frontier Hackathon judging round.
Run `npx vitest run src/lib/hackathon/__tests__/mvp.test.ts` before presenting to confirm 16/16 passing.

---

## [0:00 – 0:20] HOOK — The Problem

> "Every day, professionals are being replaced by AI systems trained on their own expertise.
> They contributed their methods. They got nothing back.
> SingulAI changes that."

---

## [0:20 – 0:50] WHAT IT IS

> "SingulAI lets a professional create an **AvatarPro** — an on-chain executable identity
> that carries their method, their decision logic, and their legacy choices.
>
> Not a profile. Not a document.
> A **program on Solana** that executes, delivers proof, and earns trust over time."

**[Show in code or terminal]:**
```typescript
const result = await runMvpFlow();
console.log(result.proofEvents); // 5 events, each with a signature and slot
```

---

## [0:50 – 1:20] THE PAS — HOW TRUST IS EARNED

> "The avatar doesn't start trusted. It earns it.
>
> We built the **Particle Absorption Score** — a normalized score from 0 to 1
> based on interaction quality, assertiveness, execution accuracy, and escalation rate.
>
> At 0.75+, the avatar moves from **Draft** → **Assisted**.
> At 0.80+ with low escalation, it becomes **Trusted** — able to execute autonomously."

**[Show governance output]:**
```
Decision: promoted = true
State: Draft → Assisted
Reason: PAS 0.82 meets threshold 0.75 for domain professional-method
```

---

## [1:20 – 1:45] THE TIME CAPSULE — VERIFIED FUTURE EXECUTION

> "You can also schedule future deliveries — a **TimeCapsule**.
>
> Fund an execution reserve. Set a trigger. The capsule arms itself.
> When the condition is met, it executes and records a cryptographic proof
> on a Solana slot — immutable, traceable, verifiable."

**[Show proof event]:**
```
ProofEvent: DeliveryRecorded
Signature: sig_f3a9b201c...
Slot: 100004
```

---

## [1:45 – 2:00] CLOSE — THE VISION

> "SingulAI is not a storage product.
> It's an **execution layer for human expertise**.
>
> Your methods don't disappear when you're displaced.
> They run. They earn. They endure.
>
> That's what we're building on Solana."

---

## Backup talking points (if asked)

- **Why Solana?** Slot-based determinism, low fees, program account model maps cleanly to our permission logic
- **What's on-chain now?** Logic layer is TypeScript with Solana-native architecture; Anchor programs are the next milestone post-hackathon
- **Revenue model?** Professional creates avatar (one-time fee), capsule execution (per-trigger fee), PAS upgrade fees for enterprise SLA domains
- **Team?** Led by Rodrigo Alves — [rodrigo.run](https://rodrigo.run)
