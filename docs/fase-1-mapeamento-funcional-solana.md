# Fase 1 - Mapeamento Funcional Solana-native

## Objetivo

Unificar a semântica técnica do SingulAI para Solana Devnet, substituindo linguagem e conceitos EVM na trilha de hackathon sem alterar a lógica funcional do MVP.

## Escopo desta fase

- Mapear entidades e operações EVM para equivalentes Solana.
- Definir programas e contas canônicas do MVP.
- Definir eventos mínimos para prova verificável.
- Estabelecer critérios de aceite do Gate da Fase 1.

## 1. Mapa de equivalência EVM -> Solana

| Referência atual | Referência Solana para hackathon |
|---|---|
| Sepolia Testnet | Solana Devnet |
| Etherscan | Solscan |
| Smart Contract | Solana Program |
| Contract Address | Program ID |
| Wallet Link Contract | Permission Account |
| ERC-20 Token | SPL Token Mint |
| Gas Price | Network Fee / Priority Fee |
| Hardhat | Anchor |
| Solidity | Rust (Anchor) |
| Transaction Hash | Signature |
| Block Number | Slot |

## 2. Programas funcionais do MVP

### 2.1 Avatar Identity Program

Função:

- Registrar identidade canônica do AvatarPro.
- Vincular versão ativa de snapshot do método.

Estado mínimo:

- avatar_id
- owner_wallet
- snapshot_hash_ref
- maturity_state (Draft, Assisted, Trusted)
- updated_at_slot

### 2.2 TimeCapsule Program

Função:

- Registrar e atualizar cápsulas com trigger e status de execução.

Estado mínimo:

- capsule_id
- avatar_id
- trigger_type
- trigger_at
- recipient_ref
- status (Created, Armed, Triggered, Delivered, Audited)
- proof_ref

### 2.3 Legacy Vault Program

Função:

- Reservar e registrar condições de execução econômica (camada funcional SGL).

Estado mínimo:

- vault_id
- payer_wallet
- reserve_amount
- reserve_status
- execution_policy_ref

### 2.4 Avatar Permission Account

Função:

- Definir permissões de operação e escopo de acesso do AvatarPro.

Estado mínimo:

- permission_account_id
- avatar_id
- domain_scope
- max_autonomy_level
- reviewer_required

## 3. Eventos mínimos para prova auditável

### 3.1 SnapshotAnchored

Campos:

- avatar_id
- snapshot_hash
- domain_scope
- signature
- slot

### 3.2 CapsuleCreated

Campos:

- capsule_id
- avatar_id
- trigger_type
- trigger_at
- signature
- slot

### 3.3 TriggerSimulated

Campos:

- capsule_id
- trigger_result
- evaluator_ref
- signature
- slot

### 3.4 DeliveryRecorded

Campos:

- capsule_id
- delivery_status
- delivery_ref
- signature
- slot

### 3.5 ParticleAbsorptionUpdated

Campos:

- avatar_id
- pas_previous
- pas_current
- trust_delta
- signature
- slot

## 4. Regras de dados e segurança

- Conteúdo sensível permanece off-chain e criptografado.
- On-chain armazena somente hashes, estados, permissões e provas.
- Toda referência a usuário na demo deve ser fictícia.
- Nenhuma credencial pode ser registrada em artefatos públicos.

## 5. Interfaces funcionais (MVP)

### 5.1 Comandos de domínio

- createAvatarIdentity
- anchorMethodSnapshot
- createTimeCapsule
- simulateTrigger
- recordDelivery
- updateParticleAbsorption

### 5.2 Consultas de prova

- getAvatarState
- getCapsuleTimeline
- getReserveStatus
- getAuditProofBySignature

## 6. Critérios de aceite (Gate Fase 1)

A fase é considerada concluída quando:

1. Todo termo técnico público do fluxo MVP está em semântica Solana.
2. Programas e contas funcionais do MVP estão definidos e documentados.
3. Eventos mínimos de prova estão definidos com campos claros.
4. Item 5 (Modelo de Absorção de Partículas) está conectado ao fluxo on-chain por evento dedicado.
5. Não há dependência de conceitos EVM no discurso técnico principal do hackathon.

## 7. Dependências para Fase 2

- Definição final de payloads simulados para demo.
- Fixture de dados fictícios para avatar, cápsula e entrega.
- Contratos de API interna para orquestração do fluxo.

## 8. Status

- Aprovação técnica Run: PENDENTE
- Aprovação estratégica CEO Rodrigo Alves: PENDENTE
