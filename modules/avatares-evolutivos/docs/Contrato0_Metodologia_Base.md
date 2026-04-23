# Contrato 0 - Metodologia Base de Seguranca dos Avatares

Status: implementacao inicial iniciada.

## Objetivo

Garantir uma base normativa global, deterministica e auditavel para todos os avatares, com regras irrenunciaveis de:
- seguranca
- etica
- emergencia
- privacidade

## Artefatos implementados

1. `AvatarContractZero.sol`
- ancora hash da politica ativa (`activePolicyHash`)
- ancora hash da versao (`activeVersionHash`)
- mantem hard guardrails por categoria proibida

2. `AvatarPro.sol`
- adiciona planos de usabilidade: `Essential`, `Professional`, `CuratorDigital`
- adiciona aceite explicito dos termos por usuario com `termsHash`
- adiciona exigencia de plano por avatar (`requiredPlanByAvatar`)
- adiciona toggle de enforcement para rollout seguro (`enforcePlanAcceptance`)
- adiciona ancoragem de hash de Contrato 0 (`contractZeroHash`, `contractZeroVersionHash`)

## Modelo de responsabilidade

- Usuario: escolhe plano e assume finalidade de uso conforme termos.
- Plataforma: mantem bloqueios obrigatorios de seguranca e compliance.

## Proxima etapa

1. Integrar `AvatarPro` com `AvatarContractZero` para validar versao de politica ativa em `requestSession`.
2. Adicionar testes Hardhat para:
- aceite de plano
- bloqueio por plano insuficiente
- ancoragem de Contrato 0
3. Conectar mapeamento de categorias proibidas no pipeline de moderacao off-chain.
