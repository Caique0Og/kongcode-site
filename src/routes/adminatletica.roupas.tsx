import { createFileRoute } from "@tanstack/react-router";
import { AdminSection } from "@/components/atletica/admin-section";
import { productsQuery, formatPrice } from "@/lib/content";
export const Route = createFileRoute("/adminatletica/roupas")({
  component: () => (
    <AdminSection
      table="products"
      title="Roupas"
      query={productsQuery}
      titleKey="name"
      imageKey="images"
      subtitle={(r: any) => formatPrice(r.price == null ? null : Number(r.price)) ?? "Sem preço"}
      fields={[
        { key: "name", label: "Nome da peça", type: "text", required: true },
        { key: "images", label: "Imagens", type: "images", required: true },
        { key: "description", label: "Descrição", type: "textarea", required: true },
        { key: "price", label: "Preço (R$)", type: "number", required: true },
        {
          key: "sizes",
          label: "Tamanhos disponíveis (separados por vírgula)",
          type: "list",
          required: true,
        },
        {
          key: "colors",
          label: "Cores/Modelos (opcional, separados por vírgula, ex.: Preta, Azul)",
          type: "list",
        },
        { key: "order_url", label: "Link de compra/pedido (opcional)", type: "url" },
      ]}
    />
  ),
});
