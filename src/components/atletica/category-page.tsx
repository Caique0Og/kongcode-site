import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Users,
  Shirt,
  CalendarDays,
  MessageCircle,
  MapPin,
  Clock,
  Ticket,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDialog } from "@/components/atletica/order-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { images } from "@/lib/images";
import {
  clubsQuery,
  productsQuery,
  eventsQuery,
  formatPrice,
  formatDate,
  todayISO,
  type Club,
  type EventItem,
  type Product,
} from "@/lib/content";

const content = {
  clubes: {
    eyebrow: "ENCONTRE SUA GALERA",
    title: "NOSSOS CLUBES",
    description:
      "Conexões que começam na faculdade e vão muito além dela. Clique em um clube para saber mais.",
    icon: Users,
    empty: "Uma nova comunidade vem aí.",
    note: "Os clubes e as informações para participar serão divulgados aqui.",
  },
  roupas: {
    eyebrow: "VISTA O NOSSO ORGULHO",
    title: "ROUPAS DO KONGCODE",
    description: "A identidade do KongCode, dentro e fora do campus.",
    icon: Shirt,
    empty: "A próxima coleção está por vir.",
    note: "As peças, os tamanhos e as informações para comprar serão divulgados aqui.",
  },
  eventos: {
    eyebrow: "VIVA COM O KONGCODE",
    title: "NOSSOS EVENTOS",
    description: "Encontros, torcida e momentos para ficar na memória.",
    icon: CalendarDays,
    empty: "O próximo encontro começa aqui.",
    note: "A programação e as informações para participar serão divulgadas aqui.",
  },
};
type Cat = keyof typeof content;

function Empty({ category }: { category: Cat }) {
  const d = content[category];
  const Icon = d.icon;
  return (
    <div className="empty-state mt-12">
      <Icon className="mx-auto mb-5 size-9 text-primary" />
      <h2 className="text-3xl">{d.empty}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{d.note}</p>
    </div>
  );
}
const Loading = () => <p className="mt-12 text-sm text-muted-foreground">Carregando…</p>;

function Clubs() {
  const { data, isLoading } = useQuery(clubsQuery);
  const [sel, setSel] = useState<Club | null>(null);
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty category="clubes" />;
  return (
    <>
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {data.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => setSel(c)}
            className="explore-card text-left transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex aspect-square items-center justify-center overflow-hidden p-6">
              <img
                src={c.image_url}
                alt={`Arte do clube de ${c.name}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="border-t border-border px-5 py-4 font-display text-xl font-semibold">
              {c.name}
            </p>
          </button>
        ))}
      </div>
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-md">
          {sel && (
            <>
              <img src={sel.image_url} alt="" className="mx-auto max-h-56 object-contain" />
              <DialogHeader>
                <DialogTitle className="font-display text-3xl">{sel.name}</DialogTitle>
                <DialogDescription className="text-sm leading-7">
                  {sel.description}
                </DialogDescription>
              </DialogHeader>
              <Button asChild className="w-full">
                <a href={sel.whatsapp_url} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  Entrar no grupo
                </a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Products() {
  const { data, isLoading } = useQuery(productsQuery);
  const [buy, setBuy] = useState<Product | null>(null);
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty category="roupas" />;
  return (
    <>
      <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
        {data.map((p) => (
          <div key={p.id} className="explore-card">
            {p.images[0] && (
              <div className="aspect-[109/70] overflow-hidden">
                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
              </div>
            )}
            {p.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-border p-3">
                {p.images.slice(1).map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded object-cover"
                  />
                ))}
              </div>
            )}
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl font-semibold">{p.name}</p>
                {p.price != null && (
                  <p className="font-display text-xl font-semibold text-primary">
                    {formatPrice(Number(p.price))}
                  </p>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              {p.sizes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.sizes.map((s) => (
                    <span key={s} className="rounded border border-border px-2 py-0.5 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <Button className="mt-4" onClick={() => setBuy(p)}>
                <ShoppingBag />
                Comprar
              </Button>
            </div>
          </div>
        ))}
      </div>
      {buy && <OrderDialog product={buy} open={!!buy} onOpenChange={(o) => !o && setBuy(null)} />}
    </>
  );
}

function EventCard({ e, past }: { e: EventItem; past?: boolean }) {
  return (
    <div className={`explore-card ${past ? "opacity-70" : ""}`}>
      <div className="relative aspect-video overflow-hidden">
        <img src={e.cover_url} alt={e.title} className="h-full w-full object-cover" />
        {past && (
          <span className="absolute left-3 top-3 rounded bg-background/90 px-2 py-1 text-xs font-semibold">
            Encerrado
          </span>
        )}
      </div>
      <div className="border-t border-border px-5 py-4">
        <p className="eyebrow text-primary">{formatDate(e.event_date)}</p>
        <p className="mt-2 font-display text-2xl font-semibold">{e.title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {e.event_time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {e.location}
          </span>
        </div>
        {e.ticket_url && !past && (
          <Button asChild className="mt-4">
            <a href={e.ticket_url} target="_blank" rel="noopener noreferrer">
              <Ticket />
              Inscrição / ingresso
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
function Events() {
  const { data, isLoading } = useQuery(eventsQuery);
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty category="eventos" />;
  const t = todayISO();
  const up = data.filter((e) => e.event_date >= t);
  const past = data.filter((e) => e.event_date < t).reverse();
  return (
    <>
      {up.length ? (
        <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
          {up.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      ) : (
        <Empty category="eventos" />
      )}
      {past.length > 0 && (
        <>
          <h2 className="mt-16 font-display text-3xl font-semibold">Eventos encerrados</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6">
            {past.map((e) => (
              <EventCard key={e.id} e={e} past />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function CategoryPage({ category }: { category: Cat }) {
  const data = content[category];
  return (
    <main className="site-width min-h-[70vh] py-12 md:py-16">
      <Button asChild variant="ghost" className="mb-12 pl-0 text-muted-foreground">
        <Link to="/">
          <ArrowLeft />
          Voltar ao início
        </Link>
      </Button>
      <p className="eyebrow text-primary">{data.eyebrow}</p>
      <h1 className="page-heading mt-5">{data.title}</h1>
      <p className="mt-5 max-w-xl text-muted-foreground">{data.description}</p>
      {category === "clubes" ? <Clubs /> : category === "roupas" ? <Products /> : <Events />}
      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="font-display text-xl font-semibold">O orgulho de ser KongCode.</p>
        <img src={images.gorilaBusto} alt="Gorila do KongCode" className="h-20 w-20 object-contain" />
      </div>
      <Button asChild variant="link" className="mt-4 px-0">
        <Link to={category === "clubes" ? "/eventos" : "/clubes"}>
          {category === "clubes" ? "Conheça os eventos" : "Conheça os clubes"}
          <ArrowUpRight />
        </Link>
      </Button>
    </main>
  );
}
