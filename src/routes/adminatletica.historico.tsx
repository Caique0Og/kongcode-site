import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/adminatletica/historico")({
  component: Historico,
});

type Entry = {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
};

const AREA: Record<string, string> = {
  clubs: "Clubes",
  products: "Roupas",
  events: "Eventos",
  admin_emails: "Admins",
  product_orders: "Pedidos",
};
const ACTION: Record<string, { label: string; className: string }> = {
  INSERT: { label: "Criou", className: "bg-emerald-500/15 text-emerald-400" },
  UPDATE: { label: "Editou", className: "bg-amber-500/15 text-amber-400" },
  DELETE: { label: "Excluiu", className: "bg-red-500/15 text-red-400" },
};
const FIELD: Record<string, string> = {
  name: "Nome",
  title: "Título",
  description: "Descrição",
  image_url: "Imagem",
  images: "Imagens",
  cover_url: "Capa",
  whatsapp_url: "WhatsApp",
  price: "Preço",
  sizes: "Tamanhos",
  order_url: "Link de pedido",
  event_date: "Data",
  event_time: "Horário",
  location: "Local",
  ticket_url: "Link do ingresso",
  sort_order: "Ordem",
  email: "E-mail",
  delivery_status: "Entrega",
  delivered_at: "Entregue em",
};
const HIDDEN = new Set(["id", "created_at", "updated_at"]);

function asObject(v: Json | null): Record<string, Json | undefined> {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function show(v: Json | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.map((x) => show(x)).join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function itemName(e: Entry) {
  const d = { ...asObject(e.old_data), ...asObject(e.new_data) };
  return show(d["name"] ?? d["title"] ?? d["order_code"] ?? d["email"] ?? e.record_id ?? undefined);
}

function changes(e: Entry) {
  const before = asObject(e.old_data);
  const after = asObject(e.new_data);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => !HIDDEN.has(k))
    .filter((k) => e.action !== "UPDATE" || JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ key: k, label: FIELD[k] ?? k, before: before[k], after: after[k] }));
}

function Historico() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_audit_log"],
    queryFn: async () => {
      const { data: owner } = await supabase.rpc("is_site_owner");
      if (!owner) return null;
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, created_at, actor_email, action, table_name, record_id, old_data, new_data")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Entry[];
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando histórico…</p>;
  if (error) return <p className="text-destructive">Não foi possível carregar o histórico.</p>;
  if (data === null)
    return (
      <p className="text-muted-foreground">Esta página é exclusiva do presidente da atlética.</p>
    );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Histórico de alterações</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo o que os admins criaram, editaram ou excluíram no site. Só a conta do presidente vê
          esta página, e os registros não podem ser apagados pelo painel.
        </p>
      </div>
      {!data?.length && (
        <p className="text-muted-foreground">Nenhuma alteração registrada ainda.</p>
      )}
      <ul className="space-y-3">
        {data?.map((e) => {
          const act = ACTION[e.action] ?? { label: e.action, className: "bg-muted" };
          return (
            <li key={e.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className={`rounded-md px-2 py-0.5 font-semibold ${act.className}`}>
                  {act.label}
                </span>
                <span className="font-semibold">{AREA[e.table_name] ?? e.table_name}</span>
                <span className="text-foreground">{itemName(e)}</span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                por {e.actor_email ?? "sistema (fora do painel)"}
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Ver detalhes</summary>
                <dl className="mt-2 grid gap-2">
                  {changes(e).map((c) => (
                    <div key={c.key} className="grid gap-1 md:grid-cols-[10rem_1fr]">
                      <dt className="font-medium text-muted-foreground">{c.label}</dt>
                      <dd className="break-words">
                        {e.action === "UPDATE" ? (
                          <>
                            <span className="text-red-400 line-through">{show(c.before)}</span>
                            {" → "}
                            <span className="text-emerald-400">{show(c.after)}</span>
                          </>
                        ) : (
                          show(e.action === "DELETE" ? c.before : c.after)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
