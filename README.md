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

Os arquivos `src/assets/*.asset.json` são ponteiros para imagens hospedadas no Lovable (`/__l5e/assets-v1/...`). Fora do Lovable essas imagens não carregam. Para rodar em outro lugar, baixe as imagens originais e troque os ponteiros por arquivos reais.

## Origem

Projeto criado no [Lovable](https://lovable.dev).
