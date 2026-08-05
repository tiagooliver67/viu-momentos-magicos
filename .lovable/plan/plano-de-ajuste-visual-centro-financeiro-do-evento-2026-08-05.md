# Plano de Ajuste Visual - Centro Financeiro do Evento

O usuário solicitou a remoção da mensagem de estado vazio ("Sem movimentações financeiras") que aparece no lado direito da página do evento (Dashboard), alegando que está prejudicando a estética.

## Alterações propostas

### 1. Componente `EventFinancialCenter.tsx`
- Remover o bloco de código que renderiza o estado vazio (`if (!data?.orders || data.orders.length === 0)`) quando o componente é usado de forma embutida (como no dashboard do evento).
- Ajustar para que, se não houver dados, o componente simplesmente não renderize nada ou renderize um estado mais discreto, mantendo a funcionalidade apenas quando o modal (`open`) estiver ativo.

### 2. Validação
- Verificar se a mensagem ainda aparece no Dashboard.
- Garantir que o modal do Centro Financeiro continue funcionando corretamente e mostrando o estado vazio quando aberto explicitamente.

## Arquivos afetados
- `src/components/event/financial/EventFinancialCenter.tsx`
