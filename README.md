# KongCode

Site da Atlética de Tecnologia da Impacta (KongCode): página inicial, clubes, roupas, eventos, pedidos e área administrativa. Inclui a página `/kongcode`, um link-in-bio independente do restante do site.

## Stack

TanStack Start, React 19, TypeScript, Tailwind CSS 4, Supabase e Drizzle. Gerenciador de pacotes: [Bun](https://bun.sh).

## Como rodar

```sh
bun install
cp .env.example .env   # preencha as variáveis
bun run dev
```

Scripts: `bun run build`, `bun run test`, `bun run lint`, `bun run format`.

## Imagens

As imagens fixas do layout ficam em `public/images/` e são referenciadas em `src/lib/images.ts`. As fotos enviadas pelo painel admin vão para o bucket público `media` do Supabase Storage.

## Deploy

`bun run build` gera o Worker da Cloudflare em `.output/` (preset `cloudflare-module` do Nitro).
