import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/content";
import {
  confirmPayment,
  getOrderForPayment,
  refreshPaymentStatus,
  startPayment,
  startPixPayment,
} from "@/lib/orders.functions";

const searchSchema = z.object({
  payment_id: z.union([z.string(), z.number()]).optional().catch(undefined),
  collection_id: z.union([z.string(), z.number()]).optional().catch(undefined),
});

export const Route = createFileRoute("/pagamento/$orderId")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Pagamento | KongCode" }, { name: "robots", content: "noindex" }],
  }),
  component: PaymentPage,
});

const STATUS: Record<string, { label: string; text: string; icon: typeof Clock; tone: string }> = {
  pending: {
    label: "Aguardando pagamento",
    text: "Seu pedido foi registrado. Finalize o pagamento para garantir sua peça.",
    icon: Clock,
    tone: "text-muted-foreground",
  },
  in_process: {
    label: "Pagamento em análise",
    text: "O Mercado Pago está processando o pagamento. Assim que for aprovado, esta página atualiza.",
    icon: Loader2,
    tone: "text-primary",
  },
  approved: {
    label: "Pagamento aprovado",
    text: "Tudo certo! A atlética vai entrar em contato para combinar a entrega.",
    icon: CheckCircle2,
    tone: "text-emerald-500",
  },
  rejected: {
    label: "Pagamento recusado",
    text: "O pagamento não foi aprovado. Você pode tentar de novo com outra forma de pagamento.",
    icon: XCircle,
    tone: "text-destructive",
  },
  cancelled: {
    label: "Pagamento cancelado",
    text: "O pagamento foi cancelado. Você pode tentar de novo.",
    icon: XCircle,
    tone: "text-destructive",
  },
  refunded: {
    label: "Pagamento estornado",
    text: "Este pagamento foi devolvido. Fale com a atlética se tiver dúvidas.",
    icon: XCircle,
    tone: "text-muted-foreground",
  },
};

function PaymentPage() {
  const { orderId } = Route.useParams();
  const search = Route.useSearch();
  const paymentId = search.payment_id ?? search.collection_id;
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getOrderForPayment);
  const start = useServerFn(startPayment);
  const confirm = useServerFn(confirmPayment);
  const startPix = useServerFn(startPixPayment);
  const refresh = useServerFn(refreshPaymentStatus);
  const [busy, setBusy] = useState<"" | "pix" | "card">("");
  const [err, setErr] = useState("");
  const [pix, setPix] = useState<Pix | null>(null);
  const confirmed = useRef(false);

  const queryKey = ["payment-order", orderId];
  const { data: order, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchOrder({ data: { orderId } }),
    // Enquanto o pagamento estiver em análise, consulta de novo a cada 5s.
    refetchInterval: (q) => (q.state.data?.status === "in_process" ? 5000 : false),
  });

  // Volta do Mercado Pago: confirma o pagamento direto na API (não confia na URL).
  useEffect(() => {
    const id = paymentId == null ? "" : String(paymentId);
    if (!/^\d+$/.test(id) || confirmed.current) return;
    confirmed.current = true;
    confirm({ data: { orderId, paymentId: id } })
      .catch((e) => console.error(e))
      .finally(() => qc.invalidateQueries({ queryKey }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, orderId]);

  // Com o QR code do Pix na tela, confere o pagamento a cada 5s.
  const waitingPix = pix != null && order?.status !== "approved";
  useEffect(() => {
    if (!waitingPix) return;
    const t = setInterval(() => {
      refresh({ data: { orderId } })
        .then((r) => {
          if (r.status !== "pending") qc.invalidateQueries({ queryKey });
        })
        .catch((e) => console.error(e));
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPix, orderId]);

  async function pay() {
    setErr("");
    setBusy("card");
    try {
      const { url } = await start({ data: { orderId } });
      window.location.href = url;
    } catch {
      setErr("Não foi possível abrir o pagamento. Tente novamente em instantes.");
      setBusy("");
    }
  }

  async function payPix() {
    setErr("");
    setBusy("pix");
    try {
      setPix(await startPix({ data: { orderId } }));
      qc.invalidateQueries({ queryKey });
    } catch {
      setErr("Não foi possível gerar o Pix. Tente novamente em instantes.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="site-width min-h-[70vh] py-12 md:py-16">
      <Button asChild variant="ghost" className="mb-10 pl-0 text-muted-foreground">
        <Link to="/roupas">
          <ArrowLeft />
          Voltar para roupas
        </Link>
      </Button>
      <p className="eyebrow text-primary">Pagamento</p>
      <h1 className="page-heading mt-5">Finalize seu pedido</h1>

      {isLoading ? (
        <p className="mt-12 text-sm text-muted-foreground">Carregando…</p>
      ) : !order ? (
        <p className="mt-12 text-muted-foreground">
          Pedido não encontrado. Confira o link ou faça um novo pedido na página de roupas.
        </p>
      ) : (
        <OrderSummary
          order={order}
          busy={busy}
          err={err}
          pix={order.status === "approved" ? null : pix}
          onPay={pay}
          onPayPix={payPix}
          onClosePix={() => setPix(null)}
        />
      )}
    </main>
  );
}

type Order = NonNullable<Awaited<ReturnType<typeof getOrderForPayment>>>;
type Pix = Awaited<ReturnType<typeof startPixPayment>>;

function OrderSummary({
  order,
  busy,
  err,
  pix,
  onPay,
  onPayPix,
  onClosePix,
}: {
  order: Order;
  busy: "" | "pix" | "card";
  err: string;
  pix: Pix | null;
  onPay: () => void;
  onPayPix: () => void;
  onClosePix: () => void;
}) {
  const st = STATUS[order.status] ?? STATUS["pending"]!;
  const Icon = st.icon;
  const canPay =
    order.amount != null &&
    order.amount > 0 &&
    ["pending", "rejected", "cancelled"].includes(order.status);

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr]">
      <section className="explore-card">
        {order.image && (
          <div className="aspect-[109/70] overflow-hidden">
            <img src={order.image} alt={order.productName} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="space-y-3 border-t border-border px-5 py-5">
          <p className="eyebrow text-muted-foreground">Resumo do pedido</p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-semibold">{order.productName}</p>
              <p className="text-sm text-muted-foreground">
                {order.color ? `${order.color} · ` : ""}Tamanho {order.size}
              </p>
            </div>
            <p className="font-display text-2xl font-semibold text-primary">
              {formatPrice(order.amount) ?? "—"}
            </p>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatPrice(order.amount) ?? "—"}</span>
          </div>
        </div>
      </section>

      <section className="explore-card flex flex-col gap-5 px-5 py-6">
        <div className={`flex items-center gap-2 font-semibold ${st.tone}`}>
          <Icon className={`size-5 ${order.status === "in_process" ? "animate-spin" : ""}`} />
          {st.label}
        </div>
        <p className="text-sm text-muted-foreground">
          {order.firstName ? `${order.firstName}, ` : ""}
          {st.text.charAt(0).toLowerCase() + st.text.slice(1)}
        </p>

        {canPay && pix && <PixPanel pix={pix} onBack={onClosePix} />}

        {canPay && !pix && (
          <>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button size="lg" className="w-full" disabled={!!busy} onClick={onPayPix}>
              {busy === "pix" ? <Loader2 className="animate-spin" /> : <QrCode />}
              {busy === "pix" ? "Gerando Pix…" : `Pagar ${formatPrice(order.amount)} com Pix`}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              disabled={!!busy}
              onClick={onPay}
            >
              {busy === "card" ? <Loader2 className="animate-spin" /> : <CreditCard />}
              {busy === "card" ? "Abrindo Mercado Pago…" : "Pagar com cartão"}
            </Button>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Pix é pago aqui mesmo. Cartão abre o ambiente seguro do Mercado Pago.
            </p>
          </>
        )}

        {order.amount == null && (
          <p className="text-sm text-muted-foreground">
            Esta peça ainda não tem preço definido. A atlética vai entrar em contato.
          </p>
        )}

        <p className="mt-auto text-xs text-muted-foreground">
          Pedido <span className="font-mono font-semibold text-foreground">{order.code}</span>. Você
          acompanha este pedido a qualquer momento em{" "}
          <Link to="/perfil" className="underline underline-offset-4">
            Meu perfil
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function PixPanel({ pix, onBack }: { pix: Pix; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const expires = pix.expiresAt
    ? new Date(pix.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <img
        src={`data:image/png;base64,${pix.qrCodeBase64}`}
        alt="QR code do Pix"
        className="size-56 rounded bg-white p-2"
      />
      <p className="text-sm text-muted-foreground">
        Abra o app do seu banco, escolha pagar com Pix e escaneie o QR code ou use o código abaixo.
      </p>
      <div className="w-full rounded border border-border bg-muted/40 px-3 py-2 text-left font-mono text-xs break-all">
        {pix.qrCode}
      </div>
      <Button className="w-full" onClick={copy}>
        {copied ? <CheckCircle2 /> : <Copy />}
        {copied ? "Código copiado" : "Copiar código Pix"}
      </Button>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Aguardando pagamento{expires ? `, válido até ${expires}` : ""}. Esta página atualiza
        sozinha.
      </p>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onBack}>
        Escolher outra forma de pagamento
      </Button>
    </div>
  );
}
