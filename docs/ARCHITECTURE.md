# SingulAI Platform — Architecture Documentation

## 📐 System Overview

SingulAI is a sophisticated React 19 + Vite + TanStack Start full-stack platform featuring:

- **Frontend:** React 19 with Radix UI component library
- **Backend Integration:** TanStack Start SSR with Node.js server
- **State Management:** React Query for server state synchronization
- **Routing:** TanStack Router with file-based routing
- **Styling:** Tailwind CSS 4.2 with custom design system
- **3D Graphics:** THREE.js particle engine for avatar backgrounds
- **Type Safety:** Full TypeScript strict mode

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SingulAI Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │    Frontend     │  SSR    │   TanStack      │            │
│  │    (React 19)   │◄────────┤   Start Server  │            │
│  └────────┬────────┘         └────────┬────────┘            │
│           │                           │                      │
│        Routes              API Routes  │                      │
│        Components          Services    │                      │
│        Hooks               Middleware  │                      │
│           │                           │                      │
│           └─────────────┬─────────────┘                      │
│                         │                                     │
│                    ┌────▼─────┐                              │
│                    │  Backend  │                              │
│                    │  Services │                              │
│                    │   (REST)  │                              │
│                    └────┬──────┘                              │
│                         │                                     │
│         ┌───────────────┴───────────────┐                    │
│         │                               │                    │
│      ┌──▼──┐      ┌──────┐      ┌──────▼──┐                 │
│      │ Auth │      │Wallet│      │ Capsules│                 │
│      └─────┘      └──────┘      └─────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── routes/                    # File-based routing (TanStack Router)
│   ├── __root.tsx            # Root layout and auth gate
│   ├── index.tsx             # Home/dashboard route
│   ├── dashboard.tsx         # Main dashboard
│   └── demo.tsx              # Demo mode route
│
├── components/               # Reusable UI components
│   ├── ui/                   # Radix UI primitives
│   ├── SingulAIDashboard.tsx # Main dashboard component
│   ├── ChatStream.tsx        # Chat interface
│   ├── ActionRail.tsx        # Action menu
│   ├── UserHeader.tsx        # User info header
│   └── ...                   # Other components
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts            # Authentication state
│   └── use-mobile.tsx        # Mobile detection
│
├── lib/                      # Utility libraries
│   ├── api.ts                # API client with all endpoints
│   ├── avatar-engine.ts      # THREE.js particle system
│   ├── utils.ts              # Helper functions
│   ├── brand.ts              # Branding constants
│   ├── altApi.ts             # Alternative API implementation
│   │
│   ├── services/             # Service layer abstractions
│   │   ├── index.ts          # Service exports
│   │   ├── sgl.ts            # Token and wallet service
│   │   ├── capsules.ts       # Digital capsules service
│   │   ├── legacy.ts         # User profiles service
│   │   └── memory.ts         # Memory tracking service
│   │
│   └── behavior-runtime/     # NEW: Behavior Runtime module
│       ├── index.ts          # Main public API
│       ├── types.ts          # Type definitions
│       ├── scheduler.ts      # Task scheduling
│       ├── policy-engine.ts  # Policy evaluation
│       ├── entropy-engine.ts # Entropy management
│       ├── profile.ts        # Profile management
│       ├── analytics.ts      # Event tracking
│       └── README.md         # Module documentation
│
└── styles.css                # Global styles with CSS variables
```

## 🔌 API Integration Architecture

### REST API Endpoints

**Base URL:** `https://singulai.site/api`

All endpoints require Bearer token in `Authorization` header.

#### Authentication
```
GET    /api/auth/google           → OAuth provider redirect
POST   /api/auth/verify-session   → Validate user session
GET    /api/auth/user             → Get authenticated user data
POST   /api/auth/logout           → Logout and clear session
```

#### Wallet (SGL Token)
```
GET    /api/wallet/balance        → Get SGL token balance
POST   /api/wallet/transfer       → Transfer SGL between accounts
```

#### Capsules (Digital Legacy)
```
POST   /api/capsules/create       → Create new legacy capsule
GET    /api/capsules/list         → List user's capsules
GET    /api/capsules/{id}         → Get capsule details
```

#### Legacy Profiles
```
GET    /api/legacy/own            → Get user's legacy profile
GET    /api/legacy/{id}           → Get public legacy profile
PATCH  /api/legacy                → Update user's legacy
POST   /api/legacy/switch-profile → Switch between profiles
```

#### Memory
```
GET    /api/memory                → Get user memories
POST   /api/memory                → Create new memory
GET    /api/memory/neural-sync    → Neural sync history
POST   /api/memory/emotional-state → Track emotions
```

## 🎯 Core Modules

### 1. Frontend Layer (`src/components/`)

**Responsibilities:**
- UI rendering with React 19
- Client-side form handling
- Real-time updates via React Query
- User interactions and events

**Key Components:**
- `SingulAIDashboard` — Main UI container
- `ChatStream` — Chat interface
- `ActionRail` — Action menu
- `UserHeader` — User information display

**Design System:**
CSS variables for consistent theming across three avatar profiles:
- Pedro (Blue #3b82f6)
- Laura (Pink #ec4899)
- Leticia (Yellow #eab308)

### 2. Routing Layer (`src/routes/`)

**Router:** TanStack Router v1.168

**File-based Routes:**
```
__root.tsx          (root layout with auth gate)
├── index.tsx       (/ — dashboard home)
├── dashboard.tsx   (/dashboard — main page)
└── demo.tsx        (/demo — demo mode)
```

**Auth Gate:** Root route validates session and redirects to OAuth if needed.

### 3. Service Layer (`src/lib/services/`)

**Purpose:** Abstraction layer between components and API

**Services:**
- `sgl.ts` — Token management and wallet operations
- `capsules.ts` — Digital legacy container operations
- `legacy.ts` — User profile and expertise management
- `memory.ts` — Knowledge and emotional tracking
- `index.ts` — Unified service exports

**Pattern:** Each service exports functions with typed payloads and responses.

### 4. API Client (`src/lib/api.ts`)

**Purpose:** Lower-level HTTP communication

**Features:**
- Axios-based HTTP client
- Automatic token injection
- Error handling and retry logic
- Request/response interceptors
- TypeScript types for all endpoints

**Configuration:**
- Base URL: Environment-configurable
- Timeout: 10s default
- Retry: 3 attempts with exponential backoff

### 5. Avatar Engine (`src/lib/avatar-engine.ts`)

**Purpose:** 3D particle animation system using THREE.js

**Features:**
- Particle generation and animation
- Profile-based color theming
- GPU-optimized rendering
- Responsive to window resize

**Integration:** Used as background in user avatars on `UserHeader` component.

## 📦 NEW: Behavior Runtime Module

### Overview

Located at: `src/lib/behavior-runtime/`

A comprehensive, isolated task scheduling and behavior analysis framework that operates independently from the main SingulAI platform.

### Architecture

**Subsystems:**

1. **Scheduler** (`scheduler.ts`)
   - Priority-based task queuing
   - Concurrent execution management
   - Retry logic with backoff
   - Task state tracking

2. **Policy Engine** (`policy-engine.ts`)
   - Rule-based decision making
   - Rate limiting and throttling
   - Policy evaluation with priority
   - Audit logging

3. **Entropy Engine** (`entropy-engine.ts`)
   - Multi-source entropy generation
   - Quality scoring
   - Pool management
   - Failover and redundancy

4. **Profile Manager** (`profile.ts`)
   - User behavior profile CRUD
   - Policy bindings
   - Entropy source assignments
   - Profile persistence

5. **Analytics** (`analytics.ts`)
   - Event collection and buffering
   - Metrics aggregation
   - Time-series analysis
   - Event export/import

### Type System

**Core Types:**
- `BehaviorContextId` — Execution context identifier
- `ScheduledTask<T>` — Task with payload and state
- `PolicyRule<TContext>` — Policy with evaluation logic
- `EntropySource` — Entropy provider with quality
- `BehaviorProfile` — User behavior configuration
- `AnalyticsEvent<TData>` — Event record

**Enumerations:**
- `BehaviorExecutionState` — PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, PAUSED
- `TaskPriority` — CRITICAL, HIGH, NORMAL, LOW, DEFERRED
- `PolicyRuleType` — ALLOW, DENY, RATE_LIMIT, THROTTLE, CONDITIONAL
- `EntropySourceType` — SYSTEM_RANDOM, USER_INTERACTION, ENVIRONMENTAL, CRYPTOGRAPHIC

### Public API

**Main Entry Point:**
```typescript
import { BehaviorRuntime, createBehaviorRuntime } from "@/lib/behavior-runtime";

const runtime = createBehaviorRuntime(contextId);
await runtime.initialize();

// Access subsystems
runtime.getScheduler();
runtime.getPolicyEngine();
runtime.getEntropyEngine();
runtime.getProfileManager();
runtime.getAnalyticsEngine();

await runtime.shutdown();
```

### Extension Points

1. **Custom Entropy Sources** — Implement `EntropySourceProvider`
2. **Custom Policy Rules** — Define `PolicyRule` instances
3. **Analytics Handlers** — Subscribe to event streams
4. **Custom Schedulers** — Extend `BehaviorScheduler`

### Integration Design

**Isolation:** The module operates completely independently with no modifications to existing systems.

**Future Integration Points:**
- Scheduler can consume user profiles from Profile Manager
- Policy Engine can enforce access control on existing operations
- Analytics can track dashboard user interactions
- Entropy can seed randomization for recommendations

## 🔐 Security Architecture

### Authentication Flow

1. User accesses app → Root route `__root.tsx`
2. `useAuth()` hook validates session token
3. If invalid/missing → Redirect to Google OAuth
4. OAuth callback stores session in `localStorage.singulai_session`
5. Automatic token refresh on expiry

### Token Management

- **Storage:** localStorage (singulai_session)
- **Transport:** Authorization Bearer header
- **Expiry:** Auto-refresh via React Query
- **Scope:** User ID, email, wallet address, balance

### Backend Proxy

Vite development server proxies `/api` requests:
```
http://localhost:5173/api/* → http://127.0.0.1:8091/api/*
```

## 🎨 Design System

### Color Scheme

**CSS Variables:**
```css
--bg              /* Background color */
--text-hi         /* High contrast text */
--text-md         /* Medium contrast text */
--text-lo         /* Low contrast text */
--accent-rgb      /* Accent color in RGB */
--border          /* Border color */
--topbar-h        /* Top bar height */
--blur-lg         /* Backdrop blur amount */
```

**Avatar Profiles (dynamic theming):**
- Pedro → Blue theme
- Laura → Pink theme
- Leticia → Yellow theme

### Responsive Design

- Mobile-first approach
- Tailwind breakpoints: sm, md, lg, xl, 2xl
- Touch-friendly UI elements
- Flexible grid layouts

## 🚀 Performance Considerations

### Client-Side Optimization

- Code splitting via dynamic imports
- React Query caching strategy:
  - Stale time: 5 minutes
  - GC time: 10 minutes
  - Auto-refetch on focus
- THREE.js particle engine GPU-accelerated
- CSS variables for theme switching

### Server-Side Optimization

- TanStack Start SSR for faster initial load
- Streaming responses for large payloads
- Request deduplication in React Query
- Gzip compression (24.7 kB for styles)

### Bundle Sizes

Current production builds:
```
Main dashboard: 588 KB (161.8 KB gzipped)
Vault/capsules: 306 KB (92.1 KB gzipped)
Index page: 368.8 KB (117.6 KB gzipped)
Styles: 132.4 KB (24.7 KB gzipped)
```

## 🧪 Development Workflow

### Local Development

```bash
npm install           # Install dependencies
npm run dev          # Start dev server (http://localhost:8080)
npm run build        # Production build
npm run preview      # Preview build locally
npm run lint         # ESLint check
npm run format       # Prettier formatting
```

### Development Server

- Vite hot module replacement (HMR)
- API proxy to `http://127.0.0.1:8091`
- Allowed hosts for production domains

## 📖 Documentation References

- [README.md](./README.md) — Project overview and quick start
- [BACKEND_SPECIFICATION.md](./BACKEND_SPECIFICATION.md) — Complete API reference
- [src/lib/behavior-runtime/README.md](./src/lib/behavior-runtime/README.md) — Behavior Runtime guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment instructions

## 🔄 Future Architecture Considerations

1. **Microservices:** Extract Auth, Wallet, Capsules services
2. **Message Queue:** Event-driven architecture with Kafka/RabbitMQ
3. **Caching Layer:** Redis for session and query caching
4. **Monitoring:** OpenTelemetry for distributed tracing
5. **Database:** PostgreSQL with TypeORM or Prisma ORM
6. **GraphQL:** Alternative to REST API
7. **WebSockets:** Real-time features with Socket.io
8. **Behavior Runtime:** Full integration with platform
