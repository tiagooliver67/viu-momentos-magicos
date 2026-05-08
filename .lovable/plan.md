
# Landing dedicada do Organizador

## Objetivo
Criar uma landing page exclusiva para captar organizadores de eventos, **sem interferir** na home principal (que continua atleta-first). A página educa sobre o novo módulo de **Gestão de Inscrições e Check-in** antes de levar ao cadastro.

## Onde a landing entra no fluxo

```text
/  (home atleta — inalterada)
│
├── PartnerCTA (seção atual da home)
│   ├── Card "Para fotógrafos" ──► /virar-fotografo  (já existe)
│   └── Card "Para organizadores" ──► /para-organizadores  (NOVA — hoje vai direto pro cadastro)
│
├── Footer "Para parceiros"
│   ├── Sou fotógrafo ──► /virar-fotografo
│   └── Sou organizador ──► /para-organizadores  (NOVO)
│
└── /para-organizadores (NOVA landing)
        │
        └── CTAs ──► /cadastro/organizador (form já existente)
```

A landing fica **fora da home**, com URL própria pra usar em campanhas, Instagram, outbound e SEO. Espelha a estrutura da `/virar-fotografo`.

## Estrutura da página `/para-organizadores`

1. **Navbar** (ClientNavbar reaproveitado)
2. **Hero** — Headline focada em gestão de inscrições + check-in
   - Título: "Inscreva, organize e dê check-in no seu evento. Tudo num só lugar."
   - Subtítulo curto sobre tirar a complexidade da operação
   - CTA primário: "Criar evento grátis" → `/cadastro/organizador`
   - CTA secundário: "Ver como funciona" (scroll suave)
   - Mockup/ilustração do painel de inscrições no mobile (foco mobile-first)
3. **Pilares (3 cards principais)**
   - Inscrições online com Pix
   - Check-in mobile com busca instantânea
   - Dashboard com KPIs em tempo real
4. **Funcionalidades secundárias (grid)**
   - Categorias e lotes
   - Cupons e limite de vagas
   - Exportação CSV/Excel/PDF
   - Comprovante de pagamento
   - Cobertura fotográfica oficial (bridge para o produto principal)
   - URL pública personalizada
5. **Como funciona (3 passos)**
   - 1) Crie o evento  → 2) Compartilhe o link  → 3) Gerencie e dê check-in
6. **Bloco "Mais que inscrições"** — explica que o organizador também ganha cobertura fotográfica oficial integrada (bridge para o ecossistema ViuFoto)
7. **Prova social** — placeholder elegante para logos/cases (sem mock data; usar copy "Eventos que confiam na ViuFoto" + estado vazio limpo até ter cases reais)
8. **FAQ curto** (4–6 perguntas: custo, taxa, prazo, suporte)
9. **CTA final** — "Comece em 2 minutos" → `/cadastro/organizador`
10. **Footer**

## Mudanças nos arquivos existentes

- `src/App.tsx` — adicionar rota `/para-organizadores`
- `src/components/landing/PartnerCTA.tsx` — trocar destino do card "Para organizadores" de `/cadastro/organizador` para `/para-organizadores`
- `src/components/Footer.tsx` — adicionar link "Para organizadores" na seção de parceiros (verificar estrutura atual)
- `index.html` — não mexer (SEO da rota é via React Helmet ou tags estáticas no componente; usar mesmo padrão de `/virar-fotografo`)

## Arquivos novos

- `src/pages/ParaOrganizadores.tsx` — página principal
- `src/components/organizador/OrganizadorHero.tsx`
- `src/components/organizador/OrganizadorPillars.tsx`
- `src/components/organizador/OrganizadorFeatures.tsx`
- `src/components/organizador/OrganizadorComoFunciona.tsx`
- `src/components/organizador/OrganizadorFAQ.tsx`
- `src/components/organizador/OrganizadorFinalCTA.tsx`

(Componentização espelha o padrão usado em `/virar-fotografo`/landing — fica fácil iterar depois.)

## Diretrizes visuais

- Light theme default (igual resto do app)
- Tokens semânticos do `index.css` — sem cores hardcoded
- Glassmorphism nos cards principais
- Mobile-first com touch targets ≥ 44px
- Sem emojis nos cards (segue regra do projeto)
- Animações Framer Motion sutis (mesma assinatura do `PartnerCTA` e `FeatureCards`)
- Imagens/mockups: usar ilustrações geradas via imagegen quando necessário, focadas em mobile (telas do painel de inscrições e do check-in)

## Fora do escopo

- Mudar a home principal `/`
- Alterar o módulo de inscrições já implementado (apenas linka pra ele via cadastro)
- Criar cases/depoimentos com dados fake (segue regra "no mock data")
- SEO avançado / sitemap / OG dinâmico — fica para iteração futura, mas inclui meta básica via `<title>` e `<meta name="description">` no componente
