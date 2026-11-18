import { createFileRoute } from "@tanstack/react-router";
import { AdminSection } from "@/components/atletica/admin-section";
import { eventsQuery, formatDate } from "@/lib/content";
export const Route = createFileRoute("/adminatletica/eventos")({
  component: () => (
    <AdminSection
      table="events"
      title="Eventos"
      query={eventsQuery}
      titleKey="title"
      imageKey="cover_url"
      subtitle={(r: any) => `${formatDate(r.event_date)} · ${r.event_time} · ${r.location}`}
      fields={[
        { key: "title", label: "Título", type: "text", required: true },
        { key: "cover_url", label: "Imagem de capa", type: "image", required: true },
        { key: "description", label: "Descrição", type: "textarea", required: true },
        { key: "event_date", label: "Data", type: "date", required: true },
        { key: "event_time", label: "Horário", type: "time", required: true },
        { key: "location", label: "Local", type: "text", required: true },
        { key: "ticket_url", label: "Link de inscrição/ingresso (opcional)", type: "url" },
      ]}
    />
  ),
});
