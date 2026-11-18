import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { orderSchema } from "./order-schema";

// Google Sheets: quando a conexão for criada, defina GOOGLE_SHEETS_SPREADSHEET_ID
// (e opcionalmente GOOGLE_SHEETS_RANGE). Sem isso, o pedido fica salvo só no banco.
async function appendToSheet(row: string[]) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
  const sheetId = process.env["GOOGLE_SHEETS_SPREADSHEET_ID"];
  if (!lovableKey || !sheetsKey || !sheetId) return false;
  const range = process.env["GOOGLE_SHEETS_RANGE"] || "Pedidos!A:H";
  const res = await fetch(
    `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    },
  );
  if (!res.ok) {
    console.error(`Sheets append failed [${res.status}]: ${await res.text()}`);
    return false;
  }
  return true;
}

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { error } = await sb.from("product_orders").insert({
      product_id: data.productId,
      product_name: data.productName,
      size: data.size,
      full_name: data.fullName,
      ra: data.ra || null,
      phone: data.phone,
      email: data.email,
    });
    if (error) {
      console.error(error);
      throw new Error("Não foi possível registrar o pedido.");
    }
    await appendToSheet([
      new Date().toISOString(),
      data.productName,
      data.size,
      data.fullName,
      data.ra || "",
      data.phone,
      data.email,
    ]).catch((e) => console.error(e));
    return { ok: true };
  });
