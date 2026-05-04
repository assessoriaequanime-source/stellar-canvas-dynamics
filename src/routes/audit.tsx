import { createFileRoute } from "@tanstack/react-router";
import AuditReadOnlyPanel from "@/components/vault/AuditReadOnlyPanel";

export const Route = createFileRoute("/audit")({
  component: AuditReadOnlyPanel,
});
