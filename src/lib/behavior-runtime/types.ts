/**
 * Behavior Runtime — Type Definitions and Contracts
 *
 * This module defines all types, interfaces, and contracts used throughout
 * the behavior runtime system. No implementation logic should be placed here.
 *
 * @category Core
 */

/**
 * Unique identifier for a behavior execution context
 */
export type BehaviorContextId = string & { readonly __brand: "BehaviorContextId" };

/**
 * Unique identifier for a policy rule
 */
export type PolicyId = string & { readonly __brand: "PolicyId" };

/**
 * Unique identifier for an entropy source
 */
export type EntropySourceId = string & { readonly __brand: "EntropySourceId" };

/**
 * Unique identifier for a user profile
 */
export type ProfileId = string & { readonly __brand: "ProfileId" };

/**
 * Execution state of a scheduled behavior
 */
export enum BehaviorExecutionState {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED",
}

/**
 * Priority level for scheduled tasks
 */
export enum TaskPriority {
  CRITICAL = 5,
  HIGH = 4,
  NORMAL = 3,
  LOW = 2,
  DEFERRED = 1,
}

/**
 * Entropy source type for randomness generation
 */
export enum EntropySourceType {
  SYSTEM_RANDOM = "SYSTEM_RANDOM",
  USER_INTERACTION = "USER_INTERACTION",
  ENVIRONMENTAL = "ENVIRONMENTAL",
  CRYPTOGRAPHIC = "CRYPTOGRAPHIC",
}

/**
 * Policy rule type enumeration
 */
export enum PolicyRuleType {
  ALLOW = "ALLOW",
  DENY = "DENY",
  RATE_LIMIT = "RATE_LIMIT",
  THROTTLE = "THROTTLE",
  CONDITIONAL = "CONDITIONAL",
}

/**
 * Core interface for a scheduled task
 *
 * @interface ScheduledTask
 * @template TPayload - Type of the task payload
 */
export interface ScheduledTask<TPayload = unknown> {
  /** Unique task identifier */
  id: string;

  /** Task name for logging and debugging */
  name: string;

  /** Current execution state */
  state: BehaviorExecutionState;

  /** Priority level */
  priority: TaskPriority;

  /** Task payload/configuration */
  payload: TPayload;

  /** Scheduled execution timestamp (Unix milliseconds) */
  scheduledAt: number;

  /** Actual execution timestamp (Unix milliseconds, null if not yet executed) */
  executedAt: number | null;

  /** Next scheduled execution (for recurring tasks) */
  nextExecution: number | null;

  /** Task timeout in milliseconds */
  timeoutMs: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Current retry count */
  retryCount: number;

  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Policy rule definition
 *
 * @interface PolicyRule
 * @template TContext - Type of the context to evaluate policy against
 */
export interface PolicyRule<TContext = unknown> {
  /** Unique rule identifier */
  id: PolicyId;

  /** Rule name */
  name: string;

  /** Rule type */
  type: PolicyRuleType;

  /** Rule priority (higher number = higher priority) */
  priority: number;

  /** Predicate function to evaluate if rule applies */
  condition: (context: TContext) => boolean;

  /** Action to execute when rule applies */
  action: (context: TContext) => Promise<void> | void;

  /** Optional rate limit (requests per second) */
  rateLimit?: number;

  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Entropy source interface
 *
 * @interface EntropySource
 */
export interface EntropySource {
  /** Unique source identifier */
  id: EntropySourceId;

  /** Source name */
  name: string;

  /** Source type */
  type: EntropySourceType;

  /** Whether this source is active */
  active: boolean;

  /** Function to generate random bytes */
  generate: (size: number) => Promise<Uint8Array>;

  /** Entropy quality score (0-100) */
  qualityScore: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User behavior profile
 *
 * @interface BehaviorProfile
 */
export interface BehaviorProfile {
  /** Unique profile identifier */
  id: ProfileId;

  /** User identifier (from auth system) */
  userId: string;

  /** Profile name */
  name: string;

  /** Applied policies for this profile */
  policyIds: PolicyId[];

  /** Active entropy sources */
  entropySourceIds: EntropySourceId[];

  /** Profile configuration */
  config: Record<string, unknown>;

  /** Profile creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  updatedAt: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Analytics event
 *
 * @interface AnalyticsEvent
 * @template TData - Type of event-specific data
 */
export interface AnalyticsEvent<TData = unknown> {
  /** Unique event identifier */
  id: string;

  /** Event type/name */
  type: string;

  /** Event timestamp */
  timestamp: number;

  /** Context identifier (task, profile, etc.) */
  contextId: string;

  /** Event severity level */
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";

  /** Event message */
  message: string;

  /** Event-specific data */
  data?: TData;

  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Behavior Runtime Configuration
 *
 * @interface BehaviorRuntimeConfig
 */
export interface BehaviorRuntimeConfig {
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;

  /** Default task timeout in milliseconds */
  defaultTaskTimeoutMs: number;

  /** Enable analytics collection */
  enableAnalytics: boolean;

  /** Analytics event retention (in milliseconds) */
  analyticsRetentionMs: number;

  /** Policy evaluation timeout in milliseconds */
  policyEvaluationTimeoutMs: number;

  /** Entropy pool size */
  entropyPoolSize: number;

  /** Arbitrary configuration options */
  [key: string]: unknown;
}

/**
 * Behavior Runtime context state
 *
 * @interface BehaviorRuntimeContext
 */
export interface BehaviorRuntimeContext {
  /** Context identifier */
  id: BehaviorContextId;

  /** Runtime configuration */
  config: BehaviorRuntimeConfig;

  /** All registered policies */
  policies: Map<PolicyId, PolicyRule>;

  /** All registered entropy sources */
  entropySources: Map<EntropySourceId, EntropySource>;

  /** All user profiles */
  profiles: Map<ProfileId, BehaviorProfile>;

  /** Scheduled tasks queue */
  taskQueue: ScheduledTask[];

  /** Analytics events buffer */
  events: AnalyticsEvent[];

  /** Last context update timestamp */
  updatedAt: number;

  /** Arbitrary state data */
  state?: Record<string, unknown>;
}

/**
 * Result of a policy evaluation
 *
 * @interface PolicyEvaluationResult
 */
export interface PolicyEvaluationResult {
  /** Whether the policy was satisfied */
  allowed: boolean;

  /** Policies that matched */
  matchedRules: PolicyId[];

  /** Evaluation timestamp */
  evaluatedAt: number;

  /** Evaluation duration in milliseconds */
  durationMs: number;

  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Scheduler task execution result
 *
 * @interface TaskExecutionResult
 * @template TResult - Type of the result data
 */
export interface TaskExecutionResult<TResult = unknown> {
  /** Task identifier */
  taskId: string;

  /** Success indicator */
  success: boolean;

  /** Execution duration in milliseconds */
  durationMs: number;

  /** Result data */
  result?: TResult;

  /** Error details (if failed) */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  /** Execution timestamp */
  executedAt: number;

  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}
