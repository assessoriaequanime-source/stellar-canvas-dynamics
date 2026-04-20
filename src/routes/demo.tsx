import { createFileRoute } from "@tanstack/react-router";
import SingulAIIntroExperience from "@/components/SingulAIIntroExperience";

export const Route = createFileRoute("/demo")({
  component: SingulAIIntroExperience,
  head: () => ({
    meta: [
      {
        title: "SingulAI — Experiência de Entrada",
      },
      {
        name: "description",
        content: "Inicie o rito de memória. Interface neural para cognição avatar e expansão simbólica.",
      },
      {
        property: "og:title",
        content: "SingulAI — Experiência de Entrada",
      },
      {
        property: "og:description",
        content: "Inicie o rito de memória. Interface neural para cognição avatar e expansão simbólica.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "SingulAI — Experiência de Entrada",
      },
      {
        name: "twitter:description",
        content: "Inicie o rito de memória. Interface neural para cognição avatar e expansão simbólica.",
      },
    ],
  }),
});