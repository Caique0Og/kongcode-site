import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Usuário logado (Supabase Auth). `undefined` enquanto carrega, `null` se não há login.
 * Só roda no navegador: no SSR fica em `undefined`.
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return user;
}

/** Nome salvo no cadastro (user_metadata.full_name), se houver. */
export function userFullName(user: User | null | undefined): string {
  const n = user?.user_metadata?.["full_name"];
  return typeof n === "string" ? n : "";
}
