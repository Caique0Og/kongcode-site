import { createFileRoute } from "@tanstack/react-router";
import { AdminSection } from "@/components/atletica/admin-section";
import { clubsQuery } from "@/lib/content";
export const Route = createFileRoute("/adminatletica/clubes")({
  component: () => (
    <AdminSection
      table="clubs"
      title="Clubes"
      query={clubsQuery}
      titleKey="name"
      imageKey="image_url"
      subtitle={(r: any) => r.whatsapp_url}
      fields={[
        { key: "name", label: "Nome", type: "text", required: true },
        { key: "image_url", label: "Imagem", type: "image", required: true },
        { key: "description", label: "Descrição breve", type: "textarea", required: true },
        { key: "whatsapp_url", label: "Link do grupo de WhatsApp", type: "url", required: true },
      ]}
    />
  ),
});
