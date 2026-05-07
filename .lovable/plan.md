## Diagnóstico

**1. Por que aparece "Capa" em toda foto?**
No `src/components/event/PhotoGallery.tsx` (linha 341-344), o badge "Capa" está **hardcoded** em todas as fotos da grade — é um bug. A nomenclatura vem do conceito de "foto de capa do evento" (a imagem usada no card do evento na home), mas hoje o componente exibe o rótulo indiscriminadamente em todos os thumbnails, sem checar se aquela foto é realmente a capa (`events.cover_url`).

**2. Por que "não acha" como deletar?**
O botão de deletar (ícone X) já existe (linha 346), mas está dentro de um `opacity-0 group-hover:opacity-100` — só aparece quando o mouse passa por cima. **No celular não existe hover**, então o botão fica invisível. Além disso, não há confirmação nem ação de deletar em massa.

## Plano

### Correções no `PhotoGallery.tsx`

1. **Badge "Capa" condicional**
   - Receber `coverUrl` (de `event.cover_url`) como prop.
   - Mostrar o badge "Capa" **somente** na foto cuja `file_url` corresponde a `coverUrl`.
   - Adicionar ação no menu da foto (`MoreVertical`) para "Definir como capa", chamando um handler `onSetCover(photoId)` que atualiza `events.cover_url` no banco.

2. **Deletar visível no mobile**
   - Tornar os botões de ação (X e ⋮) sempre visíveis em telas `< sm` (remover `opacity-0` no mobile, manter hover-reveal só no desktop).
   - Adicionar confirmação antes de deletar (AlertDialog do shadcn) com mensagem "Excluir esta foto? Esta ação não pode ser desfeita."

3. **Seleção múltipla + deletar em lote**
   - Os checkboxes no rodapé já existem mas não fazem nada. Conectá-los a um state `selectedIds: Set<string>`.
   - Quando houver ≥1 selecionada, mostrar uma **barra de ações fixa no topo da galeria** com "X fotos selecionadas" e botão "Excluir selecionadas".
   - Handler `onBulkDelete(ids[])` com confirmação única.

### Atualização em `EventDashboard.tsx`

- Passar `coverUrl={event?.cover_url}` para `<PhotoGallery>`.
- Implementar `onSetCover`: `update events set cover_url = <file_url> where id = eventId` + invalidate query.
- Implementar `onBulkDelete`: deletar registros em `event_photos` (manter S3 cleanup como está hoje, se já existe no `onDelete` atual; senão apenas remover do banco).

### Sobre a nomenclatura

"Capa" = foto de capa do evento (a imagem que aparece no card do evento na listagem pública e no header de `/evento/:id`). Vamos manter o termo, mas ele só aparecerá na foto correta. Se preferir outro rótulo (ex: "Foto de capa", "Destaque"), posso trocar.

## Arquivos afetados

- `src/components/event/PhotoGallery.tsx` — badge condicional, ações sempre visíveis no mobile, confirmação, seleção em massa.
- `src/pages/EventDashboard.tsx` — passar `coverUrl`, implementar `onSetCover` e `onBulkDelete`.

Nada de mudanças no banco — `events.cover_url` e `event_photos` já existem.
