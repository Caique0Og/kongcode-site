import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import gorila from "@/assets/kongcode-oficial.png.asset.json";
import { GENERAL_GROUP_URL } from "@/lib/content";
import { INSTAGRAM_URL } from "@/components/atletica/site-shell";

export const Route = createFileRoute("/kongcode")({
  head: () => ({
    meta: [
      { title: "KongCode" },
      { name: "description", content: "KongCode: todos os links em um só lugar." },
      { property: "og:title", content: "KongCode" },
      { property: "og:description", content: "Comunidade, Discord, Instagram, licores e mais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KongCode,
});

type Item =
  | { kind: "external"; label: string; sub: string; href: string }
  | { kind: "internal"; label: string; sub: string; to: "/" }
  | { kind: "soon"; label: string; sub: string };

const items: Item[] = [
  {
    kind: "external",
    label: "Comunidade no WhatsApp",
    sub: "Fique por dentro de tudo",
    href: GENERAL_GROUP_URL,
  },
  {
    kind: "external",
    label: "Discord",
    sub: "Bora jogar e trocar ideia",
    href: "https://discord.gg/sP3JWQRRB",
  },
  { kind: "external", label: "Instagram", sub: "@atleticaimpacta", href: INSTAGRAM_URL },
  {
    kind: "external",
    label: "Licores",
    sub: "Família Bachiega",
    href: "https://www.familiabachiega.com.br",
  },
  { kind: "internal", label: "Nosso site", sub: "Clubes, roupas e eventos", to: "/" },
  { kind: "soon", label: "Eventos", sub: "Garanta seu ingresso" },
  { kind: "soon", label: "Seja sócio", sub: "Descontos exclusivos" },
];

// Regra da página: tudo que é "EM BREVE" aparece por último, sempre.
const ordered = [...items].sort((a, b) => Number(a.kind === "soon") - Number(b.kind === "soon"));

const badge =
  "shrink-0 rounded-full bg-accent px-2 py-1 font-sans text-[11px] font-semibold text-accent-foreground";

function KongCode() {
  const item = "kong-link";
  return (
    <main className="site-width py-8 sm:py-10 md:py-14 lg:py-16">
      <div className="mx-auto max-w-[1120px] rounded-lg border border-border bg-card/60 p-4 sm:p-8 lg:p-12">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <section className="mx-auto w-full max-w-[420px] text-center md:mx-0 md:max-w-none md:text-left">
            <div className="kong-photo mx-auto w-full max-w-[200px] sm:max-w-[240px] md:mx-0 md:max-w-[210px] lg:max-w-[300px]">
              <img
                src={gorila.url}
                alt="Arte oficial do KongCode: gorila de moletom azul com o logo KongCode"
              />
            </div>
            <p className="eyebrow mt-5 justify-center text-primary md:justify-start">
              -A.A.A TECNOLOGIA IMPACTA -
            </p>
            <h1 className="mt-2 text-[clamp(2rem,8.5vw,3.4rem)] uppercase leading-[.95] md:text-[clamp(1.85rem,4.6vw,2.6rem)] lg:text-[clamp(2rem,8.5vw,3.4rem)]">
              KongCode.
              <br />
              <span className="text-primary">A sua galera.</span>
            </h1>
            <p className="mt-4 text-[12px] leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              🦍 <b className="text-foreground">Força de um gorila</b> para competir
              <br />
              💻 <b className="text-foreground">Inteligência de um nerd</b> para vencer
            </p>
          </section>
          <nav
            className="mx-auto flex w-full max-w-[480px] flex-col gap-3 md:mx-0 md:max-w-[520px]"
            aria-label="Links do KongCode"
          >
            {ordered.map((i) => {
              if (i.kind === "soon") {
                return (
                  <div key={i.label} className={`${item} kong-off`} aria-disabled="true">
                    <span>
                      {i.label}
                      <small>{i.sub}</small>
                    </span>
                    <span className={badge}>EM BREVE</span>
                  </div>
                );
              }
              if (i.kind === "internal") {
                return (
                  <Link key={i.label} to={i.to} className={item}>
                    <span>
                      {i.label}
                      <small>{i.sub}</small>
                    </span>
                    <ArrowRight />
                  </Link>
                );
              }
              return (
                <a
                  key={i.label}
                  href={i.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={item}
                >
                  <span>
                    {i.label}
                    <small>{i.sub}</small>
                  </span>
                  <ArrowRight />
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </main>
  );
}
