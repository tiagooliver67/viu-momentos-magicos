# Plano — Nova Landing Page ViuFoto (institucional + conversão)

## Objetivo

Substituir a home (`/`) por uma landing premium e narrativa, mantendo a seção de **Álbuns em Destaque** (dados reais do Supabase) como prova social e ponte de conversão para atletas. A página servirá tanto para o atleta encontrar fotos quanto para impressionar investidores e parceiros (organizadores/fotógrafos).

## Estrutura da página (top → bottom)

```text
┌──────────────────────────────────────────────┐
│ ClientNavbar (existente)                     │
├──────────────────────────────────────────────┤
│ 1. HERO                                      │
│    - hero-bg.jpg + overlay gradiente         │
│    - Badge "A revolução da fotografia..."    │
│    - H1: "Sua superação imortalizada         │
│           em alta definição."                │
│    - Sub: busca facial + OCR em segundos     │
│    - Search bar (texto/face) → /buscar       │
├──────────────────────────────────────────────┤
│ 2. DIFERENCIAIS TÉCNICOS (3 cards glass)     │
│    [Cpu] Busca Facial IA                     │
│    [Zap] Entrega via CDN                     │
│    [Trophy] Watermark + Segurança            │
├──────────────────────────────────────────────┤
│ 3. SportCategoryFilter (existente)           │
├──────────────────────────────────────────────┤
│ 4. FeaturedAlbums (existente, dados reais)   │
├──────────────────────────────────────────────┤
│ 5. CTA dual (organizador / fotógrafo)        │
│    - Card "É organizador?" → /cadastro/...   │
│    - Card "É fotógrafo?"   → /virar-fotografo│
├──────────────────────────────────────────────┤
│ Footer (existente)                           │
└──────────────────────────────────────────────┘
```

## O que muda

### 1. `src/components/HeroSection.tsx` — refinado
- Atualizar H1 para a copy nova: **"Sua superação imortalizada em alta definição."**
- Atualizar subtítulo: foco em **busca facial + OCR**.
- Manter o componente de busca atual (já funcional), conectar o botão "Buscar" para navegar a `/buscar?q=...`.
- Adicionar animações com **framer-motion** (fade-in + stagger nos elementos).
- Manter `hero-bg.jpg` e o overlay já existente.

### 2. `src/components/landing/FeatureCards.tsx` — NOVO
- 3 cards `FeatureCard` com ícones do `lucide-react` (Cpu, Zap, Trophy).
- Visual: `glass-card` (já existe no `index.css`), borda sutil, hover-scale.
- Animação `motion.div` com `whileInView` + delay escalonado (0, 0.15s, 0.3s).
- Título da seção: **"Tecnologia que impulsiona o esporte"**.

### 3. `src/components/landing/PartnerCTA.tsx` — NOVO
- Bloco com 2 cards lado a lado (mobile: empilhados):
  - **Organizadores** → botão "Seja parceiro ViuFoto" → `/cadastro/organizador`
  - **Fotógrafos** → botão "Comece a vender" → `/virar-fotografo`
- Background com gradiente sutil usando token `--primary`.

### 4. `src/pages/Index.tsx` — recompor
- Estrutura: `ClientNavbar` → `HeroSection` → `FeatureCards` → `SportCategoryFilter` → `FeaturedAlbums` → `PartnerCTA` → `Footer`.
- Remover wrapper `container mx-auto px-4 mt-12` que causa quebra visual entre hero e seções (cada componente passa a controlar seu próprio padding).

### 5. Dependência nova
- Instalar **`framer-motion`** (atualmente ausente do `package.json`).

## Detalhes técnicos

- **Tokens de design**: usar exclusivamente os tokens semânticos já existentes em `src/index.css` (`--primary`, `--background`, `--foreground`, `--muted-foreground`, `.glass-card`). Nada de cores hardcoded — mantém compatibilidade com tema claro (padrão) e `.dark-theme`.
- **Tipografia**: Inter (já carregada). H1 com `font-black text-4xl sm:text-5xl md:text-7xl tracking-tight`.
- **Acessibilidade**: alvos de toque ≥44px (já padrão), `aria-label` nos botões de ícone, `prefers-reduced-motion` respeitado pelo framer-motion automaticamente.
- **Mobile-first**: cards em coluna única no mobile, grid 3 colunas em `md:`. Hero com `min-h-[70vh]` no mobile (já está assim).
- **Performance**: animações apenas com `transform`/`opacity`. `whileInView` com `viewport={{ once: true, margin: "-80px" }}` para disparar uma única vez.
- **Sem mudanças de backend**: nenhuma migração, RLS ou edge function tocada. `FeaturedAlbums` continua consumindo a tabela `events` como hoje.

## Arquivos afetados

- **Novos**: `src/components/landing/FeatureCards.tsx`, `src/components/landing/PartnerCTA.tsx`
- **Editados**: `src/components/HeroSection.tsx`, `src/pages/Index.tsx`, `package.json` (framer-motion)
- **Inalterados**: `FeaturedAlbums.tsx`, `SportCategoryFilter.tsx`, navbar, footer, rotas, backend.

## Fora de escopo (próximos passos sugeridos)

- Conectar a busca facial real (placeholder por enquanto, abre `/buscar`).
- Seção de depoimentos / logos de eventos parceiros (quando houver material).
- Métricas dinâmicas ("X fotos entregues", "Y atletas") — requer endpoint agregado.
