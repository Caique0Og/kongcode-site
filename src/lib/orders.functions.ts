import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderSchema } from "./order-schema";

/** Cria o pedido. Exige login: o pedido fica vinculado à conta e aparece em "Meus pedidos". */
export const submitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accountEmail =
      typeof context.claims.email === "string" && context.claims.email
        ? context.claims.email
        : data.email;
    // O preço vem sempre do banco, nunca do navegador.
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price, sizes")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr) console.error(pErr);
    if (!product) throw new Error("Produto não encontrado.");
    if (product.sizes.length > 0 && !product.sizes.includes(data.size)) {
      throw new Error("Tamanho indisponível.");
    }
    const amount = product.price == null ? null : Number(product.price);
    const row = {
      product_id: product.id,
      product_name: product.name,
      size: data.size,
      full_name: data.fullName,
      ra: data.ra || null,
      phone: data.phone,
      email: accountEmail,
      amount,
      user_id: context.userId,
    };
    // O código do pedido (KC-XXXXXXXX) é gerado pelo banco; em caso raro de
    // código repetido (violação de unicidade), tenta de novo.
    let order: { id: string; order_code: string } | null = null;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const res = await supabaseAdmin
        .from("product_orders")
        .insert(row)
        .select("id, order_code")
        .single();
      if (res.data) order = res.data;
      else if (res.error?.code !== "23505") {
        console.error(res.error);
        break;
      }
    }
    if (!order) throw new Error("Não foi possível registrar o pedido.");
    const needsPayment = amount != null && amount > 0;
    // Pedido sem pagamento já vai para a planilha; os pagos vão quando o pagamento for aprovado.
    if (!needsPayment) {
      const { syncOrderToSheet } = await import("./google-sheets.server");
      await syncOrderToSheet(order.id);
    }
    return {
      ok: true,
      orderId: order.id,
      orderCode: order.order_code,
      needsPayment,
    };
  });

export type MyOrder = {
  id: string;
  code: string;
  productName: string;
  size: string;
  amount: number | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

/** Pedidos da conta logada, do mais recente para o mais antigo. */
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrder[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("product_orders")
      .select("id, order_code, product_name, size, amount, payment_status, created_at, paid_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      throw new Error("Não foi possível carregar seus pedidos.");
    }
    return (data ?? []).map((o) => ({
      id: o.id,
      code: o.order_code,
      productName: o.product_name,
      size: o.size,
      amount: o.amount == null ? null : Number(o.amount),
      status: o.payment_status,
      createdAt: o.created_at,
      paidAt: o.paid_at,
    }));
  });

const orderIdSchema = z.object({ orderId: z.string().uuid() });

/** Dados mínimos do pedido para a tela de pagamento (quem tem o link do pedido). */
export const getOrderForPayment = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("product_orders")
      .select(
        "id, order_code, product_id, product_name, size, full_name, amount, payment_status, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) console.error(error);
    if (!order) return null;
    let image: string | null = null;
    if (order.product_id) {
      const { data: p } = await supabaseAdmin
        .from("products")
        .select("images")
        .eq("id", order.product_id)
        .maybeSingle();
      image = p?.images[0] ?? null;
    }
    return {
      id: order.id,
      code: order.order_code,
      productName: order.product_name,
      size: order.size,
      firstName: order.full_name.split(/\s+/)[0] ?? "",
      amount: order.amount == null ? null : Number(order.amount),
      status: order.payment_status,
      image,
    };
  });

/** Cria a preferência no Mercado Pago e devolve o link do checkout. */
export const startPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const mp = await import("./mercadopago.server");
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { data: order, error } = await supabaseAdmin
      .from("product_orders")
      .select("id, product_name, size, full_name, email, amount, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) console.error(error);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.payment_status === "approved") throw new Error("Este pedido já foi pago.");
    if (order.amount == null || Number(order.amount) <= 0) {
      throw new Error("Este pedido não tem valor para pagamento.");
    }
    const pref = await mp.createPreference({
      orderId: order.id,
      title: `${order.product_name} (${order.size})`,
      amount: Number(order.amount),
      payer: { name: order.full_name, email: order.email },
      baseUrl: mp.siteUrl(getRequestUrl().origin),
    });
    await supabaseAdmin
      .from("product_orders")
      .update({ mp_preference_id: pref.id })
      .eq("id", order.id);
    return { url: pref.init_point };
  });

/** Chamado na volta do checkout: confere o pagamento direto na API do Mercado Pago. */
export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid(), paymentId: z.string().regex(/^\d{1,30}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const mp = await import("./mercadopago.server");
    return mp.syncPayment(data.paymentId, data.orderId);
  });

/**
 * Gera (ou reaproveita) a cobrança Pix do pedido e devolve o QR code para
 * exibir na própria página. Se já existe um Pix pendente e válido, devolve o mesmo.
 */
export const startPixPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const mp = await import("./mercadopago.server");
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { data: order, error } = await supabaseAdmin
      .from("product_orders")
      .select("id, product_name, size, full_name, email, amount, payment_status, mp_payment_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) console.error(error);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.payment_status === "approved") throw new Error("Este pedido já foi pago.");
    if (order.amount == null || Number(order.amount) <= 0) {
      throw new Error("Este pedido não tem valor para pagamento.");
    }

    if (order.mp_payment_id) {
      const existing = await mp
        .getPayment(order.mp_payment_id)
        .then(mp.toPixCharge)
        .catch(() => null);
      if (mp.isPixUsable(existing)) return existing;
    }

    const charge = await mp.createPixPayment({
      orderId: order.id,
      description: `${order.product_name} (${order.size})`,
      amount: Number(order.amount),
      payer: { name: order.full_name, email: order.email },
      baseUrl: mp.siteUrl(getRequestUrl().origin),
    });
    const { error: upErr } = await supabaseAdmin
      .from("product_orders")
      .update({ mp_payment_id: charge.paymentId, payment_status: "pending" })
      .eq("id", order.id)
      .neq("payment_status", "approved");
    if (upErr) console.error(upErr);
    return charge;
  });

/**
 * Consulta o último pagamento do pedido no Mercado Pago e atualiza o status.
 * Usado enquanto o QR code do Pix está na tela (o webhook também atualiza).
 */
export const refreshPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("product_orders")
      .select("mp_payment_id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado.");
    if (!order.mp_payment_id || order.payment_status === "approved") {
      return { status: order.payment_status };
    }
    const mp = await import("./mercadopago.server");
    const res = await mp.syncPayment(order.mp_payment_id, data.orderId);
    return { status: res.status };
  });
