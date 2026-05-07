
# Módulo: Gestão de Inscrições e Organização de Eventos

Módulo separado dos eventos de fotografia, restrito a usuários com role `organizer`. Participantes podem se inscrever sem login (opcional vincular ao perfil se logado). Pagamento manual (Pix externo). Check-in por busca manual nesta versão, com estrutura preparada para QR no futuro.

---

## 1. Banco de dados (3 tabelas novas)

**`registration_events`** — eventos de inscrição
- organizer_id, slug (único), name, description, cover_url, event_date, event_time, location, category, max_slots, regulation (text), pix_key, whatsapp, status (`rascunho` / `aberto` / `encerrado` / `cancelado`)
- Campos opcionais para configurar formulário (ex.: `requires_shirt_size`, `requires_birth_date`, `categories` jsonb com lista de categorias da prova)

**`event_registrations`** — inscritos
- registration_event_id, user_id (nullable), full_name, email, phone, city, birth_date, category, shirt_size, notes, payment_proof_url (nullable)
- payment_status (`pendente` / `pago` / `cancelado`), checkin_status (`ausente` / `presente`), checked_in_at, qr_token (uuid pré-gerado para uso futuro)

**`registration_payment_proofs`** (opcional, ou apenas campo `payment_proof_url`) — manteremos como campo único na inscrição para simplificar.

**RLS:**
- `registration_events`: SELECT público quando `status != 'rascunho'`; ALL para `organizer_id = auth.uid()`; SELECT para super_admin
- `event_registrations`: INSERT público (formulário aberto); SELECT/UPDATE só para organizador dono do evento e super_admin; participante logado vê as próprias (`user_id = auth.uid()` ou `email = jwt.email`)

**Storage:** novo bucket público `registration-assets` para capa do evento e comprovantes de pagamento.

---

## 2. Rotas e páginas

**Públicas:**
- `/inscricao/:slug` — landing do evento + formulário de inscrição (mobile-first)
- `/inscricao/:slug/sucesso` — confirmação com instruções de pagamento (Pix + WhatsApp)

**Organizador (protegidas, role `organizer`):**
- `/dashboard/inscricoes` — lista de eventos de inscrição + botão "Criar"
- `/dashboard/inscricoes/novo` — formulário de criação
- `/dashboard/inscricoes/:id` — painel do evento com abas:
  - **Visão geral** (KPIs: inscritos, pagos, pendentes, check-ins, vagas restantes)
  - **Inscritos** (tabela com filtros, marcar pago/pendente, ver comprovante)
  - **Check-in** (busca rápida, botão grande "Marcar presente", contador ao vivo)
  - **Configurações** (editar evento, copiar link público, gerar QR do link)
  - **Exportar** (CSV, Excel via SheetJS, PDF via jsPDF)

**Item de menu novo** no `DashboardSidebar`: "Inscrições" (visível só para organizadores).

---

## 3. Fluxo do participante

1. Acessa `/inscricao/:slug` → vê banner, descrição, data, local, vagas restantes, regulamento (acordeão), botão "Quero me inscrever"
2. Preenche formulário (campos definidos pelo organizador). Se logado, nome/email/telefone vêm pré-preenchidos e a inscrição é vinculada ao `user_id`
3. Após enviar → tela de sucesso com:
   - Chave Pix (copiar com 1 toque) + valor
   - Botão WhatsApp (link `wa.me/...?text=Comprovante de inscrição – {nome}`)
   - Upload opcional de comprovante (envia ao bucket; salva URL na inscrição)
4. Recebe confirmação visual

---

## 4. Controle de pagamento (manual)

Na aba **Inscritos** do organizador:
- Tabela com colunas: nome, contato, categoria, status pagamento (badge), comprovante (preview), ações
- Toggle rápido pago/pendente (UPDATE direto)
- Visualizar comprovante em modal (imagem ou PDF)
- Filtros: status, categoria, busca por nome/email

---

## 5. Check-in

Tela dedicada otimizada para celular:
- Campo de busca grande (filtra por nome/email/telefone em tempo real)
- Cada resultado: cartão com nome + categoria + status pagamento + botão grande "Presente" (44px+)
- Após marcar: feedback visual instantâneo, contador no topo atualiza
- Filtro "ocultar já presentes" (default: ligado)
- Estrutura `qr_token` já gravada para fase 2 (leitor QR)

---

## 6. Exportação

Botão "Exportar" abre menu:
- **CSV** — geração client-side (simples join de strings)
- **Excel** — biblioteca `xlsx` (já comum) ou `exceljs`
- **PDF** — `jspdf` + `jspdf-autotable` (lista de presença pronta para imprimir)

Inclui colunas configuráveis: nome, email, telefone, cidade, categoria, camiseta, status pagamento, check-in.

---

## 7. Mobile-first

- Formulário público em coluna única, inputs altos, teclado correto por tipo
- Painel de check-in com botões 48px+, tipografia maior, busca persistente fixa no topo
- Dashboard usa cards empilhados em <md, grid em ≥md
- Seguir design system existente (semantic tokens, glassmorphism, sem emojis em cards)

---

## Detalhes técnicos

- **Geração de slug**: a partir do nome, com sufixo aleatório se colisão, validado server-side (constraint UNIQUE)
- **Vagas restantes**: `max_slots - count(registrations where payment_status != 'cancelado')`, calculado em query (não trigger nesta versão)
- **Trigger**: `update_updated_at_column` reutilizado
- **Sem edge functions necessárias** — toda lógica via RLS + cliente Supabase
- **Bibliotecas a adicionar**: `xlsx`, `jspdf`, `jspdf-autotable` (CSV é manual)
- **QR do link de inscrição**: já podemos exibir usando `qrcode.react` (provavelmente já no projeto via SmartCard) ou adicionar
- **Componentes reutilizados**: `Card`, `Button`, `Input`, `Dialog`, `Tabs`, `Badge`, `DashboardSidebar`, `ProtectedRoute`

---

## Fora de escopo desta entrega

- Pagamento via gateway (Asaas) — explicitamente manual nesta versão
- Leitor QR funcional para check-in — só estrutura
- Comunicação automática (email/WhatsApp transacional) — organizador faz manualmente
- Lista de espera quando esgotam vagas

