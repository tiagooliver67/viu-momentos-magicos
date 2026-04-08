## Plano de Implementação

### Fase 1 — Navbar do Cliente (diferenciada)
- Criar `ClientNavbar` com: Buscar eventos, Meus pedidos, Carrinho, Conta
- Busca global (eventos + fotógrafos)

### Fase 2 — Home do Cliente (estilo Fotop)
- Página `/cliente` com saudação, busca, seção "Meus Pedidos" com status/ações
- Banner promocional opcional

### Fase 3 — Página pública do Fotógrafo (melhorar)
- Melhorar `PhotographerPage` com identidade visual clara: "Você está vendo as fotos de: Nome"
- Layout de vitrine, não dashboard

### Fase 4 — Sistema de Favoritos
- Tabela `favorites` no banco (photo_id, session_id/email)
- Botão ⭐ nas fotos, página de favoritos

### Fase 5 — Padronização
- Garantir que rotas públicas nunca mostrem UI de admin
- Revisão de navegação

**Implementação nesta rodada:** Fases 1, 2 e 3 (core UX). Fase 4 e 5 na próxima iteração.