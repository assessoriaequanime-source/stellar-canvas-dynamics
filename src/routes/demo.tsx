import { createFileRoute } from "@tanstack/react-router";
import SingulAIIntroExperience from "@/components/SingulAIIntroExperience";

export const Route = createFileRoute("/demo")({
  component: SingulAIIntroExperience,
  head: () => ({
    meta: [
      { title: "SingulAI AvatarPro Vault — Professional expertise on-chain" },
      { name: "description", content: "Create an AvatarPro, register encrypted snapshots, program TimeCapsules and generate on-chain execution proofs on Solana Devnet. Solana Frontier Hackathon 2026." },
      { property: "og:title", content: "SingulAI AvatarPro Vault — Solana Frontier Hackathon" },
      { property: "og:description", content: "Professional expertise, verifiable memory and executable identity on Solana Devnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SingulAI AvatarPro Vault" },
      { name: "twitter:description", content: "Professional expertise on-chain. Solana Frontier Hackathon 2026." },
    ],
  }),
});