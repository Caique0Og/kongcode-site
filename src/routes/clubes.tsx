import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/atletica/category-page";
export const Route = createFileRoute("/clubes")({
  head: () => ({
    meta: [
      { title: "Clubes | KongCode" },
      { name: "description", content: "Encontre sua comunidade nos clubes do KongCode." },
      { property: "og:title", content: "Clubes | KongCode" },
      { property: "og:description", content: "Conexões e novos encontros na comunidade KongCode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <CategoryPage category="clubes" />,
});
