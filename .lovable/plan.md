# Auditoria: fotos ficam brancas no upload/dashboard

## Diagnóstico
O problema está **principalmente no frontend atual do dashboard**, não em um bloqueio geral externo de WebP.

### Evidências encontradas
- No banco, as fotos novas estão sendo salvas com o novo caminho multi-tenant:
  - `usuarios/{userId}/eventos/{eventId}/fotos/...`
- O código público do site (`src/pages/EventPage.tsx`) já usa a lógica nova de miniaturas:
  - monta `/thumb/...webp`
  - usa CDN diretamente quando disponível
- O componente do dashboard (`src/components/event/PhotoGallery.tsx`) **ainda está preso à lógica antiga**:
  - só trata paths que começam com `eventos/`
  - ignora paths que começam com `usuarios/`
  - nesses casos, usa `photo.file_url` cru no `<img src>`
- Testei URLs reais de thumbs no CDN para esse evento e elas responderam **200 OK** com `content-type: image/webp`.

## Conclusão da auditoria
### O que é interno
- O dashboard/gerenciador de fotos está montando a URL errada para as imagens após a mudança para a estrutura `usuarios/{userId}/...`.
- Por isso as miniaturas ficam brancas ali.

### O que não parece ser o problema principal
- **Não há evidência de bloqueio de WebP no frontend como um todo.**
- **Não há evidência, nas amostras testadas, de falha externa geral no CDN/S3**, porque os thumbs `.webp` existem e respondem corretamente.

### Por que ao clicar no site aparece
- A página pública (`EventPage`) já está buscando a miniatura/medium com a lógica nova.
- O dashboard (`PhotoGallery`) não foi atualizado junto e ficou incompatível com o novo formato de caminho.

## Plano de correção
1. **Unificar a resolução de URLs no dashboard**
   - Fazer `PhotoGallery` parar de depender de `startsWith("eventos/")`.
   - Tratar `usuarios/...` como caminho válido de storage.

2. **Usar a mesma estratégia do site público no dashboard**
   - Grid: carregar `thumb/.webp`
   - Lightbox: carregar `medium/.webp` ou original assinado quando fizer sentido
   - Reaproveitar helpers de `cdnConfig.ts`

3. **Adicionar fallback e rastreabilidade**
   - `onError` nas imagens para registrar falha real de carregamento
   - fallback visual quando a thumb não existir
   - isso separa claramente erro interno de erro externo em próximas auditorias

4. **Validar após ajuste**
   - conferir dashboard do evento com fotos novas
   - conferir que as requests vão para `usuarios/.../thumb/*.webp`
   - confirmar que o site público continua funcionando

## Resultado esperado
- As fotos deixam de aparecer brancas no gerenciador.
- O comportamento do dashboard fica consistente com o site público.
- Se houver algum caso realmente externo no futuro, ele ficará explícito via erro de carregamento, em vez de “blanco silencioso”.

Se você quiser, no próximo passo eu implemento essa correção no dashboard e valido o fluxo inteiro.