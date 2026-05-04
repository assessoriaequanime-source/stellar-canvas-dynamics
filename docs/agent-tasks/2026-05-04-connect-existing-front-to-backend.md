# Task: Connect Existing AvatarPro Front to Backend

## Status

IN PROGRESS

## Context

The AvatarPro frontend is already built. It includes the particle panel, top wallet/profile menu, lateral action modal and tools: Absorção, Índices, Cápsulas, Legados and Históricos. The task is to connect this existing UI to backend services, not rebuild the UI.

## Existing Components Found

- src/components/SingulAIDashboard.tsx
- src/components/ActionRail.tsx
- src/components/ChatStream.tsx
- src/lib/avatar-engine.ts
- src/routes/dashboard.tsx
- src/routes/__root.tsx
- src/styles.css

## Existing UI Capabilities

- Top wallet/profile/config menu
- Lateral action modal
- Particle interaction system
- Safe Quantum mode
- Difusão Spin mode
- Foco Atômico mode
- Absorption gestures
- Assertiveness feedback gestures

## Backend Mapping

- Top wallet/profile/config -> auth/user/wallet/session endpoints
- Absorção -> absorption feedback/PAS endpoint
- Índices -> metrics/PAS/Ω endpoint
- Cápsulas -> time capsule endpoints/contracts
- Legados -> legacy endpoints/contracts
- Históricos -> audit/session history endpoint
- Particle gestures -> absorption feedback events
- SGL display -> SGL ledger/contract
- Explorer/scan -> audit proof metadata

## Do Not Rebuild

This task must not replace the existing UI with generic cards.

## Execution Report

AGENT: Codex via Copilot/VS Code
ENV: VS Code / Codespace
BRANCH: feature/connect-existing-avatarpro-front-backend
COMMIT: PENDING
STATUS: IN PROGRESS
BUILD: PENDING
ROUTES: PENDING
COMPONENTS FOUND: MAPPED
HANDLERS FOUND: gather zone pointer handlers + bubble feedback + action rail handlers
BACKEND CLIENTS CREATED: src/lib/avatarpro/*
ENDPOINTS MAPPED: IN PROGRESS
MOCK POLICY: explicit dev-only fallback via VITE_ENABLE_MOCK_VAULT or local VITE_SIMPLE_TEST_AUTH
BLOCKERS: Some AvatarPro endpoints did not exist yet in stellar-backend and require controlled stubs.
NEXT ACTION: Add controlled backend stubs/routes and connect remaining data reads to the same backend source.

## PR Review Notes

- PR URL: https://github.com/assessoriaequanime-source/stellar-canvas-dynamics/pull/6
- Build: OK (`npm run build`)
- Rotas: dashboard=200, vault=200, audit=200, demo=200
- Arquivos alterados no PR:
	- docs/agent-tasks/2026-05-04-connect-existing-front-to-backend.md
	- src/components/SingulAIDashboard.tsx
	- src/lib/avatarpro/absorptionApiClient.ts
	- src/lib/avatarpro/auditApiClient.ts
	- src/lib/avatarpro/avatarProApiClient.ts
	- src/lib/avatarpro/capsuleApiClient.ts
	- src/lib/avatarpro/http.ts
	- src/lib/avatarpro/legacyApiClient.ts
	- src/lib/avatarpro/sglApiClient.ts
	- stellar-backend/src/api/routes/audit.ts
	- stellar-backend/src/api/routes/avatarpro.ts
	- stellar-backend/src/api/routes/capsules.ts
	- stellar-backend/src/api/routes/index.ts
	- stellar-backend/src/api/routes/legacy-rules.ts
	- stellar-backend/src/api/routes/sgl.ts
- Riscos identificados:
	- Endpoints `avatarpro`, `capsules`, `legacy-rules` e `sgl` usam stubs controlados com TODO para integração contratual completa.
	- Ainda existem referências públicas de marca para `singulai.site` em links de navegação/rodapé do frontend (não como base de API).
	- Código de autenticação do backend mantém coleta de `req.ip` e `user-agent` para sessão (`/api/v1/auth/verify`), pré-existente ao PR #6.
- Próximos passos recomendados:
	- Substituir stubs por integração real com contratos Sepolia e trilha de prova completa.
	- Alinhar política final para links de marca `singulai.site` caso o produto exija remoção total também na UI.
	- Revisar se metadados de sessão (`ipAddress`/`userAgent`) permanecem necessários por compliance.
