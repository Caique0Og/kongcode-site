import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Heart, ArrowRight, Instagram, MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/impacta_logo.asset.json";
import { GENERAL_GROUP_URL } from "@/lib/content";

const navigation = [
  { to: "/", label: "Início" },
  { to: "/clubes", label: "Clubes" },
  { to: "/roupas", label: "Roupas" },
  { to: "/eventos", label: "Eventos" },
] as const;
export const INSTAGRAM_URL =
  "https://www.instagram.com/atleticaimpacta?xtok=czMyMTlicHQxMWU%3D&utm_source=qr";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-width flex h-full items-center justify-between gap-6">
        <Link to="/" aria-label="KongCode — início" className="brand">
          <div className="brand-image">
            <img src={logo.url} alt="" />
          </div>
          <div className="brand-name">
            KONG<b>CODE</b>
            <span>ATLÉTICA TECNOLOGIA IMPACTA</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegação principal">
          {navigation.map((item) => (
            <Link key={item.to} to={item.to} className="nav-item" activeOptions={{ exact: true }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" className="h-10">
            <Link to="/perfil">
              <UserRound /> Minha conta
            </Link>
          </Button>
          <Button asChild className="h-10">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Faça parte <Instagram />
            </a>
          </Button>
          <Button asChild className="h-10">
            <a href={GENERAL_GROUP_URL} target="_blank" rel="noopener noreferrer">
              Grupo geral <MessageCircle />
            </a>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav className="mobile-nav lg:hidden" aria-label="Navegação do celular">
          {navigation.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="nav-item">
              {item.label}
              <ArrowRight className="float-right size-4" />
            </Link>
          ))}
          <Link to="/perfil" onClick={() => setOpen(false)} className="nav-item">
            Minha conta e pedidos
            <UserRound className="float-right size-4" />
          </Link>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="nav-item"
          >
            Faça parte (Instagram)
            <Instagram className="float-right size-4" />
          </a>
          <a
            href={GENERAL_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="nav-item"
          >
            Grupo geral (WhatsApp)
            <MessageCircle className="float-right size-4" />
          </a>
        </nav>
      )}
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-width flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
      <Link to="/" className="font-display text-2xl font-bold">
        KONG<span className="text-primary">CODE</span>
      </Link>
      <p className="text-xs text-muted-foreground">Mais que uma atlética. A nossa comunidade.</p>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        Feito com orgulho <Heart className="size-3 text-primary" />
      </span>
    </footer>
  );
}
