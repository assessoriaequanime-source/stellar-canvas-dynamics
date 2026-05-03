# WEEK 2 KICKOFF: EXPRESS API CORE

**Phase 4 Backend Architecture**  
**Week**: 2 of 8  
**Status**: READY TO BEGIN  
**Date**: 2026-04-23 (Scheduled for next session)

---

## 🚀 WEEK 2 OBJECTIVE

Create Express.js + TypeScript API foundation with:
- Prisma ORM + PostgreSQL schema
- JWT + Web3 authentication
- 8 core data models
- CRUD controllers for each model
- Error handling + logging

---

## 📋 WEEK 2 TASKS (Ordered by Priority)

### Task 1: Express.js Bootstrap
**Estimated**: 2-3 hours  
**Files to Create**:
- `src/server.ts` — Express entry point
- `src/config/app.ts` — App factory
- `src/config/express-setup.ts` — Middleware + routes
- `src/api/routes/index.ts` — Route aggregation

**Key Decisions**:
- ✅ TypeScript strict mode
- ✅ Morgan logging
- ✅ CORS enabled (localhost:5173 + 3000)
- ✅ Error handling middleware
- ✅ Health check endpoint (`/health`)

### Task 2: Prisma ORM Setup
**Estimated**: 2-3 hours  
**Files to Create**:
- `prisma/schema.prisma` — Data models
- `prisma/migrations/` — Migration files
- `src/lib/prisma.ts` — Prisma client singleton

**Models to Define** (8 total):
```
1. User
   ├─ id (UUID)
   ├─ walletAddress (unique)
   ├─ nickname
   ├─ email
   ├─ createdAt, updatedAt
   └─ Relations: Avatar, Session, Consent, Transaction

2. Avatar
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ name
   ├─ contractAddress
   ├─ traits
   ├─ metadata
   └─ createdAt, updatedAt

3. Session
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ refreshToken
   ├─ expiresAt
   ├─ ipAddress
   └─ createdAt

4. ConsentRegistry
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ type (enum: AVATAR_USAGE, DATA_STORAGE, etc.)
   ├─ status (GRANTED, REVOKED)
   ├─ expiresAt
   └─ createdAt, updatedAt

5. Transaction
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ type (MINT, BURN, TRANSFER)
   ├─ amount (decimal)
   ├─ txHash
   ├─ status (PENDING, CONFIRMED, FAILED)
   └─ createdAt

6. TimeCapsule
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ name
   ├─ content (encrypted)
   ├─ unlockDate
   ├─ metadata
   └─ createdAt, updatedAt

7. DigitalLegacy
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ name
   ├─ beneficiaries (JSON)
   ├─ assets (JSON)
   ├─ contractAddress
   └─ createdAt, updatedAt

8. AuditLog
   ├─ id (UUID)
   ├─ userId (FK)
   ├─ action (enum)
   ├─ resource (string)
   ├─ details (JSON)
   ├─ timestamp
```

### Task 3: Authentication System
**Estimated**: 3-4 hours  
**Files to Create**:
- `src/api/middlewares/auth.ts` — JWT middleware
- `src/services/auth.ts` — Auth service
- `src/lib/crypto.ts` — Web3 signature verification
- `src/api/routes/auth.ts` — Auth endpoints

**Endpoints**:
```
POST /api/v1/auth/challenge
  ├─ Input: walletAddress
  └─ Output: { challenge, expiresIn }

POST /api/v1/auth/verify
  ├─ Input: walletAddress, signature
  └─ Output: { accessToken, refreshToken, user }

POST /api/v1/auth/refresh
  ├─ Input: refreshToken
  └─ Output: { accessToken }

POST /api/v1/auth/logout
  ├─ Input: accessToken
  └─ Output: { success: true }
```

### Task 4: CRUD Controllers
**Estimated**: 4-5 hours  
**Controllers to Create**:
- `src/api/controllers/user.ts` — User CRUD
- `src/api/controllers/avatar.ts` — Avatar CRUD
- `src/api/controllers/capsule.ts` — TimeCapsule CRUD
- `src/api/controllers/legacy.ts` — DigitalLegacy CRUD
- `src/api/controllers/consent.ts` — Consent management
- `src/api/controllers/transaction.ts` — Transaction history

**Standard Routes** (for each resource):
```
GET /api/v1/{resource}
GET /api/v1/{resource}/:id
POST /api/v1/{resource}
PUT /api/v1/{resource}/:id
DELETE /api/v1/{resource}/:id
```

### Task 5: Error Handling + Logging
**Estimated**: 2-3 hours  
**Files to Create**:
- `src/lib/logger.ts` — Winston logger
- `src/api/middlewares/errorHandler.ts` — Global error handler
- `src/lib/errors.ts` — Custom error classes
- `src/lib/response.ts` — Standard response format

**Error Classes**:
```
- UnauthorizedError (401)
- ForbiddenError (403)
- NotFoundError (404)
- ValidateError (400)
- ConflictError (409)
- ServerError (500)
```

---

## 🎯 PRE-WEEK 2 VERIFICATION

Before starting Week 2, run:

```bash
cd /workspaces/stellar-canvas-dynamics/stellar-backend

# 1. Verify containers still running
docker-compose ps
# Should show: stellar-postgres (healthy), stellar-redis (healthy)

# 2. Run setup script
bash scripts/setup.sh
# Should: install deps, validate env, start containers

# 3. Verify npm packages installed
npm list | head -20
# Should show: express, prisma, typescript, etc.

# 4. Check TypeScript compilation
npm run build
# Should complete without errors

# 5. Start dev server (will be available after API bootstrap)
npm run dev
# Expected: Server running on port 9200
```

---

## 📦 WEEK 2 DEPENDENCIES (To Install)

**Already included** in package.json:
- ✅ express
- ✅ typescript
- ✅ prisma
- ✅ @prisma/client
- ✅ ethers
- ✅ jsonwebtoken
- ✅ validator
- ✅ winston
- ✅ cors
- ✅ helmet
- ✅ rate-limit

**May need**:
- [ ] passport (for Web3 auth, optional)
- [ ] class-validator (for DTO validation)
- [ ] class-transformer (for DTO serialization)

---

## 🔄 WEEK 2 DAILY SCHEDULE (Suggested)

```
Monday: Express Bootstrap
├─ src/server.ts (entry point)
├─ src/config/app.ts (app factory)
├─ src/config/express-setup.ts (middleware)
└─ Test: npm run dev → Server starts on 9200

Tuesday: Prisma ORM
├─ prisma/schema.prisma (all 8 models)
├─ Initial migration
├─ Prisma client singleton
└─ Test: npx prisma studio → Verify schema

Wednesday: Authentication
├─ JWT middleware
├─ Web3 signature verification
├─ Auth service + routes
└─ Test: Auth endpoints with curl/Postman

Thursday: CRUD Controllers
├─ User controller
├─ Avatar controller
├─ Capsule controller
├─ Legacy controller
└─ Test: CRUD operations on PostgreSQL

Friday: Error Handling + Docs
├─ Winston logger setup
├─ Global error middleware
├─ API documentation
└─ Test: Error scenarios, response format
```

---

## 🧪 TESTING STRATEGY (WEEK 2)

### Manual Testing
```bash
# Test health endpoint
curl http://localhost:9200/health

# Test auth challenge
curl -X POST http://localhost:9200/api/v1/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x..."}'

# Test JWT endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9200/api/v1/user/profile
```

### Automated Testing (Week 3)
- Jest unit tests for each service
- Supertest integration tests for routes
- 80% code coverage target

---

## 📊 SUCCESS CRITERIA (WEEK 2)

- [x] Express server starts on port 9200
- [x] All 8 Prisma models defined
- [x] PostgreSQL schema created (migrations)
- [x] JWT authentication working
- [x] Web3 signature verification working
- [x] CRUD endpoints responding
- [x] Error handling middleware active
- [x] Logging to file + console
- [x] CORS enabled for localhost:5173
- [x] Rate limiting working

---

## 📝 DOCUMENTATION (Week 2)

Create/update:
- [ ] API_ENDPOINTS.md (all 25+ endpoints)
- [ ] AUTHENTICATION.md (JWT + Web3 flow)
- [ ] DATABASE_SCHEMA.md (Prisma schema)
- [ ] ERROR_HANDLING.md (error codes + messages)
- [ ] DEVELOPMENT.md (local setup guide)

---

## 🚨 RISK MITIGATION (WEEK 2)

**Risk**: Database schema too complex
**Mitigation**: Start with User + Avatar, add others iteratively

**Risk**: JWT complexity with Web3
**Mitigation**: Use ethers.js built-in signature verification

**Risk**: CORS/authentication errors
**Mitigation**: Test manual cURL requests before integration

**Risk**: Performance issues
**Mitigation**: Enable Redis caching (Week 3), monitor response times

---

## ✅ CHECKLIST FOR WEEK 2 START

Before beginning Week 2:
- [ ] Verify Docker containers running
- [ ] npm install completed
- [ ] .env file validated
- [ ] TypeScript compiler working
- [ ] This document reviewed by CEO
- [ ] Approval to proceed: ✅ (pending)

---

## 🎯 CHECKPOINT: Week 2 END

**Definition of Done** (Friday EOD):
```
Deliverables:
✅ Express server running (port 9200)
✅ Prisma schema with 8 models
✅ PostgreSQL migrations completed
✅ JWT authentication implemented
✅ CRUD controllers for 4+ models
✅ Error handling + logging
✅ API documented (endpoints + schema)
✅ No breaking changes to frontend

Code Quality:
✅ TypeScript strict mode
✅ No ESLint errors
✅ Manual testing passed
✅ Zero security vulnerabilities
```

---

**Status**: READY FOR WEEK 2 ✅  
**Approval Required**: CEO Rodrigo Alves  
**Expected Completion**: Friday next week  
**Next Phase**: Week 3 (Testing + Blockchain Integration)
