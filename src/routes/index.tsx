import { createFileRoute } from "@tanstack/react-router";
import SingulAIDashboard from "@/components/SingulAIDashboard";

export const Route = createFileRoute("/")({
  component: SingulAIDashboard,
});
