export type ServiceType =
  | "CREATE_AVATAR_PRO"
  | "REGISTER_MEMORY_SNAPSHOT"
  | "CREATE_TIME_CAPSULE"
  | "UPDATE_ABSORPTION_SCORE"
  | "CREATE_LEGACY_RULE"
  | "SIMULATE_EXECUTION_TRIGGER"
  | "GENERATE_AUDIT_PROOF";

export interface ServiceConfig {
  label: string;
  cost: number;
}

export const INITIAL_SGL_BALANCE = 10000;

export const SERVICE_CATALOG: Record<ServiceType, ServiceConfig> = {
  CREATE_AVATAR_PRO: { label: "Create AvatarPro", cost: 100 },
  REGISTER_MEMORY_SNAPSHOT: { label: "Register Memory Snapshot", cost: 25 },
  CREATE_TIME_CAPSULE: { label: "Create Time Capsule", cost: 150 },
  UPDATE_ABSORPTION_SCORE: { label: "Update Absorption Score", cost: 20 },
  CREATE_LEGACY_RULE: { label: "Create Legacy Rule", cost: 200 },
  SIMULATE_EXECUTION_TRIGGER: { label: "Simulate Execution Trigger", cost: 50 },
  GENERATE_AUDIT_PROOF: { label: "Generate Audit Proof", cost: 10 },
};

export const SERVICE_TYPES = Object.keys(SERVICE_CATALOG) as ServiceType[];
