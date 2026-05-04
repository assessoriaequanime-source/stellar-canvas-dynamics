import { createFileRoute } from "@tanstack/react-router";
import VaultMvpPanel from "@/components/vault/VaultMvpPanel";

export const Route = createFileRoute("/vault")({
  component: VaultMvpPanel,
});
