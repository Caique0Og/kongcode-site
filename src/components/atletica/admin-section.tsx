import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/content";

export type Field = {
  key: string;
  label: string;
  required?: boolean;
  type: "text" | "textarea" | "url" | "number" | "date" | "time" | "image" | "images" | "list";
  /** Exemplo mostrado nas caixinhas de um campo "list". */
  placeholder?: string;
};

/** Tira espaços, caixinhas vazias e repetidos de um campo "list". */
export function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = String(item ?? "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/** Uma caixinha por opção, com + para adicionar e x para remover. */
export function ListEditor({
  id,
  values,
  placeholder,
  onChange,
}: {
  id: string;
  values: string[];
  placeholder?: string | undefined;
  onChange: (next: string[]) => void;
}) {
  const items = values.length ? values : [""];
  const update = (i: number, value: string) =>
    onChange(items.map((item, j) => (j === i ? value : item)));
  const add = () => {
    onChange([...items, ""]);
    // Foca a caixinha nova depois que ela aparecer.
    setTimeout(() => document.getElementById(`${id}-${items.length}`)?.focus(), 0);
  };
  const removeAt = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            id={i === 0 ? id : `${id}-${i}`}
            placeholder={placeholder}
            maxLength={60}
            value={item}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          {items.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover opção"
              onClick={() => removeAt(i)}
            >
              <X />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus />
        Adicionar opção
      </Button>
    </div>
  );
}
type Row = Record<string, any> & { id: string };

export function AdminSection({
  table,
  title,
  fields,
  query,
  titleKey,
  imageKey,
  subtitle,
}: {
  table: "clubs" | "products" | "events";
  title: string;
  fields: Field[];
  query: { queryKey: readonly unknown[] } & Record<string, any>;
  titleKey: string;
  imageKey: string;
  subtitle?: (r: any) => string;
}) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(query as any) as { data: Row[]; isLoading: boolean };
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const blank = () =>
    Object.fromEntries(
      fields.map((f) => [f.key, f.type === "images" || f.type === "list" ? [] : ""]),
    );
  const open = (r?: Row) => {
    setErrors({});
    setEditing(r ? { ...r, price: r["price"] ?? "" } : blank());
  };
  const set = (k: string, v: any) => setEditing((e: any) => ({ ...e!, [k]: v }));

  async function onFiles(k: string, files: FileList | null, multi: boolean) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      set(k, multi ? [...(editing![k] || []), ...urls] : urls[0]);
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + e.message);
    }
    setUploading(false);
  }

  async function save() {
    const e: Record<string, string> = {};
    for (const f of fields) {
      const v = f.type === "list" ? cleanList(editing![f.key]) : editing![f.key];
      const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
      if (f.required && empty) e[f.key] = "Campo obrigatório";
      else if (f.type === "url" && !empty && !/^https?:\/\/\S+$/i.test(String(v).trim()))
        e[f.key] = "Informe um link válido (https://...)";
      else if (f.type === "number" && !empty && (isNaN(Number(v)) || Number(v) < 0))
        e[f.key] = "Valor inválido";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload: Record<string, any> = {};
    for (const f of fields) {
      const v = editing![f.key];
      if (f.type === "number") payload[f.key] = v === "" ? null : Number(v);
      else if (f.type === "list") payload[f.key] = cleanList(v);
      else if (f.type === "images") payload[f.key] = v;
      else payload[f.key] = typeof v === "string" ? v.trim() || (f.required ? v : null) : v;
    }
    setSaving(true);
    const res = editing!.id
      ? await supabase
          .from(table)
          .update(payload as never)
          .eq("id", editing!.id)
      : await supabase.from(table).insert(payload as never);
    setSaving(false);
    if (res.error) {
      toast.error("Erro ao salvar: " + res.error.message);
      return;
    }
    toast.success(editing!.id ? "Item atualizado!" : "Item criado!");
    setEditing(null);
    qc.invalidateQueries({ queryKey: query.queryKey });
  }

  async function remove() {
    const { error } = await supabase.from(table).delete().eq("id", toDelete!.id);
    setToDelete(null);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Item excluído.");
    qc.invalidateQueries({ queryKey: query.queryKey });
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-3xl font-semibold">{title}</h2>
        <Button onClick={() => open()}>
          <Plus />
          Adicionar novo
        </Button>
      </div>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum item cadastrado.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
          {data.map((r) => {
            const img = Array.isArray(r[imageKey]) ? r[imageKey][0] : r[imageKey];
            return (
              <li key={r.id} className="flex items-center gap-4 p-3">
                {img ? (
                  <img src={img} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r[titleKey]}</p>
                  {subtitle && (
                    <p className="truncate text-xs text-muted-foreground">{subtitle(r)}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => open(r)}>
                  <Pencil />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setToDelete(r)}>
                  <Trash2 />
                  <span className="hidden sm:inline">Excluir</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Editar" : "Adicionar"} — {title}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {fields.map((f) => {
                const v = editing[f.key];
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key}>
                      {f.label}
                      {f.required && " *"}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={f.key}
                        value={v ?? ""}
                        maxLength={1000}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    ) : f.type === "image" ? (
                      <>
                        {v && (
                          <img
                            src={v}
                            alt="Pré-visualização"
                            className="max-h-40 rounded object-contain"
                          />
                        )}
                        <Input
                          id={f.key}
                          type="file"
                          accept="image/*"
                          onChange={(e) => onFiles(f.key, e.target.files, false)}
                        />
                      </>
                    ) : f.type === "images" ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {(v || []).map((src: string, i: number) => (
                            <div key={src} className="relative">
                              <img
                                src={src}
                                alt={`Imagem ${i + 1}`}
                                className="h-20 w-20 rounded object-cover"
                              />
                              <button
                                type="button"
                                aria-label="Remover imagem"
                                onClick={() =>
                                  set(
                                    f.key,
                                    v.filter((_: string, j: number) => j !== i),
                                  )
                                }
                                className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Input
                          id={f.key}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => onFiles(f.key, e.target.files, true)}
                        />
                      </>
                    ) : f.type === "list" ? (
                      <ListEditor
                        id={f.key}
                        values={v || []}
                        placeholder={f.placeholder}
                        onChange={(next) => set(f.key, next)}
                      />
                    ) : (
                      <Input
                        id={f.key}
                        type={f.type === "number" ? "number" : f.type === "url" ? "url" : f.type}
                        step={f.type === "number" ? "0.01" : undefined}
                        maxLength={300}
                        value={v ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    )}
                    {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
                  </div>
                );
              })}
              {uploading && <p className="text-xs text-muted-foreground">Enviando imagem…</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={saving || uploading}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{toDelete?.[titleKey]}”?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
