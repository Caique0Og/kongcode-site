// Integração com o Mercado Pago (Checkout Pro) via API REST.
// SOMENTE servidor: usa MP_ACCESS_TOKEN, que nunca pode ir para o navegador.
// Importe dinamicamente dentro de handlers: await import("@/lib/mercadopago.server").

const MP_API = "https://api.mercadopago.com";

export type PaymentStatus =
  "pending" | "in_process" | "approved" | "rejected" | "cancelled" | "refunded";

function accessToken() {
  const token = process.env["MP_ACCESS_TOKEN"];
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return token;
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago ${path} falhou [${res.status}]: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** URL pública do site. SITE_URL tem prioridade sobre a origem da requisição. */
export function siteUrl(requestOrigin: string) {
  return (process.env["SITE_URL"] || requestOrigin).replace(/\/+$/, "");
}

export async function createPreference(opts: {
  orderId: string;
  title: string;
  amount: number;
  payer: { name: string; email: string };
  baseUrl: string;
}) {
  const returnUrl = `${opts.baseUrl}/pagamento/${opts.orderId}`;
  const isPublicHttps = opts.baseUrl.startsWith("https://");
  const body = {
    items: [
      {
        id: opts.orderId,
        title: opts.title.slice(0, 250),
        quantity: 1,
        currency_id: "BRL",
        unit_price: Math.round(opts.amount * 100) / 100,
      },
    ],
    payer: { name: opts.payer.name, email: opts.payer.email },
    external_reference: opts.orderId,
    statement_descriptor: "KONGCODE",
    back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
    // O Mercado Pago só aceita auto_return e webhook em URLs públicas (https).
    ...(isPublicHttps
      ? {
          auto_return: "approved",
          notification_url: `${opts.baseUrl}/api/mercadopago/webhook`,
        }
      : {}),
  };
  return mpFetch<{ id: string; init_point: string; sandbox_init_point: string }>(
    "/checkout/preferences",
    {
      method: "POST",
      headers: { "X-Idempotency-Key": `pref-${opts.orderId}-${Date.now()}` },
      body: JSON.stringify(body),
    },
  );
}

export type MpPayment = {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  date_approved: string | null;
};

export function getPayment(paymentId: string) {
  if (!/^\d{1,30}$/.test(paymentId)) throw new Error("payment_id inválido");
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`);
}

export function normalizeStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
    case "rejected":
    case "cancelled":
    case "refunded":
    case "in_process":
      return status;
    case "authorized":
    case "in_mediation":
      return "in_process";
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * Consulta o pagamento no Mercado Pago e grava o status no pedido.
 * Nunca confiamos no status vindo da URL ou do corpo do webhook: sempre
 * buscamos o pagamento direto na API e conferimos o pedido e o valor.
 */
export async function syncPayment(paymentId: string, expectedOrderId?: string) {
  const payment = await getPayment(paymentId);
  const orderId = payment.external_reference;
  if (!orderId || (expectedOrderId && orderId !== expectedOrderId)) {
    throw new Error("Pagamento não corresponde ao pedido.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error } = await supabaseAdmin
    .from("product_orders")
    .select("id, amount, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Pedido não encontrado.");

  let status = normalizeStatus(payment.status);
  if (
    status === "approved" &&
    order.amount != null &&
    Math.abs(Number(order.amount) - payment.transaction_amount) > 0.009
  ) {
    console.error(`Valor divergente no pedido ${orderId}: ${payment.transaction_amount}`);
    status = "in_process";
  }
  // Um pedido aprovado só muda se o pagamento for estornado/cancelado.
  if (order.payment_status === "approved" && status !== "refunded" && status !== "cancelled") {
    return { orderId, status: order.payment_status as PaymentStatus };
  }

  const { error: upErr } = await supabaseAdmin
    .from("product_orders")
    .update({
      payment_status: status,
      mp_payment_id: String(payment.id),
      paid_at: status === "approved" ? (payment.date_approved ?? new Date().toISOString()) : null,
    })
    .eq("id", orderId);
  if (upErr) throw upErr;
  return { orderId, status };
}

/**
 * Valida o cabeçalho x-signature do webhook (opcional: só se MP_WEBHOOK_SECRET
 * estiver definido). Ver "Notificações > Webhooks" no painel do Mercado Pago.
 */
export async function verifyWebhookSignature(request: Request, dataId: string) {
  const secret = process.env["MP_WEBHOOK_SECRET"];
  if (!secret) return true;
  const sig = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    sig.split(",").map((p) => {
      const [k = "", v = ""] = p.split("=");
      return [k.trim(), v.trim()];
    }),
  );
  if (!parts["ts"] || !parts["v1"]) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts["ts"]};`;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const { Buffer } = await import("node:buffer");
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts["v1"]);
  return a.length === b.length && timingSafeEqual(a, b);
}
