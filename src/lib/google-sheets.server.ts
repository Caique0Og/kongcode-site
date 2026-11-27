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
  pending: "Aguardando pagamento",
  in_process: "Em análise",
  rejected: "Pagamento não concluído",
  cancelled: "Pagamento não concluído",
  refunded: "Estornado",
};

function statusLabel(order: Pick<SheetOrder, "amount" | "payment_status">) {
  if (order.amount == null || Number(order.amount) <= 0) return "Sem pagamento";
  return STATUS_LABEL[order.payment_status] ?? order.payment_status;
}

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
    statusLabel(order),
  ]);
}

/** Aba e última coluna (a do status) a partir de GOOGLE_SHEETS_RANGE, ex.: 'Pedidos do site'!A:L. */
function sheetLayout() {
  const range = process.env["GOOGLE_SHEETS_RANGE"] || "'Pedidos do site'!A:L";
  const [tab = "", cols = "A:L"] = range.split("!");
  const statusCol = cols.split(":")[1]?.replace(/\d+/g, "") || "L";
  return { tab, statusCol };
}

/**
 * Troca o status de um pedido que já está na planilha (procura o código na coluna B).
 * Retorna false se não achar a linha ou se falhar.
 */
export async function updateOrderStatusInSheet(order: SheetOrder): Promise<boolean> {
  const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
  const privateKey = process.env["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"];
  const sheetId = process.env["GOOGLE_SHEETS_SPREADSHEET_ID"];
  if (!email || !privateKey || !sheetId) return false;
  const { tab, statusCol } = sheetLayout();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/`;
  try {
    const token = await getAccessToken(email, privateKey);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const res = await fetch(base + encodeURIComponent(`${tab}!B:B`), { headers });
    if (!res.ok) throw new Error(`leitura falhou [${res.status}]: ${await res.text()}`);
    const codes = ((await res.json()) as { values?: string[][] }).values ?? [];
    const index = codes.findIndex((r) => r[0] === order.order_code);
    if (index < 0) return false;
    const cell = `${tab}!${statusCol}${index + 1}`;
    const put = await fetch(base + encodeURIComponent(cell) + "?valueInputOption=RAW", {
      method: "PUT",
      headers,
      body: JSON.stringify({ values: [[statusLabel(order)]] }),
    });
    if (!put.ok) throw new Error(`atualização falhou [${put.status}]: ${await put.text()}`);
    return true;
  } catch (e) {
    console.error("[sheets] status", order.order_code, e);
    return false;
  }
}

function sheetsConfigured() {
  return Boolean(
    process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"] &&
    process.env["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"] &&
    process.env["GOOGLE_SHEETS_SPREADSHEET_ID"],
  );
}

const ORDER_FIELDS =
  "order_code, product_name, size, color, full_name, ra, phone, email, amount, payment_status";

/**
 * Mantém o pedido na planilha: na primeira vez acrescenta a linha (com o status
 * atual, ex. "Aguardando pagamento"); depois só atualiza a coluna de status
 * (Aprovado, Pagamento não concluído...). sheet_synced = a linha já existe.
 * Só quem consegue marcar sheet_synced acrescenta, evitando linha duplicada
 * quando webhook e página chegam juntos; se falhar, desmarca para tentar de novo.
 * Nunca lança erro: a planilha não pode atrapalhar o pedido.
 */
export async function syncOrderToSheet(orderId: string): Promise<void> {
  if (!sheetsConfigured()) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claimed, error } = await supabaseAdmin
      .from("product_orders")
      .update({ sheet_synced: true })
      .eq("id", orderId)
      .eq("sheet_synced", false)
      .select(ORDER_FIELDS)
      .maybeSingle();
    if (error) throw error;
    if (claimed) {
      if (!(await appendOrderToSheet(claimed))) {
        await supabaseAdmin
          .from("product_orders")
          .update({ sheet_synced: false })
          .eq("id", orderId);
      }
      return;
    }
    // Já está na planilha: só atualiza o status.
    const { data: order } = await supabaseAdmin
      .from("product_orders")
      .select(ORDER_FIELDS)
      .eq("id", orderId)
      .maybeSingle();
    if (order && !(await updateOrderStatusInSheet(order))) {
      // Linha não encontrada (apagada à mão?): acrescenta de novo.
      await appendOrderToSheet(order);
    }
  } catch (e) {
    console.error("[sheets] pedido", orderId, e);
  }
}
