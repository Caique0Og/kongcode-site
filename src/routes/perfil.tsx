import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, userFullName } from "@/hooks/use-auth-user";
import { formatPrice } from "@/lib/content";
import { getMyOrders, type MyOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu perfil | KongCode" },
      { name: "description", content: "Seus dados e seus pedidos no KongCode." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "Aguardando pagamento", tone: "border-border text-muted-foreground" },
  in_process: { label: "Pagamento em análise", tone: "border-primary/50 text-primary" },
  approved: { label: "Pago", tone: "border-emerald-500/50 text-emerald-500" },
  rejected: { label: "Pagamento recusado", tone: "border-destructive/50 text-destructive" },
  cancelled: { label: "Cancelado", tone: "border-destructive/50 text-destructive" },
  refunded: { label: "Estornado", tone: "border-border text-muted-foreground" },
};

function ProfilePage() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrders = useServerFn(getMyOrders);

  useEffect(() => {
    if (user === null)
      void navigate({ to: "/entrar", search: { redirect: "/perfil" }, replace: true });
  }, [user, navigate]);

  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  if (!user) {
    return <main className="site-width min-h-[60vh] py-16 text-muted-foreground">Carregando…</main>;
  }

  const name = userFullName(user);

  return (
    <main className="site-width min-h-[70vh] py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">MINHA CONTA</p>
          <h1 className="page-heading mt-3">
            {name ? name.split(/\s+/)[0]!.toUpperCase() : "PERFIL"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {name && <>{name} · </>}
            {user.email}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await qc.cancelQueries();
            qc.removeQueries({ queryKey: ["my-orders"] });
            await supabase.auth.signOut();
            toast.success("Você saiu da sua conta.");
          }}
        >
          <LogOut />
          Sair
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">MEUS PEDIDOS</h2>
        {isLoading ? (
          <p className="mt-6 text-muted-foreground">Carregando pedidos…</p>
        ) : isError ? (
          <p className="mt-6 text-destructive">
            Não foi possível carregar seus pedidos. Tente de novo.
          </p>
        ) : !orders || orders.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border p-6 text-sm text-muted-foreground">
            <p>Você ainda não fez nenhum pedido.</p>
            <Button asChild className="mt-4">
              <Link to="/roupas">Ver roupas</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function OrderRow({ order }: { order: MyOrder }) {
  const st = STATUS_LABEL[order.status] ?? STATUS_LABEL["pending"]!;
  const date = new Date(order.createdAt).toLocaleDateString("pt-BR");
  const canPay =
    order.amount != null && ["pending", "rejected", "cancelled"].includes(order.status);
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex min-w-0 items-start gap-4">
        <Package className="mt-1 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold tracking-wider">{order.code}</p>
          <p className="mt-1 font-semibold">
            {order.productName} <span className="text-muted-foreground">· {order.size}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pedido em {date}
            {order.amount != null && <> · {formatPrice(order.amount)}</>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${st.tone}`}>
          {st.label}
        </span>
        <Button asChild size="sm" variant={canPay ? "default" : "outline"}>
          <Link to="/pagamento/$orderId" params={{ orderId: order.id }}>
            {canPay ? "Pagar / ver" : "Ver pedido"}
          </Link>
        </Button>
      </div>
    </li>
  );
}
