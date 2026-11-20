import { createFileRoute } from "@tanstack/react-router";

// Webhook do Mercado Pago: configure no painel a URL
// https://<seu-dominio>/api/mercadopago/webhook com o evento "Pagamentos".
export const Route = createFileRoute("/api/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = (await request.json().catch(() => ({}))) as {
          type?: string;
          action?: string;
          data?: { id?: string | number };
        };
        const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? "");
        if (type !== "payment" || !/^\d{1,30}$/.test(dataId)) {
          return new Response("ignored", { status: 200 });
        }
        const mp = await import("@/lib/mercadopago.server");
        if (!(await mp.verifyWebhookSignature(request, dataId))) {
          return new Response("invalid signature", { status: 401 });
        }
        try {
          await mp.syncPayment(dataId);
          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("[mercadopago webhook]", e);
          // 500 faz o Mercado Pago tentar de novo mais tarde.
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
