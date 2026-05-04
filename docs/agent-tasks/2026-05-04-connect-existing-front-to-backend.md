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

- PR URL: <https://github.com/assessoriaequanime-source/stellar-canvas-dynamics/pull/6>
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
 - Código de autenticação do backend mantém coleta de `req.ip` e `user-agent` para sessão (`/api/v1/auth/verify`), pré-existente ao PR #6.
- Próximos passos recomendados:
 - Substituir stubs por integração real com contratos Sepolia e trilha de prova completa.
 - Revisar se metadados de sessão (`ipAddress`/`userAgent`) permanecem necessários por compliance.

## Auth Domain Fix

- Scope: corrigir gate de autenticação e CTAs de domínio oficial sem alterar layout funcional do dashboard.
- Ajustes aplicados:
 - `src/routes/__root.tsx`
  - Gate em modo login alterado para texto oficial em inglês:
   - Título: "Official authentication required"
   - Corpo: "Production access must use the official SingulAI Live login."
  - Botão alterado para "Continue with Google".
  - Destino de login oficial alterado para `/api/v1/auth/google`.
  - Adicionada linha discreta "Product: singulai.live".
  - Lógica dev/preview ajustada para liberar teste quando houver `import.meta.env.DEV`, `VITE_SIMPLE_TEST_AUTH` (`1`/`true`) ou `VITE_DEV_SIMPLE_TEST_AUTH` (`1`/`true`), incluindo hosts `localhost`, `127.0.0.1`, `*.github.dev` e `*.app.github.dev`.
 - `src/components/SingulAIDashboard.tsx`
  - Meta rail "Oficial" atualizado de `singulai.site` para `singulai.live`.
  - Detecção de mock/dev alinhada para `VITE_SIMPLE_TEST_AUTH` e `VITE_DEV_SIMPLE_TEST_AUTH` (`1`/`true`) + hosts de preview/local + `import.meta.env.DEV`.
 - `src/components/SingulAIIntroExperience.tsx`
  - Rodapé ritual atualizado de `SINGULAI.SITE` para `SINGULAI.LIVE`.
- Validações executadas:
 - Busca de domínio antigo no frontend: `grep -Rni "https://singulai.site\|Entrar via singulai.site\|singulai.site" src ...` sem ocorrências.
 - Build frontend: `npm run build` OK.
 - Rotas no preview (`http://127.0.0.1:4174`):
  - `/demo` = 200
  - `/dashboard` = 200
  - `/vault` = 200
  - `/audit` = 200
 - Confirmação de footer: `INPI 942284933` permanece no dashboard (`src/components/SingulAIDashboard.tsx`).

## Functional Preview Fix

- Problem:
 - HTTP 200 alone was not enough to prove the dashboard was functional for hackathon review.
 - Preview needed explicit demo behavior, English-first main labels, and visible response for rail actions.
- Explicit demo mode flags:
 - Added shared utility `src/lib/avatarpro/demoMode.ts` with `isExplicitAvatarProDemoMode()`.
 - Demo mode enabled only by explicit flags:
  - `VITE_ENABLE_MOCK_VAULT=true|1`
  - `VITE_DEV_SIMPLE_TEST_AUTH=true|1`
  - `VITE_SIMPLE_TEST_AUTH=true|1`
- Functional demo API clients:
 - Updated clients in `src/lib/avatarpro/*` to return deterministic demo payloads only in explicit demo mode:
  - profile/user/wallet/avatar status
  - PAS/Omega/absorption metrics
  - capsules/legacy/history demo lists
  - absorption feedback with directional delta and new score
  - SGL debit response with previous/new balance and demo tx signature
 - Outside demo mode, backend errors remain explicit (`Backend unavailable`) with no silent success.
- Dashboard interaction improvements (`src/components/SingulAIDashboard.tsx`):
 - Added visible status feedback message (`statusMessage`) in top action chip.
 - Rail actions now update visible panel state:
  - Absorption: state + particle whitening + percentage
  - Indexes: PAS, Omega, interaction, particles
  - Capsules/Legacy/History: preview rows with demo content
 - Gesture feedback now shows explicit user-facing messages:
  - `Positive absorption feedback registered`
  - `Corrective absorption feedback registered`
 - Backend unavailable message remains visible when demo mode is disabled.
- English-first main text:
 - Converted principal visible dashboard labels/actions/placeholders/settings to English-first (without replacing particle UI structure).
 - Root loading text and metadata description updated to English-first.
- Smoke content check:
 - Added `scripts/smoke-preview-content-check.sh` (executable).
 - Script verifies:
  - forbidden domain/auth strings are absent
  - INPI footer marker exists
  - dashboard capability markers exist (`Absorption|Safe Quantum|AvatarPro`, `Wallet|Profile|AvatarPro`)
 - Handles SSR/hydration by checking HTML plus loaded dashboard JS assets.
- Domain compliance:
 - No `singulai.site` references in `src` for product/login CTA paths.
- Footer:
 - `INPI 942284933` preserved in dashboard footer.

### Validation Run (2026-05-04)

- Build with explicit preview/demo flags:
 - `VITE_DEV_SIMPLE_TEST_AUTH=true VITE_SIMPLE_TEST_AUTH=true VITE_ENABLE_MOCK_VAULT=true npm run build` -> OK.
- Preview with explicit preview/demo flags:
 - `VITE_DEV_SIMPLE_TEST_AUTH=true VITE_SIMPLE_TEST_AUTH=true VITE_ENABLE_MOCK_VAULT=true npm run preview -- --host 0.0.0.0 --port 4174` -> running.
- Route checks:
 - `demo=200`
 - `dashboard=200`
 - `vault=200`
 - `audit=200`
- Content smoke test:
 - `./scripts/smoke-preview-content-check.sh` -> passed.
- Main language checks:
 - Principal dashboard/auth labels validated in English-first (`Absorption`, `Indexes`, `Capsules`, `Legacy`, `History`, `Wallet`, `Profile`, `Talk to the avatar`).
- Manual check action:
 - Opened `http://127.0.0.1:4174/dashboard` for mandatory visual validation flow.
