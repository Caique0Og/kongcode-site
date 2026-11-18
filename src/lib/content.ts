import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Club = Tables<"clubs">;
export type Product = Tables<"products">;
export type EventItem = Tables<"events">;

export const GENERAL_GROUP_URL = "https://chat.whatsapp.com/Cai4v0GZopI85frmnCbclm";

export const clubsQuery = queryOptions({
  queryKey: ["clubs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date")
      .order("event_time");
    if (error) throw error;
    return data;
  },
});

export async function uploadImage(file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}

export const formatPrice = (v: number | null) =>
  v == null ? null : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function formatDate(d: string) {
  const [y = 0, m = 1, day = 1] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
export function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
