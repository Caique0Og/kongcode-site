import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Users, Shirt, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { images } from "@/lib/images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KongCode | A força da nossa comunidade" },
      {
        name: "description",
        content:
          "Conheça os clubes, as roupas e os eventos do KongCode. Faça parte da nossa comunidade universitária.",
      },
      { property: "og:title", content: "KongCode | A força da nossa comunidade" },
      {
        property: "og:description",
        content: "Clubes, roupas e eventos. Viva a experiência de ser KongCode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
const tickerItems = ["ESPORTE", "CONEXÃO", "ATITUDE", "ORGULHO KONGCODE"] as const;
const cards = [
  {
    number: "01",
    eyebrow: "CONEXÃO & COMUNIDADE",
    title: "Encontre sua galera",
    description: "Interesses em comum. Novas amizades. Um clube para chamar de seu.",
    to: "/clubes",
    label: "Conheça os clubes",
    image: images.mascote,
    style: "card-clubs",
    icon: Users,
  },
  {
    number: "02",
    eyebrow: "ESTILO & IDENTIDADE",
    title: "Vista essa força",
    description: "Leve o orgulho de ser KongCode com você, dentro e fora do campus.",
    to: "/roupas",
    label: "Explore as roupas",
    image: images.logo,
    style: "card-gear",
    icon: Shirt,
  },
  {
    number: "03",
    eyebrow: "ENCONTROS & EXPERIÊNCIAS",
    title: "Viva cada momento",
    description: "A energia da nossa torcida e os encontros que viram boas histórias.",
    to: "/eventos",
    label: "Veja os eventos",
    image: images.torcida,
    style: "card-events",
    icon: CalendarDays,
  },
] as const;
function Index() {
  return (
    <main>
      <section className="hero">
        <img
          className="hero-art"
          src={images.gorilaBusto}
          alt="Gorila do KongCode com capacete tecnológico e óculos azuis"
        />
        <div className="site-width hero-content">
          <p className="eyebrow text-primary">A NOSSA FORÇA É COLETIVA</p>
          <h1>
            KONG<b>CODE</b>.<br />
            <span className="text-primary">A SUA GALERA.</span>
          </h1>
          <p className="hero-description">
            No esporte, no rolê e na vida universitária.
            <br />
            Aqui, cada conexão faz parte de algo maior.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6">
              <Link to="/clubes">
                Faça parte do KongCode <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6">
              <Link to="/eventos">
                Explore os eventos <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="hero-bottom-note">
            <span />O orgulho de ser KongCode começa aqui.
          </div>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((group) => (
            <div key={group} className="ticker-group">
              {[
                ...tickerItems,
                ...tickerItems,
                ...tickerItems,
                ...tickerItems,
                ...tickerItems,
                ...tickerItems,
              ].map((item, index) => (
                <Fragment key={index}>
                  <span>{item}</span>
                  <Sparkles className="size-5" />
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      <section className="site-width py-16 md:py-20">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-4 text-primary">DENTRO E FORA DO CAMPUS</p>
            <h2 className="section-title">
              SEU JEITO DE SER <span className="text-primary">KONGCODE.</span>
            </h2>
          </div>
          <p className="max-w-[280px] text-sm leading-6 text-muted-foreground">
            Uma comunidade. Muitas formas de fazer parte.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.to} to={card.to} className="explore-card group">
              <div className={`card-visual ${card.style}`}>
                <img src={card.image} alt={card.title} loading="lazy" />
                <span className="card-number">{card.number} / KONGCODE</span>
              </div>
              <div className="p-6">
                <p className="flex items-center gap-2 text-[9px] font-bold tracking-[1.5px] text-primary">
                  <card.icon className="size-3.5" />
                  {card.eyebrow}
                </p>
                <h3 className="mt-3 text-3xl">{card.title}</h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-xs font-semibold">
                  {card.label}
                  <ArrowUpRight className="size-4 text-primary" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="community">
        <div className="site-width grid items-center gap-10 py-12 md:grid-cols-[1fr_300px] md:py-14">
          <div>
            <p className="eyebrow text-accent">UM SÓ TIME. MUITAS HISTÓRIAS.</p>
            <h2 className="section-title mt-5">
              NÃO É SÓ SOBRE A FACULDADE.
              <br />É SOBRE <span className="text-primary">PERTENCER.</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
              O KongCode é o ponto de encontro de quem quer viver a universidade de verdade. Juntos,
              a gente transforma a rotina em conexão, energia e boas memórias.
            </p>
            <Button asChild className="mt-7 h-11">
              <Link to="/clubes">
                Encontre seu lugar <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <img
            className="community-art hidden md:block"
            src={images.gorilaBusto}
            alt="Gorila do KongCode com capacete tecnológico"
            loading="lazy"
          />
        </div>
      </section>
    </main>
  );
}
