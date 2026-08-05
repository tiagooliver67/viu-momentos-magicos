# Plano: Correção de Conflito de Cliques no Dashboard do Evento

Identificamos que o clique no `StatusDropdown` (localizado dentro do banner do evento) está propagando para o elemento pai (o banner), que por sua vez dispara a abertura do seletor de arquivos para troca da capa.

## Alterações Propostas

### 1. Componente `StatusDropdown`
- Adicionar `e.stopPropagation()` no evento de clique do botão principal do dropdown.
- Isso garantirá que o clique para abrir o menu de status não "suba" para o banner.

### 2. Página `EventDashboard`
- Reforçar a prevenção de propagação no wrapper onde o `StatusDropdown` é renderizado, garantindo isolamento total de eventos.

## Validação
- Abrir o dashboard de um evento.
- Clicar no botão de status (ex: "Ativo").
- Verificar se o menu de status abre normalmente **sem** abrir o seletor de arquivos do sistema.
- Clicar em qualquer outra área do banner (fora do dropdown) e verificar se a troca de capa continua funcionando.
