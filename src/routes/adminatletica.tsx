import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adminatletica")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel | KongCode" },
      { name: "description", content: "Área administrativa do KongCode." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel | KongCode" },
      { property: "og:description", content: "Área administrativa do KongCode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

async function checkAdmin() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return !!data;
}

function AdminLayout() {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [isOwner, setIsOwner] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    checkAdmin().then((ok) => setState(ok ? "in" : "out"));
    supabase.rpc("is_site_owner").then(({ data }) => setIsOwner(!!data));
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") {
        setState("out");
        setIsOwner(false);
      }
      if (ev === "SIGNED_IN") supabase.rpc("is_site_owner").then(({ data }) => setIsOwner(!!data));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "loading")
    return <main className="site-width min-h-[60vh] py-16 text-muted-foreground">Carregando…</main>;
  if (state === "out") return <Login onDone={() => setState("in")} />;

  const tabs = [
    { to: "/adminatletica/clubes", label: "Clubes" },
    { to: "/adminatletica/roupas", label: "Roupas" },
    { to: "/adminatletica/eventos", label: "Eventos" },
    { to: "/adminatletica/pedidos", label: "Pedidos" },
    ...(isOwner
      ? ([
          { to: "/adminatletica/admins", label: "Admins" },
          { to: "/adminatletica/historico", label: "Histórico" },
        ] as const)
      : []),
  ];
  return (
    <main className="site-width min-h-[70vh] py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">ÁREA ADMINISTRATIVA</p>
          <h1 className="page-heading mt-3">PAINEL</h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await qc.cancelQueries();
            await supabase.auth.signOut();
            toast.success("Você saiu do painel.");
          }}
        >
          <LogOut />
          Sair
        </Button>
      </div>
      <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="border-b-2 border-transparent px-4 py-3 font-semibold text-muted-foreground"
            activeProps={{ className: "!border-primary !text-foreground" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </main>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Preencha usuário e senha.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      return setError("Usuário ou senha incorretos.");
    }
    const ok = await checkAdmin();
    setBusy(false);
    if (!ok) {
      await supabase.auth.signOut();
      return setError("Esta conta não tem acesso ao painel.");
    }
    toast.success("Bem-vindo ao painel!");
    onDone();
  }
  return (
    <main className="site-width flex min-h-[70vh] items-center justify-center py-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6 md:p-8"
      >
        <div>
          <p className="eyebrow text-primary">ÁREA ADMINISTRATIVA</p>
          <h1 className="mt-3 font-display text-4xl font-bold">ENTRAR</h1>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Usuário (e-mail)</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
