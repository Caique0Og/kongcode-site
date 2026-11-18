import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/atletica/category-page";
export const Route = createFileRoute("/roupas")({
  head: () => ({
    meta: [
      { title: "Roupas | KongCode" },
      { name: "description", content: "Acompanhe as novidades das roupas do KongCode." },
      { property: "og:title", content: "Roupas | KongCode" },
      { property: "og:description", content: "Vista o orgulho de ser KongCode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <CategoryPage category="roupas" />,
});
