# Plano de Correção: Mensagem de "Sem movimentações financeiras" Incorreta no Dashboard do Evento

O usuário relatou que a mensagem "Sem movimentações financeiras" está aparecendo no dashboard do evento mesmo quando não deveria (ou de forma confusa no layout). Analisando o código e o print, identifiquei que o componente `EventFinancialCenter.tsx` exibe esse estado quando `data?.orders.length` é zero ou está indefinido.

## Problemas Identificados
1. **Lógica de Empty State**: O componente `EventFinancialCenter` exibe a mensagem de "Sem movimentações" se não houver pedidos carregados. Se o hook `useEventFinancials` falhar ou demorar, o estado de `isLoading` deveria proteger a interface, mas se a query retornar um array vazio antes do esperado ou se houver um delay na sincronização, o usuário vê o erro.
2. **Contexto de Exibição**: O print mostra a mensagem no lado direito da tela, indicando que o `EventFinancialCenter` está sendo renderizado como parte do layout principal ou dentro de um modal que não está ocupando a tela inteira corretamente.
3. **Mapeamento de Dados**: No `EventDashboard.tsx`, as estatísticas rápidas são calculadas localmente (`totalRevenue`, `paidOrders`), enquanto o `EventFinancialCenter` busca seus próprios dados via `useEventFinancials`. Essa duplicidade pode causar inconsistências visuais.

## Ações Propostas
1. **Refinar `EventFinancialCenter.tsx`**:
   - Ajustar a verificação de `isLoading` e dados para garantir que a mensagem de "Sem movimentações" só apareça após a confirmação real de que não existem pedidos no banco.
   - Adicionar uma verificação de erro explícita para não mostrar "Sem movimentações" se a API falhar.
2. **Sincronizar Hooks**: Garantir que `useEventOrders` (usado no Dashboard) e `useEventFinancials` (usado no Centro Financeiro) estejam alinhados ou centralizar a busca.
3. **Ajuste de Layout**: Verificar o container onde o `EventFinancialCenter` é renderizado para evitar que ele "vaze" ou apareça fora de contexto no dashboard.

## Validação
- Abrir o dashboard de um evento com vendas e verificar se os dados aparecem corretamente.
- Abrir o dashboard de um evento sem vendas e verificar se a mensagem de empty state está centralizada e estilizada conforme o padrão ViuFoto.
