import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";

const searchSchema = z.object({
  // Só caminhos internos (evita redirecionar para outro site).
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/entrar")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar | KongCode" },
      {
        name: "description",
        content: "Entre na sua conta KongCode para comprar e ver seus pedidos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const user = useAuthUser();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const target = redirect ?? "/perfil";

  useEffect(() => {
    if (user) void navigate({ to: target, replace: true });
  }, [user, target, navigate]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const email = f.email.trim();
    if (!z.string().email().safeParse(email).success) return setError("Informe um e-mail válido.");
    if (f.password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
        if (error) {
          return setError(
            /confirm/i.test(error.message)
              ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
              : "E-mail ou senha incorretos.",
          );
        }
        toast.success("Você entrou na sua conta.");
      } else {
        const fullName = f.fullName.trim();
        if (fullName.length < 3) return setError("Informe seu nome completo.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password: f.password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/perfil`,
          },
        });
        if (error) {
          return setError(
            /already|registered/i.test(error.message)
              ? "Já existe uma conta com este e-mail. Entre com sua senha."
              : "Não foi possível criar a conta. Tente novamente.",
          );
        }
        if (!data.session) {
          setMode("login");
          return setInfo(
            "Conta criada! Enviamos um link para o seu e-mail. Confirme e depois entre.",
          );
        }
        toast.success("Conta criada!");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="site-width flex min-h-[70vh] items-center justify-center py-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6 md:p-8"
      >
        <div>
          <p className="eyebrow text-primary">MINHA CONTA</p>
          <h1 className="mt-3 font-display text-4xl font-bold">
            {mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Com a conta você compra no site e acompanha seus pedidos quando quiser.
          </p>
        </div>
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="a-name">Nome completo</Label>
            <Input
              id="a-name"
              autoComplete="name"
              maxLength={120}
              value={f.fullName}
              onChange={set("fullName")}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="a-email">E-mail</Label>
          <Input
            id="a-email"
            type="email"
            autoComplete="email"
            maxLength={255}
            value={f.email}
            onChange={set("email")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-password">Senha</Label>
          <Input
            id="a-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={f.password}
            onChange={set("password")}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
        >
          {mode === "login" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </form>
    </main>
  );
}
