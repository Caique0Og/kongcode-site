// Envia linhas para uma planilha do Google usando uma conta de serviço.
// Variáveis (todas opcionais; sem elas o envio é ignorado e o pedido fica só no Supabase):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL        e-mail da conta de serviço (…@….iam.gserviceaccount.com)
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  chave privada do JSON ("-----BEGIN PRIVATE KEY-----…"), \n pode vir escapado
//   GOOGLE_SHEETS_SPREADSHEET_ID        id da planilha (trecho do link entre /d/ e /edit)
//   SHEETS_CONTA_DEPOSITO              texto da coluna "Conta Depósito", padrão "Presidente MP"
//   GOOGLE_SHEETS_RANGE                 aba e colunas, padrão "'Pedidos do site'!A:L"
// A planilha precisa estar compartilhada com o e-mail da conta de serviço como Editor.

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { value: string; expiresAt: number } | undefined;

function base64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth falhou [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

/** Acrescenta uma linha na planilha. Retorna false se não estiver configurado ou se falhar. */
export async function appendSheetRow(row: (string | number)[]): Promise<boolean> {
  const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
  const privateKey = process.env["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"];
  const sheetId = process.env["GOOGLE_SHEETS_SPREADSHEET_ID"];
  if (!email || !privateKey || !sheetId) return false;
  const range = process.env["GOOGLE_SHEETS_RANGE"] || "'Pedidos do site'!A:L";
  try {
    const token = await getAccessToken(email, privateKey);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=OVERWRITE`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      },
    );
    if (!res.ok) {
      console.error(`[sheets] append falhou [${res.status}]: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sheets]", e);
    return false;
  }
}

export type SheetOrder = {
  order_code: string;
  product_name: string;
  size: string;
  color: string | null;
  full_name: string;
  ra: string | null;
  phone: string;
  email: string;
  amount: number | string | null;
  payment_status: string;
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  in_process: "Em análise",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
};

/** Colunas: data/hora | código | produto | tamanho | cor/modelo | nome | RA | telefone | e-mail | valor | conta depósito | status */
export function appendOrderToSheet(order: SheetOrder): Promise<boolean> {
  const when = new Date()
    .toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    .replace(",", "");
  return appendSheetRow([
    when,
    order.order_code,
    order.product_name,
    order.size,
    order.color ?? "",
    order.full_name,
    order.ra ?? "",
    // Apóstrofo evita que o Sheets transforme telefone em número.
    `'${order.phone}`,
    order.email,
    order.amount == null ? "" : Number(order.amount),
    process.env["SHEETS_CONTA_DEPOSITO"] || "Presidente MP",
    order.amount == null || Number(order.amount) <= 0
      ? "Sem pagamento"
      : (STATUS_LABEL[order.payment_status] ?? order.payment_status),
  ]);
}

function sheetsConfigured() {
  return Boolean(
    process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"] &&
    process.env["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"] &&
    process.env["GOOGLE_SHEETS_SPREADSHEET_ID"],
  );
}

/**
 * Envia o pedido para a planilha uma única vez. Marca sheet_synced antes de enviar
 * (só quem conseguir marcar envia, evitando linha duplicada quando webhook e
 * consulta da página chegam juntos) e desmarca se o envio falhar, para tentar de novo.
 * Nunca lança erro: a planilha não pode atrapalhar o pedido.
 */
export async function syncOrderToSheet(orderId: string): Promise<void> {
  if (!sheetsConfigured()) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("product_orders")
      .update({ sheet_synced: true })
      .eq("id", orderId)
      .eq("sheet_synced", false)
      .select(
        "order_code, product_name, size, color, full_name, ra, phone, email, amount, payment_status",
      )
      .maybeSingle();
    if (error) throw error;
    if (!order) return;
    if (!(await appendOrderToSheet(order))) {
      await supabaseAdmin.from("product_orders").update({ sheet_synced: false }).eq("id", orderId);
    }
  } catch (e) {
    console.error("[sheets] pedido", orderId, e);
  }
}
