import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/atletica/category-page";
export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos | KongCode" },
      { name: "description", content: "Acompanhe os encontros e os eventos do KongCode." },
      { property: "og:title", content: "Eventos | KongCode" },
      {
        property: "og:description",
        content: "Viva os encontros da nossa comunidade universitária.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <CategoryPage category="eventos" />,
});
