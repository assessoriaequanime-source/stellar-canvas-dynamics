# Phase 4 – Backend Architecture & Auditoria

**Status**: 🔍 ANÁLISE EM CURSO  
**Data Inicio**: 2026-04-23  
**CEO Approved**: ✅ Rodrigo Alves  

---

## 1️⃣ AUDITORIA AvatarPro.sol – GDPR Compliance

### ✅ Encontrado (GDPR PATTERNS)

#### A. Consentimento Explícito (GDPR Art. 4.11)
```solidity
// ✅ HAY: Verificação de consentimento antes de operação
if (consentRegistry != address(0)) {
    uint8 voiceFlag = IConsentRegistry(consentRegistry).CONSENT_VOICE();
    require(
        IConsentRegistry(consentRegistry).hasConsent(avatarId, msg.sender, voiceFlag),
        "PRO: voice consent required (LGPD)"
    );
}
```
**Status**: ✅ OK — Bloqueia uso sem consentimento

#### B. Transparência em Pagamento (GDPR Art. 13-14)
```solidity
// ✅ HAY: Preço visível antes de debitar
uint256 pricePerSession;  // ← Configurado e verificável via view
require(config.isActive, "PRO: service inactive");
require(config.pricePerSession > 0 || ..., "PRO: service not configured");
```
**Status**: ✅ OK — Usuário sabe quanto pagará

#### C. Audit Trail Imutável (GDPR Art. 5 - Accountability)
```solidity
// ✅ HAY: Hash de sessão registrado
event SessionFinalized(
    uint256 indexed sessionId,
    bytes32 sessionDataHash,
    address indexed operator
);
session.sessionDataHash = sessionDataHash;  // ← Imutável
```
**Status**: ✅ OK — Prova de que sessão ocorreu

#### D. Direito ao Esquecimento - Cleanup Hook (GDPR Art. 17)
```solidity
// ⚠️ POTENCIAL: Sem método de cleanup de sessões
// Solução: Implementar facet para purga de dados antigos (>6 meses)
```
**Status**: ⚠️ RECOMENDAÇÃO — Adicionar cleanup strategy

#### E. Limite de Processamento (GDPR Art. 5.1(e) - Storage Limitation)
```solidity
// ✅ HAY: Limite diário de sessões
require(
    _dailyCount[avatarId][msg.sender][today] < config.maxSessionsPerDay,
    "PRO: daily session limit reached"
);
```
**Status**: ✅ OK — Rate limiting implementado

#### F. Segurança em Transferência (GDPR Art. 32 - Security)
```solidity
// ✅ HAY: SafeERC20 + ReentrancyGuard
using SafeERC20 for IERC20;
contract AvatarPro is AccessControl, Pausable, ReentrancyGuard {
    
    sglToken.safeTransferFrom(msg.sender, treasury, ...);
}
```
**Status**: ✅ OK — Segurança de transferência verificada

#### G. Controle de Acesso (GDPR Art. 32 - Role-Based Access Control)
```solidity
// ✅ HAY: Roles bem definidas
bytes32 public constant SESSION_MANAGER_ROLE = keccak256("SESSION_MANAGER_ROLE");
bytes32 public constant PRICE_SETTER_ROLE    = keccak256("PRICE_SETTER_ROLE");

function requestSession(...) external whenNotPaused nonReentrant { }
function finalizeSession(...) external onlyRole(SESSION_MANAGER_ROLE) { }
```
**Status**: ✅ OK — Acesso segregado

---

### ⚠️ Recomendações (GDPR Enhancement)

| ID | Categoria | Recomendação | Criticidade | Impacto |
|----|-----------|----|-----------|---------|
| 1 | Data Retention | Implementar método `purgeOldSessions(beforeDate)` para cleanup | ALTA | Art. 5.1(e) - Storage Limitation |
| 2 | Consent Revocation | Integrar evento `ConsentRevoked` que pause sessões em tempo real | ALTA | Art. 7 - Right to withdraw consent |
| 3 | Data Portability | Adicionar método `exportSessionData(user)` para DSAR (Data Subject Access Request) | MÉDIA | Art. 15 - Right to access |
| 4 | Data Controller ID | Emitir `DataControllerIdentified` event com contato legal | MÉDIA | Art. 13-14 - Transparency |
| 5 | Off-Chain Log Verification | Publicar hash log criptografado em IPFS para auditoria | BAIXA | Art. 5 - Accountability |

---

## 2️⃣ ARQUITETURA BACKEND – Phase 4

### Estrutura Isolada (VPS)

```
/var/www/stellar-backend/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── avatar.controller.ts
│   │   │   ├── contract.controller.ts
│   │   │   ├── wallet.controller.ts
│   │   │   ├── session.controller.ts
│   │   │   ├── consent.controller.ts
│   │   │   └── legacy.controller.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── avatar.routes.ts
│   │   │   ├── contract.routes.ts
│   │   │   ├── wallet.routes.ts
│   │   │   ├── session.routes.ts
│   │   │   ├── consent.routes.ts
│   │   │   └── legacy.routes.ts
│   │   │
│   │   └── middlewares/
│   │       ├── auth.middleware.ts  (JWT + Web3 signature)
│   │       ├── consent-check.middleware.ts (GDPR guard)
│   │       ├── error-handler.middleware.ts
│   │       ├── rate-limiter.middleware.ts
│   │       └── logger.middleware.ts
│   │
│   ├── services/
│   │   ├── avatar.service.ts  (blueprint: harvest avatarService)
│   │   ├── blockchain.service.ts  (blueprint: harvest blockchainService)
│   │   ├── contract.service.ts  (blueprint: harvest contractService)
│   │   ├── wallet.service.ts  (blueprint: harvest walletService)
│   │   ├── consent.service.ts  (GDPR compliance orchestrator)
│   │   ├── session.service.ts  (payment + session management)
│   │   ├── notification.service.ts  (email, push)
│   │   └── ai-orchestrator.service.ts  (avatar coordination)
│   │
│   ├── models/
│   │   ├── User.model.ts  (username, email, wallet, roles)
│   │   ├── Avatar.model.ts  (avatarId, owner, config, metadata)
│   │   ├── Contract.model.ts  (financial, celebrity, legacy)
│   │   ├── Session.model.ts  (userId, avatarId, cost, duration, status)
│   │   ├── Consent.model.ts  (userId, avatarId, consentType, timestamp, revoked)
│   │   ├── Transaction.model.ts  (userId, amount, type, status, hash)
│   │   └── AuditLog.model.ts  (action, actor, timestamp, details)
│   │
│   ├── lib/
│   │   ├── blockchain.client.ts  (wrapper ethers.js)
│   │   ├── encryption.ts  (criptografia de dados sensíveis)
│   │   ├── validators.ts  (validação inputs)
│   │   ├── formatters.ts  (normaliza dados)
│   │   └── error-codes.ts  (GDPR-aware error messages)
│   │
│   ├── config/
│   │   ├── database.config.ts  (PostgreSQL + Prisma)
│   │   ├── redis.config.ts  (cache + sessions)
│   │   ├── blockchain.config.ts  (RPC, contratos, ABIs)
│   │   ├── jwt.config.ts  (secret, expiração)
│   │   └── app.config.ts  (port, env, logging)
│   │
│   ├── queue/
│   │   ├── session-finalizer.job.ts  (finaliza sessões expiradas)
│   │   ├── consent-checker.job.ts  (verifica revogação contínua)
│   │   ├── notification-sender.job.ts  (email, push delays)
│   │   └── blockchain-monitor.job.ts  (listening eventos on-chain)
│   │
│   └── server.ts  (Express + middleware setup)
│
├── .env.example
├── .env  (⚠️ .gitignore)
├── package.json
├── tsconfig.json
├── docker-compose.yml  (PostgreSQL + Redis)
├── .dockerignore
├── Dockerfile
├── .eslintrc.json
├── jest.config.js
├── README.md
└── docs/
    ├── API.md  (OpenAPI/Swagger)
    ├── GDPR.md  (compliance docs)
    ├── DEPLOYMENT.md  (como fazer deploy)
    └── ARCHITECTURE.md  (decisões técnicas)
```

---

## 3️⃣ INTEGRAÇÃO COM FRONTEND

### stellar-canvas-dynamics (frontend)

```
src/
├── api/
│   ├── client.ts  (axios/fetch wrapper)
│   ├── endpoints.ts  (API base URL + routes)
│   └── services/
│       ├── avatar.service.ts  (chamadas API avatar)
│       ├── contract.service.ts  (chamadas API contract)
│       ├── session.service.ts  (iniciar sessão paga)
│       ├── wallet.service.ts  (conectar wallet)
│       └── consent.service.ts  (gerenciar consentimentos GDPR)
│
├── hooks/
│   ├── useBlockchain.ts  (Phase 2 utils integrados)
│   ├── useSession.ts  (estado sessão paga)
│   ├── useConsent.ts  (estado consentimento GDPR)
│   └── useWallet.ts  (conectar wallet + saldo SGL)
│
└── components/
    ├── AvatarSessionStarter.tsx  (UI para iniciar sessão)
    ├── ConssentDialog.tsx  (GDPR consent UI)
    ├── SessionPayment.tsx  (confirmar pagamento SGL)
    └── LegacyConfigurator.tsx  (definir legado)
```

---

## 4️⃣ STACK TECNOLÓGICO

**Backend Node.js:**
- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Express.js v4 + TypeScript
- **ORM**: Prisma v5 (type-safe, migrations)
- **Database**: PostgreSQL 15 (relacional)
- **Cache**: Redis 7 (sessões + rate limiting)
- **Blockchain**: ethers.js v6 (read + call)
- **Validação**: Zod (schema validation)
- **Auth**: JWT + Web3 signature verification
- **Queue**: Bull + Redis (async jobs)
- **Logging**: Winston (structured logs)
- **Testing**: Jest + Supertest
- **API Docs**: Swagger/OpenAPI

**Deployment:**
- **Container**: Docker + docker-compose
- **Orchestration**: PM2 (processo singular na VPS)
- **Reverse Proxy**: Nginx
- **Port**: 9200 (interno, atrás de Nginx)
- **Domain**: stellar-backend.rodrigo.run (via DNS + Nginx)

---

## 5️⃣ TIMELINE ESTIMADA (Path B)

### Week 1: Setup + Briefing
- [ ] Criar repo `/var/www/stellar-backend/` na VPS
- [ ] Setup PostgreSQL + Redis containers
- [ ] Configurar Nginx reverse proxy (porta 9200 → stellar-backend.rodrigo.run:80)
- [ ] Ambiente development local

**Deliverable**: .MD com setup instructions

### Week 2-3: Core API
- [ ] Express + TypeScript setup
- [ ] Autenticação JWT + Web3
- [ ] Modelos Prisma (User, Avatar, Session, Consent)
- [ ] Controllers base (CRUD)
- [ ] Middlewares (auth, error, logging)

**Deliverable**: API v1 schema + postman collection

### Week 4: Blockchain Integration
- [ ] Integrar ethers.js
- [ ] Service readers (avatar info, session balance, consent status)
- [ ] Blockchain event listeners (Bull jobs)
- [ ] Contract interaction layer

**Deliverable**: Blockchain endpoints rodando

### Week 5-6: GDPR + Sessões
- [ ] ConsentService (verificar, registrar, revogar)
- [ ] SessionService (criar, finalizar, pagar)
- [ ] Data portability endpoints (DSAR)
- [ ] Cleanup jobs (retention policy)

**Deliverable**: Full GDPR compliance

### Week 7: Testing + Docs
- [ ] Unit tests (services)
- [ ] Integration tests (endpoints)
- [ ] API documentation (Swagger)
- [ ] Deployment runbook

**Deliverable**: 80%+ test coverage

### Week 8: Deploy + Validation
- [ ] Docker build + push
- [ ] PM2 configuration
- [ ] Nginx SSL (Let's Encrypt)
- [ ] Monitoring + alertas
- [ ] Load testing

**Deliverable**: Backend em produção

---

## 6️⃣ RECOMENDAÇÕES IMEDIATAS

### Ações antes de começar:
1. ✅ Revisar AvatarPro.sol — **GDPR OK, adicionar recommendations**
2. ✅ Clonar/reescrever serviços do harvest em TypeScript
3. ✅ Validar Prisma schema com PM (Product Manager)
4. ✅ Criar ticket de setup infra (PostgreSQL, Redis, Nginx)
5. ✅ Documentar decisões em ADR (Architecture Decision Records)

---

## PRÓXIMA AÇÃO

**Aguardando CEO confirmação:**
- [ ] Começar Week 1 (setup infraestrutura)?
- [ ] Revisar arquitetura com time technical?
- [ ] Alguma mudança na timeline/scope?

