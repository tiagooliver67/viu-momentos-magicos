## Upgrade do Painel do Organizador (Módulo Inscrições)

Vou transformar o formulário/edição de eventos de inscrição em uma ferramenta completa de gestão, com lotes dinâmicos, modalidades com vagas individuais, grade de camisetas com estoque, desconto 60+ automático, dashboard de resumo e melhorias no checkout manual.

### 1. Mudanças no banco de dados (migração)

Novas tabelas:
- `registration_price_tiers` (lotes): `id`, `registration_event_id`, `name`, `price`, `starts_at`, `ends_at`, `sort_order`
- `registration_categories` (modalidades): `id`, `registration_event_id`, `name` (ex: "5km"), `max_slots` (nullable), `sort_order`
- `registration_shirt_stock` (grade camisetas): `id`, `registration_event_id`, `size`, `quantity`, `sort_order`

Alterações em `registration_events`:
- `regulation_file_url` (text, nullable) — para PDF anexado
- `payment_instructions` (text, nullable)
- `senior_discount_enabled` (boolean, default false)
- `senior_discount_min_age` (integer, default 60)

Alterações em `event_registrations`:
- `price_tier_id` (uuid, nullable) — qual lote o atleta pegou
- `amount_due` (numeric) — valor congelado no momento da inscrição
- `senior_discount_applied` (boolean, default false)
- Tornar `phone` NOT NULL (já existe, garantir validação client-side obrigatória)

RLS: organizador dono do evento gerencia (CRUD) os 3 novos relacionados; público lê (necessário para a página pública mostrar lotes/modalidades/estoque).

Os campos antigos `pix_amount`, `categories`, `shirt_sizes`, `max_slots` permanecem por compatibilidade mas o UI passa a usar as novas estruturas. Faço um fallback simples na página pública.

### 2. UI — `InscricaoForm.tsx` (criar/editar)

Reestruturar em seções colapsáveis:
- Dados básicos (nome, descrição, capa, data, hora, local, categoria, status)
- **Modalidades** — lista editável (nome + vagas), botão "+ Adicionar modalidade"
- **Lotes de preço** — tabela editável (nome, início, fim, valor), botão "+ Adicionar lote"
- **Regulamento** — Tabs: "Escrever texto" | "Anexar PDF" (upload no bucket `registration-assets`)
- **Camisetas** — toggle "Pedir tamanho"; quando ativo, grade editável (tamanho + quantidade disponível). Tamanhos sugeridos pré-preenchidos (PP/P/M/G/GG/XG/Baby Look).
- **Desconto 60+** — toggle + idade mínima
- **Pagamento manual** — chave Pix, WhatsApp, campo "Instruções de pagamento"
- Validação obrigatória: telefone do atleta (configurar no schema da inscrição pública)

### 3. UI — `InscricaoDetail.tsx` (Dashboard de Resumo)

No topo, adicionar 4 cards:
- **Total Inscritos** (X pagos / Y pendentes)
- **Arrecadação Prevista** (soma `amount_due` de todos)
- **Arrecadação Real** (soma `amount_due` apenas com `payment_status = 'pago'`)
- **Top Modalidade** (categoria com mais inscritos)

### 4. UI — `InscricaoPublic.tsx` (formulário público do atleta)

- Selecionar **Modalidade** (com contador de vagas; bloqueia esgotada)
- Mostrar **Lote ativo** automaticamente conforme data atual; preço congelado calculado em tempo real
- Selecionar **Tamanho de camiseta** com tamanhos esgotados riscados/desabilitados
- Telefone (WhatsApp) **obrigatório** com máscara
- Se `senior_discount_enabled` e idade ≥ mínimo (calculado pela data de nascimento), aplicar 50% automaticamente e mostrar badge "Desconto 60+ aplicado"
- Bloco de pagamento: chave Pix com **botão "Copiar chave Pix"**, valor a pagar destacado, instruções de pagamento personalizadas, link WhatsApp para envio do comprovante

### 5. Helper / lib

Em `src/lib/inscricoes.ts` adicionar:
- `getActiveTier(tiers, now)` — retorna o lote ativo agora
- `calculateAge(birthDate)` 
- `applySeniorDiscount(price, birthDate, enabled, minAge)`
- `getAvailableSlots(category, registrations)` e `getAvailableShirtStock(...)`

### Fora do escopo
- Pagamento online (continua manual via Pix)
- QR Code de check-in (módulo já preparado)
- Relatórios PDF/Excel avançados (mantém exportação atual)
- Edição da landing `/para-organizadores`

### Arquivos afetados
- **Migração nova** (3 tabelas + alterações em 2)
- `src/lib/inscricoes.ts` — novas helpers
- `src/pages/inscricoes/InscricaoForm.tsx` — reescrita parcial
- `src/pages/inscricoes/InscricaoDetail.tsx` — adicionar cards de resumo
- `src/pages/inscricoes/InscricaoPublic.tsx` — selects de modalidade/lote/camiseta + desconto + Pix copy
