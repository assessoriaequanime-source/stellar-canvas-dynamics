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
