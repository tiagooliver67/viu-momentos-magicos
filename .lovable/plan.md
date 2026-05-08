## Objetivo

Na aba **Inscritos** do painel do organizador, mostrar todos os dados que o atleta preencheu no formulário (WhatsApp, CPF, data de nascimento, equipe) e permitir que o organizador clique no número do WhatsApp para abrir uma conversa já com mensagem pré-pronta.

## Mudanças (apenas em `src/pages/inscricoes/InscricaoDetail.tsx`)

### 1. Coluna "Contato" enriquecida
Substituir o bloco atual `email + phone` por:
- **E-mail** (texto)
- **WhatsApp** como link clicável (`<a href="https://wa.me/55{phone}?text=...">`) com ícone do WhatsApp (verde) + número formatado. Ao clicar, abre o WhatsApp Web/app já com a mensagem:

  > "Olá {primeiro nome}, aqui é {nome do organizador / evento}, organizador do evento *{nome do evento}*."

  Usaremos `event.name` para o nome do evento. O nome do organizador virá de `profile.full_name` (já temos via `useAuth`) — fallback para apenas "organizador do evento".

### 2. Nova coluna "Documentos"
Adicionar coluna entre **Contato** e **Categoria** mostrando:
- **CPF** formatado (`000.000.000-00`)
- **Nasc.:** `DD/MM/AAAA` (a partir de `birth_date`)

### 3. Categoria + extras
Na coluna **Categoria**, mostrar também:
- **Equipe:** {team} (se preenchido)
- **Camiseta:** {shirt_size} (se preenchido)

### 4. Helpers locais
Adicionar dentro do arquivo:
- `formatCPF(digits)` → `000.000.000-00`
- `formatPhone(digits)` → `(00) 00000-0000`
- `firstName(full)` → primeiro token

### 5. Sem alterações de banco
Todos os campos (`cpf`, `phone`, `birth_date`, `team`, `shirt_size`) já existem em `event_registrations` e já são exibidos/coletados no formulário público. Apenas leitura no painel.

## Layout esperado da linha

```
Nome             | Contato                       | Documentos          | Categoria         | Pagamento | Comprovante | Ações
Tiago Oliveira   | tiagooliver74@gmail.com       | CPF 000.000.000-00  | 10 km             | Pago      | Ver         | Marcar pendente
                 | [WhatsApp] (74) 99975-8969 ↗  | Nasc. 12/08/1990    | Equipe: Run Crew  |
                 |                               |                     | Camiseta: G       |
```

O link de WhatsApp usa `https://wa.me/55{somente dígitos}?text={encodeURIComponent(mensagem)}` e abre em nova aba.

## Fora de escopo

- Modal de detalhes (mantemos tudo inline na tabela por enquanto).
- Mudanças no formulário público ou no banco.
- Edição de inscrito.
