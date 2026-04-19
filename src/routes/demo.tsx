import { createFileRoute } from "@tanstack/react-router";
import SingulAIIntroExperience from "@/components/SingulAIIntroExperience";

export const Route = createFileRoute("/demo")({
  component: SingulAIIntroExperience,
});