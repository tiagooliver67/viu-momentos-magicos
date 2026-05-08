## Contexto

Hoje o painel `/admin` cobre Usuários, Fotógrafos, Eventos (galeria), Financeiro, Pagamentos, Moderação, Storage S3, Suporte (vazio), Analytics, Configurações e Logs (vazio).

O módulo **Inscrições** (`/dashboard/inscricoes` — usado por Organizadores para corridas/eventos esportivos) **não tem nenhuma visão Super Admin**. Mesmo com policies `is_super_admin()` permitindo SELECT no banco, não existe UI para você consultar, dar suporte ou intervir.

Este plano cobre o que o Super Admin precisa **ver, controlar e auditar** sobre o lado do Organizador, com foco no que falta hoje.

---

## O que falta no painel Super Admin

### 1. Nova aba "Inscrições" (`/admin/inscricoes`)
Lista global de **todos os eventos de inscrição** da plataforma (não só galerias de fotos).

**Listagem geral** com filtros (organizador, status, data, cidade):
- Nome do evento, organizador, data, cidade, status (rascunho/publicado/encerrado)
- Total de inscritos · Pagos · Pendentes · Faturamento bruto
- Botão "Abrir como organizador" (impersonate read-only)

**Detalhe do evento de inscrição** (`/admin/inscricoes/:id`):
- Todos os inscritos com CPF, e-mail, telefone, status pagto, comprovante (URL assinada gerada na hora)
- Ações de suporte: **marcar como pago manualmente**, **estornar**, **cancelar inscrição**, **reenviar QR/confirmação**, **editar dados do atleta** (corrigir CPF/nome digitados errados)
- Log de auditoria por inscrição (quem mexeu, quando)

### 2. Reforço da aba "Eventos" (galerias)
Adicionar ações de suporte que hoje só o organizador tem:
- Forçar republicar evento, alterar visibilidade, resetar senha do evento
- Ver fotógrafos colaboradores e comissões
- Ver pedidos do evento (link rápido), conversão e faturamento
- Botão "Reprocessar watermark" (chamar Lambda) e "Reindexar busca por número/face"

### 3. Reforço da aba "Pagamentos"
- Ver split Asaas por pedido (quanto foi para fotógrafo, quanto para VIUFOTO, quanto para parceiro)
- Reprocessar webhook Asaas manualmente quando travar
- Forçar liberação de download (`order-download`) para casos de cliente que pagou mas não recebeu
- Cancelar/estornar pedido com nota de motivo

### 4. Reforço da aba "Financeiro"
- Saques pendentes da plataforma (`withdrawal_logs` + `withdrawal_accounts`) com status, IP, user-agent
- Aprovar/negar saque manualmente, com obrigação de nota
- Ver histórico de saques bloqueados pela whitelist/cooldown de 24h
- Saldo retido por fotógrafo (em pré-pagamento, em disputa)

### 5. Suporte (`/admin/suporte`) — hoje vazio
Inbox unificado:
- **Tickets** (criar tabela `support_tickets`: usuário, categoria, prioridade, status, mensagens)
- Atalho "Iniciar conversa" a partir de qualquer perfil de usuário/organizador
- Vincular ticket a evento, pedido ou inscrição
- Anotações internas (não visíveis ao usuário)

### 6. Logs & Auditoria (`/admin/logs`) — hoje vazio
Popular com `admin_audit_log` (já existe no banco):
- Filtro por ação, super admin, alvo, data
- Toda ação destrutiva do Super Admin (cancelar pedido, estornar, editar dados de atleta, marcar pagto manual, bloquear usuário) **deve gerar registro automaticamente** via Edge Function ou trigger
- Logs de webhook Asaas (sucesso/falha) também aparecem aqui

### 7. Modo "Impersonate" (visão somente-leitura)
- Botão em qualquer organizador/fotógrafo: "Ver painel como este usuário" (read-only)
- Banner amarelo no topo da tela: "Você está vendo como [Nome] — modo somente leitura"
- Sem permissão de gravar nada nesse modo (impersonação real só com consentimento por 2FA, fora do escopo)

### 8. Ações sobre usuário (na aba Usuários)
Se ainda não existirem, adicionar:
- Bloquear/desbloquear conta (`profiles.blocked`)
- Forçar logout (revogar sessões)
- Resetar 2FA, resetar senha (enviar e-mail)
- Adicionar/remover roles (organizer, photographer, super_admin)
- Ver últimos eventos, pedidos, inscrições, saques numa única timeline

### 9. Overview reforçado
KPIs em tempo real focados em "saúde da operação":
- Pagamentos travados (>24h aguardando webhook)
- Saques pendentes
- Tickets de suporte abertos
- Eventos sem fotógrafo
- Inscrições com comprovante aguardando aprovação

---

## Resumo do que isso entrega

Como Super Admin você vai conseguir, **sem precisar pedir nada para o organizador**:

1. **Ver** qualquer inscrição, qualquer pedido, qualquer evento, qualquer saque, qualquer fotógrafo
2. **Intervir** em pagamentos travados, liberar downloads, estornar, marcar pagto manual
3. **Dar suporte** via tickets internos, com histórico vinculado ao usuário/pedido/evento
4. **Auditar** tudo que você ou outro admin fez (log automático de ações sensíveis)
5. **Visualizar como o usuário** vê o painel dele (read-only) para diagnosticar problemas reportados

---

## Detalhes técnicos

- **Migrations necessárias:**
  - `support_tickets` + `support_ticket_messages` (com RLS: dono vê os seus, super_admin vê todos)
  - Trigger ou hook em Edge Function para popular `admin_audit_log` automaticamente em ações destrutivas
- **Edge Functions novas/alteradas:**
  - `admin-action` (proxy para ações sensíveis do admin, registra em `admin_audit_log`)
  - `asaas-webhook-replay` (reprocessar evento Asaas)
  - `order-force-release` (liberar download manualmente)
  - `registration-payment-mark` (marcar inscrição como paga manualmente)
- **RLS:** policies `is_super_admin()` em todas as tabelas já cobrem leitura; só adicionar UPDATE/DELETE onde faltar (por ex. `event_registrations`, `withdrawal_logs`)
- **URLs assinadas** para comprovantes de inscrição (`registration-assets` agora privado): gerar via `s3-presign` ou Supabase Storage signed URL na hora do clique
- **Frontend:** novas rotas em `App.tsx` + 5 páginas novas (`AdminInscricoes`, `AdminInscricaoDetail`, `AdminTickets`, `AdminTicketDetail`, `AdminUserDetail`) + reforço das 3 existentes (Eventos, Pagamentos, Financeiro)

---

## Pergunta antes de implementar

Esse escopo é grande (10+ telas, 4+ edge functions, 2 migrations). Sugiro implementar **em fases**:

- **Fase 1 (essencial p/ suporte):** Inscrições admin + Logs/Auditoria + ações de pagamento travado
- **Fase 2:** Tickets de suporte + impersonate read-only
- **Fase 3:** Reforço de Eventos/Financeiro/Usuários

Confirma se é por aí, ou se quer cortar/priorizar algo diferente?