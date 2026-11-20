import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adminatletica/pedidos")({
  component: Pedidos,
});

const PAYMENT: Record<string, string> = {
  approved: "Pago",
  pending: "Aguardando pagamento",
  in_process: "Em análise",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
};
const DELIVERY = [
  { value: "pendente", label: "Pendente" },
  { value: "separado", label: "Separado" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;
const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Filter = "pagos" | "todos";

function Pedidos() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pagos");
  const [search, setSearch] = useState("");
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_orders")
        .select(
          "id, order_code, created_at, product_name, size, full_name, ra, phone, email, amount, payment_status, paid_at, delivery_status",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((o) => {
      const paidOrFree = o.payment_status === "approved" || !o.amount;
      if (filter === "pagos" && !paidOrFree) return false;
      if (!q) return true;
      return [o.order_code, o.full_name, o.email, o.ra, o.product_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, filter, search]);

  async function setDelivery(id: string, value: string) {
    const { error } = await supabase
      .from("product_orders")
      .update({
        delivery_status: value,
        delivered_at: value === "entregue" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o pedido.");
      return;
    }
    toast.success("Pedido atualizado.");
    qc.invalidateQueries({ queryKey: ["admin_orders"] });
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando pedidos…</p>;
  if (error) return <p className="text-destructive">Não foi possível carregar os pedidos.</p>;

  const toDeliver = data.filter(
    (o) =>
      o.payment_status === "approved" &&
      o.delivery_status !== "entregue" &&
      o.delivery_status !== "cancelado",
  ).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Pedidos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {toDeliver} pedido(s) pago(s) aguardando entrega.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-64"
            placeholder="Buscar por código, nome, e-mail ou RA"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="pagos">Pagos</option>
            <option value="todos">Todos (inclui não pagos)</option>
          </select>
        </div>
      </div>
      {!rows.length && <p className="text-muted-foreground">Nenhum pedido encontrado.</p>}
      <ul className="space-y-3">
        {rows.map((o) => (
          <li key={o.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono font-semibold">{o.order_code}</span>
              <span>
                {o.product_name}
                {o.size ? ` (${o.size})` : ""}
              </span>
              <span className="font-semibold">
                {brl(o.amount == null ? null : Number(o.amount))}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                {o.amount ? (PAYMENT[o.payment_status] ?? o.payment_status) : "Sem pagamento"}
              </span>
              <span className="ml-auto text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                {o.full_name}
                {o.ra ? ` · RA ${o.ra}` : ""} · {o.phone} · {o.email}
              </p>
              <label className="flex items-center gap-2">
                Entrega:
                <select
                  className="h-8 rounded-md border border-input bg-background px-2"
                  value={o.delivery_status}
                  onChange={(e) => setDelivery(o.id, e.target.value)}
                >
                  {DELIVERY.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
