# Plano de Implementação: Coletivos (Etapa 1)

Implementação da base do sistema de "Coletivos" para permitir que fotógrafos se organizem em grupos reutilizáveis, com gestão de membros e prioridade em oportunidades.

## Alterações Técnicas

### 1. Banco de Dados (Supabase)
- Criar tabela `coletivos` com RLS para gestão pelo dono (`owner_id`).
- Criar tabela `coletivo_members` com RLS para membros e donos.
- Adicionar colunas `coletivo_id` e `coletivo_priority_until` na tabela `events`.
- Garantir permissões (`GRANT`) para as novas tabelas.

### 2. Frontend - Nova Página "Meu Coletivo"
- Criar `src/pages/MeuColetivo.tsx`.
- Implementar estados:
  - **Sem coletivo**: CTA para criação.
  - **Dono**: Gestão de membros (lista, convite por e-mail, edição de comissão).
  - **Convidado**: Notificação para aceitar/recusar convite.
  - **Membro**: Visualização do grupo e opção de sair.
- Adicionar rota no `App.tsx`.

### 3. Frontend - Integração em Oportunidades
- Ajustar query em `src/pages/Oportunidades.tsx` para respeitar a prioridade do coletivo:
  - Eventos com `coletivo_id` ativo só aparecem para membros `ativos` do respectivo coletivo.
  - Após `coletivo_priority_until`, o evento torna-se público.

### 4. Fluxo de Criação/Edição de Evento
- Adicionar campos "Vincular a um coletivo" e "Prioridade até" em `src/pages/CriarEvento.tsx` e `src/components/event/EditEventModal.tsx`.

## Detalhes Técnicos
- **Segurança**: RLS reforçado para garantir que apenas o dono gerencie o coletivo.
- **UI**: Manter padrão "SaaS Premium" (cards brancos, sombras suaves, tipografia Inter).
- **UX**: Feedbacks visuais claros (Toasts) para ações de convite e aceite.

