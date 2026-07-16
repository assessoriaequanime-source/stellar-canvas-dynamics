# Behavior Runtime

Behavior Runtime is a comprehensive task scheduling, policy evaluation, and behavioral analysis framework for the SingulAI platform. It provides isolated, non-intrusive infrastructure for managing scheduled behaviors, enforcing policies, and tracking user interactions.

## 📋 Overview

The Behavior Runtime module provides:

- **Task Scheduler** — Priority-based task scheduling with retry logic
- **Policy Engine** — Rule-based policy evaluation and enforcement
- **Entropy Engine** — Multi-source randomness generation with quality metrics
- **Profile Manager** — User behavior profile management and configuration
- **Analytics** — Event tracking, metrics collection, and performance insights

## 🏗️ Architecture

```
behavior-runtime/
├── index.ts              # Main public API and factory functions
├── types.ts              # Core type definitions and interfaces
├── scheduler.ts          # Task scheduling and execution
├── policy-engine.ts      # Policy evaluation and rule matching
├── entropy-engine.ts     # Entropy management and randomness
├── profile.ts            # User behavior profile management
├── analytics.ts          # Event tracking and metrics
└── README.md            # This file
```

## 🔧 Core Subsystems

### Scheduler

Manages scheduling and execution of behavioral tasks with:
- Priority-based queuing
- Concurrent execution limits
- Retry logic with exponential backoff
- Execution timeout handling
- Task state tracking

**Key Classes:**
- `BehaviorScheduler` — Task scheduling and execution engine
- `PriorityQueue` — Efficient priority queue implementation

### Policy Engine

Evaluates and enforces behavioral policies:
- Rule-based decision making
- Policy priority handling
- Rate limiting and throttling
- Conditional rule evaluation
- Audit logging

**Key Classes:**
- `PolicyEngine` — Policy evaluation and rule management
- `RuleMatcher` — Policy rule matching utilities

### Entropy Engine

Manages entropy sources for probabilistic decisions:
- Multiple entropy source support
- Quality scoring and validation
- Entropy pool management
- Source failover and redundancy
- Platform-specific entropy collection

**Key Classes:**
- `EntropyEngine` — Entropy management and generation
- `SystemEntropySource` — System-level entropy provider
- `EntropySourceProvider` — Custom entropy provider interface

### Profile Manager

Manages user behavior profiles:
- CRUD operations for profiles
- Policy and entropy source binding
- Profile configuration management
- Profile persistence and export/import
- Multi-profile per user support

**Key Classes:**
- `ProfileManager` — User profile lifecycle management

### Analytics Engine

Collects and analyzes behavioral events:
- Event buffering and flushing
- Metrics aggregation
- Time-series analysis
- Event export/import
- Real-time event streaming

**Key Classes:**
- `AnalyticsEngine` — Event collection and analysis
- `EventAggregator` — Event-based analytics
- `MetricsCollector` — Metrics tracking

## 📦 Public API

### Main Entry Point

```typescript
import { BehaviorRuntime, createBehaviorRuntime } from "@/lib/behavior-runtime";

// Create runtime with default config
const runtime = createBehaviorRuntime(contextId);

// Initialize
await runtime.initialize();

// Access subsystems
const scheduler = runtime.getScheduler();
const policyEngine = runtime.getPolicyEngine();
const entropyEngine = runtime.getEntropyEngine();
const profileManager = runtime.getProfileManager();
const analytics = runtime.getAnalyticsEngine();

// Shutdown gracefully
await runtime.shutdown();
```

### Type System

#### BehaviorContextId
Unique identifier for a behavior execution context.

#### ScheduledTask<T>
Scheduled task with payload, state, and metadata.

#### PolicyRule<TContext>
Policy rule with type, priority, and evaluation logic.

#### EntropySource
Entropy source with quality metrics and generation capability.

#### BehaviorProfile
User behavior profile with policy and entropy source bindings.

#### AnalyticsEvent<TData>
Analytics event with timestamp, level, and custom data.

### Enums

- `BehaviorExecutionState` — Task execution states (PENDING, RUNNING, COMPLETED, etc.)
- `TaskPriority` — Task priority levels (CRITICAL, HIGH, NORMAL, LOW, DEFERRED)
- `EntropySourceType` — Entropy source types
- `PolicyRuleType` — Policy rule types (ALLOW, DENY, RATE_LIMIT, etc.)

## 🎯 Design Principles

1. **Isolation** — No modifications to existing system behavior
2. **Extensibility** — Custom policies, entropy sources, and analytics handlers
3. **Type Safety** — Full TypeScript with strict mode enabled
4. **Contracts** — Clear interfaces for all subsystems
5. **Documentation** — Comprehensive JSDoc for all public APIs
6. **Modularity** — Independent subsystems with clear boundaries

## 🔌 Extension Points

### Custom Entropy Source

Implement `EntropySourceProvider` to create custom entropy sources:

```typescript
class CustomEntropySource implements EntropySourceProvider {
  async initialize(): Promise<void> {}
  async generate(size: number): Promise<Uint8Array> {}
  getQualityScore(): number { return 85; }
  isAvailable(): boolean { return true; }
  async cleanup(): Promise<void> {}
}

const source = new CustomEntropySource();
entropyEngine.registerSource({
  id: "custom" as EntropySourceId,
  name: "Custom Entropy",
  type: EntropySourceType.CRYPTOGRAPHIC,
  active: true,
  generate: (size) => source.generate(size),
  qualityScore: 85,
});
```

### Custom Policy Rule

Create policy rules for behavioral enforcement:

```typescript
const policy: PolicyRule = {
  id: "rate-limit-api" as PolicyId,
  name: "API Rate Limit",
  type: PolicyRuleType.RATE_LIMIT,
  priority: 10,
  condition: (context: any) => context.type === "api-call",
  action: async (context: any) => {
    // Enforce rate limit
  },
  rateLimit: 100, // Requests per second
};

policyEngine.registerPolicy(policy);
```

### Custom Analytics Handler

Subscribe to analytics events for custom handling:

```typescript
const unsubscribe = analyticsEngine.subscribe((event) => {
  if (event.level === "ERROR") {
    console.error(`Error in ${event.contextId}:`, event.message);
  }
});

// Later: unsubscribe();
```

## 📊 Integration Points

### Scheduler Integration
- Consults policy engine before task execution
- Records execution events to analytics
- Uses entropy engine for probabilistic scheduling decisions

### Policy Engine Integration
- Consumes policies from profile manager
- Records policy evaluations to analytics
- Uses entropy engine for probabilistic rule evaluation

### Profile Manager Integration
- Stores user preferences and policies
- Binds entropy sources to profiles
- Tracks profile change events

### Analytics Integration
- Receives events from all subsystems
- Aggregates metrics and statistics
- Supports event export and external systems

## 🚀 Future Enhancements

- [ ] Distributed task scheduling with consensus
- [ ] Machine learning-based policy optimization
- [ ] Blockchain-based audit logging
- [ ] Advanced entropy pool visualization
- [ ] Performance profiling and optimization
- [ ] Multi-tenant support and isolation
- [ ] Real-time dashboard integration
- [ ] Event stream processing with Kafka
- [ ] Advanced anomaly detection
- [ ] Policy versioning and rollback

## 📝 Development Status

**Current Phase:** Structural Implementation (Alpha v0.1.0)

- ✅ Type definitions and contracts
- ✅ Public API surface
- ✅ Subsystem interfaces
- ⏳ Implementation of core logic
- ⏳ Integration testing
- ⏳ Performance optimization
- ⏳ Production deployment

### TODO For Next Phases

1. Implement task execution engine with timeout handling
2. Implement policy evaluation and rule matching
3. Implement entropy generation and pool management
4. Implement profile persistence and versioning
5. Implement analytics aggregation and export
6. Integration with existing SingulAI modules
7. Performance benchmarking
8. Security audit and hardening

## 📚 References

- Main module: `/src/lib/behavior-runtime/index.ts`
- Types: `/src/lib/behavior-runtime/types.ts`
- Scheduler: `/src/lib/behavior-runtime/scheduler.ts`
- Policy Engine: `/src/lib/behavior-runtime/policy-engine.ts`
- Entropy Engine: `/src/lib/behavior-runtime/entropy-engine.ts`
- Profile Manager: `/src/lib/behavior-runtime/profile.ts`
- Analytics: `/src/lib/behavior-runtime/analytics.ts`
