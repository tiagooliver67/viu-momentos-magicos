# Redesign — Dashboard do Evento

Direção escolhida (padrão, já que você deixou minha escolha): **v1 — SaaS Premium equilibrado**. Layout em blocos horizontais, capa como banner, KPIs em linha e stepper limpo. Mantém a paleta oficial (roxo #673DE6 primary, verde #22C55E para status/faturamento, light theme), Inter, cantos 12–16px e sombras suaves.

## O que muda visualmente

1. **Header do evento (hero)**
   - Capa do evento vira banner de 180px com gradiente escuro sobre a foto.
   - Badge `● ATIVO` com pulse verde flutua sobre o banner (canto superior direito).
   - Abaixo: título grande, código, data/local em cinza, e 3 CTAs à direita (Compartilhar, Ver galeria, WhatsApp em verde).
   - Card branco arredondado (rounded-2xl) com borda `border-border`.

2. **Ações Rápidas (14 itens preservados)**
   - Título em caps `text-xs text-muted-foreground uppercase tracking-widest`.
   - Grid `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` — todos os 14 ícones aparecem sem scroll.
   - Cada item: card branco, ícone em círculo `bg-muted`, label abaixo. Hover: borda roxa + shadow-md + ícone vira roxo.
   - Zero remoção — Editar, Pedidos, Financeiro, Enviar Fotos, Fotos, Senha, Divulgação, Colaboração, Enviar Vídeos, Vídeos, Importar Pedidos, Convidar, Galeria, Ações.

3. **Linha dos 3 cards principais**
   - **Grade de Preço** — mostra Foto original / Vídeo com valores e link "Pacotes e Descontos". Ícone roxo em quadrado arredondado no canto.
   - **Tipo de Busca + Organizador** — pills (facial, número) + bloco Organizador com avatar.
   - **Faturamento do Evento** — card verde vibrante (`bg-emerald-600`) com sombra colorida `shadow-emerald-200`, valor grande em branco, sub-linha "Sua Comissão", botão "Ver extrato".

4. **KPIs em linha (4 cards)**
   - Pedidos, Ticket médio, Fotos vendidas + total, Visitantes/conversão. Cada card: label caps, número em `text-2xl font-bold`.
   - Botões-pill secundários (Fotos Vendidas, Vídeos Vendidos, Histórico Alteração Capa, Convidar Fotógrafos, Enviar Mensagem) permanecem numa linha abaixo dos KPIs.

5. **Stepper de progresso (5 passos)**
   - Card branco largo. Linha horizontal cinza → preenchida em roxo até o passo atual.
   - Círculos com check nos concluídos, pulse no atual, cinza nos futuros. Labels curtas abaixo.

## Motion

- Fade-in escalonado dos KPIs (framer-motion, stagger 60ms).
- Pulse verde no badge ATIVO (já existe no `StatusDropdown`, mantido).
- Hover translate-y-[-2px] + shadow-md nos cards de ação e nos 3 cards principais.

## Arquivos afetados

- `src/pages/EventDashboard.tsx` — reestruturação do JSX (sem mudar hooks, mutations, modais, uploads ou lógica de negócio).
- `src/components/event/StatusDropdown.tsx` — já ok, sem alteração.
- Novos subcomponentes de apresentação (opcional, para legibilidade):
  - `src/components/event/dashboard/EventHero.tsx`
  - `src/components/event/dashboard/QuickActionsGrid.tsx`
  - `src/components/event/dashboard/PriceGridCard.tsx`, `SearchTypeCard.tsx`, `RevenueCard.tsx`
  - `src/components/event/dashboard/KpiRow.tsx`
  - `src/components/event/dashboard/ProgressStepper.tsx`

Todos recebem os dados já existentes via props — nenhum novo hook ou query.

## O que NÃO muda

- Nenhuma ação, modal ou fluxo é removido/renomeado.
- `useEvent`, `useEventPhotos`, `useEventVideos`, `useEventOrders`, `useEventCoupons`, `useEventPriceGrid`, `useDiscountPackages`, `useUploadWithDupCheck` — intactos.
- Rotas, permissões, RLS, edge functions — nada tocado.
- Dark mode e mobile continuam funcionando (grid responsivo).

## Riscos e verificação

- Risco: quebrar handlers das 14 ações → mitigado ao manter o array `quickActions` como fonte única e passar `onAction(key)` do pai.
- Verificação após build: Playwright abre `/dashboard/evento/<id>`, tira screenshot, confere que os 14 ícones + 3 cards + KPIs + stepper aparecem, e que cliques em Editar/Pedidos/Fotos/Enviar Fotos abrem os modais corretos.

Se preferir a direção **v2 (Command Center 2 colunas)** ou quiser ajustar algo antes de eu implementar, me diga; caso contrário, aprove para eu seguir com a v1.
