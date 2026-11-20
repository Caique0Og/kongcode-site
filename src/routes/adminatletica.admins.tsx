import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adminatletica/admins")({
  component: Admins,
});

function Admins() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin_emails"],
    queryFn: async () => {
      const { data: owner } = await supabase.rpc("is_site_owner");
      if (!owner) return null;
      const { data, error } = await supabase
        .from("admin_emails")
        .select("email, created_at")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (data === null)
    return (
      <p className="text-muted-foreground">Esta página é exclusiva do presidente da atlética.</p>
    );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Digite um e-mail válido.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("admin_emails").insert({ email: value });
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "Esse e-mail já é admin." : "Não foi possível adicionar.",
      );
      return;
    }
    setEmail("");
    toast.success("Admin adicionado.");
    qc.invalidateQueries({ queryKey: ["admin_emails"] });
  }

  async function remove(value: string) {
    if (!confirm(`Tirar o acesso de admin de ${value}?`)) return;
    const { error } = await supabase.from("admin_emails").delete().eq("email", value);
    if (error) {
      toast.error(
        error.message.includes("dono do site")
          ? "O dono do site não pode ser removido."
          : "Não foi possível remover.",
      );
      return;
    }
    toast.success("Acesso removido.");
    qc.invalidateQueries({ queryKey: ["admin_emails"] });
  }

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Admins do painel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem estiver nesta lista entra no painel com a conta do site (mesmo e-mail). Se a pessoa
          ainda não tem conta, o acesso vale assim que ela criar uma em "Entrar".
        </p>
      </div>
      <form onSubmit={add} className="flex gap-2">
        <Input
          type="email"
          placeholder="email@impacta.edu.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          <UserPlus />
          Adicionar
        </Button>
      </form>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {data?.map((a) => (
          <li key={a.email} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{a.email}</p>
              <p className="text-xs text-muted-foreground">
                desde {new Date(a.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remover ${a.email}`}
              onClick={() => remove(a.email)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
