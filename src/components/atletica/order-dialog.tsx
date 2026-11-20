import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orderSchema } from "@/lib/order-schema";
import { submitOrder } from "@/lib/orders.functions";
import type { Product } from "@/lib/content";

export function OrderDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const send = useServerFn(submitOrder);
  const navigate = useNavigate();
  const [f, setF] = useState({ fullName: "", ra: "", phone: "", email: "", size: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const parsed = orderSchema.safeParse({
      ...f,
      productId: product.id,
      productName: product.name,
    });
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? "Confira os dados.");
    setBusy(true);
    try {
      const res = await send({ data: parsed.data });
      setF({ fullName: "", ra: "", phone: "", email: "", size: "" });
      onOpenChange(false);
      if (res.needsPayment) {
        await navigate({ to: "/pagamento/$orderId", params: { orderId: res.orderId } });
      } else {
        toast.success("Pedido enviado! Entraremos em contato.");
      }
    } catch {
      setErr("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Comprar: {product.name}</DialogTitle>
          <DialogDescription>Preencha seus dados e siga para o pagamento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="o-name">Nome completo</Label>
            <Input id="o-name" maxLength={120} value={f.fullName} onChange={set("fullName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-ra">RA Impacta (opcional)</Label>
            <Input
              id="o-ra"
              inputMode="numeric"
              maxLength={20}
              value={f.ra}
              onChange={(e) => setF({ ...f, ra: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-phone">Número de contato</Label>
            <Input id="o-phone" type="tel" maxLength={25} value={f.phone} onChange={set("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-email">E-mail</Label>
            <Input
              id="o-email"
              type="email"
              maxLength={255}
              value={f.email}
              onChange={set("email")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-size">Tamanho</Label>
            {product.sizes.length === 0 ? (
              <Input
                id="o-size"
                placeholder="Ex.: P, M, G, GG"
                maxLength={30}
                value={f.size}
                onChange={set("size")}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setF({ ...f, size: s })}
                    className={`rounded border px-3 py-1 text-sm ${f.size === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? "Enviando…"
              : product.price != null
                ? "Continuar para pagamento"
                : "Enviar pedido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
