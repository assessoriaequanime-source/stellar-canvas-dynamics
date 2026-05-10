# SingulAI AvatarPro Vault — Roteiro Completo para Vídeo do Hackathon

**Produto:** SingulAI AvatarPro Vault  
**Evento:** Solana Frontier Hackathon 2026  
**Duração estimada:** 3 a 5 minutos  
**Idioma de narração:** Inglês (conforme regra oficial do hackathon)  
**Sequência:** Da tela de entrada até a prova verificável on-chain

---

## BLOCO 1 — ABERTURA: O PROBLEMA [0:00 – 0:30]

> **[Narrador, voz pausada e grave — fundo dark, logo SingulAI lentamente visível]**

> "Every day, professionals around the world are being replaced — not by someone better, but by AI systems trained on their own knowledge. Their methods. Their years of expertise. And they received nothing in return."

> "What if you could preserve the way you think? The way you decide? And let that expertise keep working — even when you're not there?"

> "That's SingulAI AvatarPro Vault."

---

## BLOCO 2 — ENTRADA NO SISTEMA: OBSIDIAN RITE [0:30 – 1:00]

> **[Tela: página inicial com fundo obsidian — design editorial, sem gradientes, apenas tipografia dominante]**

> "The experience begins here — at the threshold. Not a signup screen. Not a dashboard. A rite."

> "The visitor isn't onboarding. They're crossing into a system designed to carry their professional legacy."

> **[Cursor aponta para as duas inscrições mínimas: "com som" / "em silêncio"]**

> "Two paths. Both lead through. Only the manner of crossing differs."

> **[Clique em "com som" — transição suave para /demo]**

---

## BLOCO 3 — DASHBOARD: IDENTIDADE VISIBLE [1:00 – 1:40]

> **[Tela: /demo → SingulAI Dashboard com campo de partículas em Three.js + GSAP]**

> "Inside the Dashboard, the professional's identity takes form — a three-dimensional particle field. This is not decoration. Each particle represents a unit of absorbed knowledge."

> **[Câmera aproxima do campo de partículas animado]**

> "As the avatar absorbs interactions, particles move inward — from the field toward the center. That motion is the Particle Absorption Model: measurable, traceable, and verifiable."

> "On the left, the user's active avatar. On the right, real-time metrics:"

> **[Câmera destaca os dados no painel lateral]**

> - "**Interaction Score:** 0.69 — early-stage responsiveness."
> - "**Particle Score:** 0.81 — strong knowledge absorption already underway."
> - "**PAS — Particle Absorption Score:** 0.72 — composite trust metric driving maturity decisions."

> "These scores are not cosmetic. They power a governance engine that decides when an avatar deserves more autonomy."

> **[Câmera mostra o campo de chat breve com o avatar]**

> "The avatar responds. Each interaction is recorded. Each assertive response moves the score upward."

---

## BLOCO 4 — VAULT: EXECUÇÃO COM CRÉDITO SGL [1:40 – 2:20]

> **[Navegação: clique em 'AvatarPro Vault' — tela /vault]**

> "Here is the Vault — the execution layer."

> **[Tela: VaultMvpPanel com barra de navegação, carteira, saldo SGL]**

> "Every action in SingulAI has an execution cost — paid in **SGL Execution Credits**. SGL is not a financial token. It's a functional unit: you spend it to register a snapshot, create a capsule, or trigger a delivery."

> "SOL pays the Solana network fees. SGL funds the SingulAI execution layer."

> **[Câmera foca no saldo: ex. 500 SGL]**

> "The professional selects a service. Let's run **Snapshot Registration**."

> **[Clique no serviço → animação de execução → novo AuditRecord aparece na lista]**

> "In real time, the system:"
>
> - "Generates a deterministic payload hash from the avatar's professional method."
> - "Submits the hash to Solana Devnet via the Real Solana Adapter."
> - "Receives a transaction signature."
> - "Anchors the event to a Solana slot — a permanent, immutable reference."

> **[Log de execução aparece com: Signature, Slot, Explorer URL]**

> "The content never goes on-chain. Only the hash does. The professional's intellectual property stays private. The proof is public."

---

## BLOCO 5 — MVP FLOW: OS 5 PASSOS VERIFICÁVEIS [2:20 – 3:10]

> **[Split screen: código TypeScript à esquerda, terminal com output à direita — ou tela de demo]**

> "Under the hood, every demo execution runs through a fully orchestrated flow — 5 steps, each producing a verifiable ProofEvent anchored to a Solana slot."

---

### Passo 1 — createAvatarIdentity

> "**Step 1: Avatar Identity.**"
> "A new AvatarIdentity is created. It carries an owner wallet, a snapshot hash reference, and a maturity state. Initial state: **Draft**."

```text
avatarId: avt-x7f2b9a1
ownerWallet: GiZi9xDemoWalletHackathon0001
snapshotHashRef: sha256:abc123demo
maturityState: Draft
updatedAtSlot: 100001
```

> "ProofEvent emitted → **SnapshotAnchored** — Slot 100001."

---

### Passo 2 — createTimeCapsule

> "**Step 2: TimeCapsule.**"
> "A capsule is programmed with a trigger type, a future trigger date, and a recipient reference. Status: **Created → Armed**."

```text
capsuleId: cap-a2d9e7f3
avatarId: avt-x7f2b9a1
triggerType: manual
triggerAt: 2031-05-07T00:00:00Z
recipientRef: beneficiary.demo@singulai.app
status: Armed
```

> "ProofEvent emitted → **CapsuleCreated** — Slot 100002."

---

### Passo 3 — simulateTrigger

> "**Step 3: Trigger Simulation.**"
> "The trigger condition fires. The capsule moves to **Triggered** status. An on-chain event marks the moment."

```text
status: Triggered
ProofEvent: TriggerSimulated — Slot 100003
```

---

### Passo 4 — recordDelivery

> "**Step 4: Delivery.**"
> "The capsule is delivered to the recipient. A proof reference is recorded — pointing to the Solscan link."

```text
status: Delivered
proofRef: solscan://proof/cap-a2d9e7f3
ProofEvent: DeliveryRecorded — Slot 100004
Signature: sig_f3a9b201c...
```

---

### Passo 5 — updateParticleAbsorption + Governance

> "**Step 5: Particle Absorption Update.**"
> "The execution feeds back into the avatar's trust score. The Particle Absorption Score updates."

```text
assertivenessFeedback: 0.82
executionSuccess: true
escalatedToHuman: false
pasPrevious: 0.60
pasCurrent: 0.82
```

> "The Governance Engine evaluates the new PAS against the domain policy:"

```text
Domain: professional-method
promotionThreshold: 0.75
maxEscalationRate: 0.20

Decision: promoted = true
State: Draft → Assisted
Reason: PAS 0.82 meets threshold 0.75
```

> "ProofEvent emitted → **ParticleAbsorptionUpdated** — Slot 100005."

> "Five steps. Five proof events. Five Solana slots. Each one verifiable."

---

## BLOCO 6 — AUDITORIA: PROVA EM TEMPO REAL [3:10 – 3:45]

> **[Navegação: clique em 'Auditoria' → tela /audit]**

> "The Audit Panel is the final layer of trust."

> **[Tela: AuditReadOnlyPanel com lista de eventos, badges de estado, links de explorer]**

> "Every action in the system generates an audit record. The judge can enter with a read-only access password — **judge2026** — and see the full execution trail."

> **[Login com senha → painel expande]**

> - "**Wallet address** of the executing actor."
> - "**Avatar ID** involved."
> - "**Event type:** SnapshotAnchored, CapsuleCreated, DeliveryRecorded."
> - "**Transaction signature** on Solana Devnet."
> - "**Explorer URL** — clickable link to Solscan."
> - "**SGL balance** and credits consumed."

> **[Câmera clica em um link → abre Solana Explorer com a transação]**

> "This is not a simulation log. This is a real Solana Devnet transaction — trackable, public, permanent."

---

## BLOCO 7 — ARQUITETURA TÉCNICA [3:45 – 4:15]

> **[Slide ou diagrama simples de 5 camadas]**

> "SingulAI AvatarPro Vault is built on five layers:"

> **1. Application Layer** — React + TypeScript + Vite, TanStack Router, Three.js, GSAP.  
> "User-facing flows for creation, execution, tracking, and proof display."

> **2. Intelligence Layer** — AvatarPro Core.  
> "Captures professional method as a versioned snapshot. Computes assertiveness per domain. Applies escalation rules."

> **3. Execution Layer** — MVP Orchestrator + TimeCapsule Engine.  
> "Trigger engine, delivery engine, audit trail. Fully TypeScript, browser-native, zero server dependency for demo."

> **4. Trust Layer** — Solana Devnet via Real Solana Adapter.  
> "Snapshot hashes, capsule states, and proof events anchored on-chain as immutable references. All via SPL Token and Solana program reads."

> **5. Governance Layer** — Governance Engine with Domain Policies.  
> "Maturity state machine: Draft → Assisted → Trusted. Threshold-driven. Auditable. Per-domain policy."

> **[Código real visível: trecho de mvp-orchestrator.ts ou governance-engine.ts]**

---

## BLOCO 8 — TESTES: 16 DE 16 PASSANDO [4:15 – 4:35]

> **[Terminal em tela — execução de testes]**

> "All acceptance tests pass. 16 out of 16."

```bash
npx vitest run src/lib/hackathon/__tests__/mvp.test.ts
```

> "Including:"
>
> - "Full MVP flow end-to-end."
> - "TimeCapsule lifecycle: Created → Armed → Triggered → Delivered."
> - "PAS calculation and trust delta."
> - "Governance promotion and demotion decisions."
> - "Domain policy enforcement."

> **[Output verde: ✓ 16 tests passed]**

---

## BLOCO 9 — ENCERRAMENTO: A VISÃO [4:35 – 5:00]

> **[Volta para o campo de partículas — lento, silencioso]**

> "SingulAI AvatarPro Vault is not a storage product."
> "It's not a chatbot."
> "It's not an AI assistant."

> "It is **professional continuity infrastructure** — running on Solana."

> "Your methods don't disappear when you're displaced."
> "They run. They deliver proof. They endure."

> "Built on Solana Devnet."
> "Demonstrable in 2 minutes."
> "Verifiable in the explorer right now."

> **[Logo SingulAI — fade out — URL do repositório]**

> `github.com/assessoriaequanime-source/stellar-canvas-dynamics`

---

## Checklist técnico para gravação

| Item                                                      | Status |
| --------------------------------------------------------- | ------ |
| Rotas /demo, /vault, /audit acessíveis                    | ✅     |
| 16 testes passando (`vitest run`)                         | ✅     |
| SGL balance visível no Vault                              | ✅     |
| Execução de serviço gera AuditRecord com Signature e Slot | ✅     |
| Painel de auditoria acessível com senha `judge2026`       | ✅     |
| Explorer URL clicável (Solana Devnet)                     | ✅     |
| Particle field animado no Dashboard                       | ✅     |
| PAS e Omega Score visíveis                                | ✅     |
| Governance decision logada no console ou painel           | ✅     |
| Footer: DEV - rodrigo.run © 2026 SingulAI                 | ✅     |

---

_Documento gerado por Run — Chefe de Desenvolvimento SingulAI_  
_DEV - [rodrigo.run](https://rodrigo.run) © 2026 SingulAI — Todos os direitos reservados_
