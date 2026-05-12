## Objetivo
1. Paginar a galeria de fotos do evento em **32 fotos por página**, com paginação numérica (1, 2, 3, …, próximo) — semelhante ao print do concorrente.
2. Exibir um **Termo de Uso das Fotos (padrão VIUFOTO)** sempre que o cliente abrir uma foto individualmente (modal/lightbox no `EventPage` e na página `FotoPage`).

## Escopo

### 1. Paginação no `src/pages/EventPage.tsx`
- Hoje todas as fotos são renderizadas de uma vez (sem paginação).
- Adicionar:
  - Constante `PHOTOS_PER_PAGE = 32`.
  - Estado `page` (default 1), reset ao trocar busca/filtro.
  - `paginatedPhotos = photoList.slice((page-1)*32, page*32)` para renderização do grid.
  - `totalPages = Math.ceil(photoList.length / 32)`.
  - Buscar URLs assinadas só das 32 fotos da página visível (otimização — evita gerar 320 URLs de uma vez).
- Componente de paginação numérica abaixo do grid, mobile-first:
  - Botões: `1 2 3 4 5 … ▶` (com ellipsis se passar de 7 páginas).
  - Página atual destacada com `bg-primary`.
  - Texto auxiliar: "Página X de Y".
  - Scroll suave para o topo do grid ao trocar de página.
- Manter scroll/posição quando volta do `FotoPage` (opcional — via querystring `?page=2`).

### 2. Termo de Uso na visualização individual
- Criar componente reutilizável `src/components/PhotoTermsFooter.tsx` com o texto padrão VIUFOTO:

  > **TERMO DE USO DAS FOTOS**
  > As fotos disponibilizadas são para uso exclusivamente pessoal, incluindo divulgação em redes sociais. Não é permitido a comercialização das mesmas, assim como a divulgação editorial, publicitária e qualquer outro fim sem autorização por escrito da VIUFOTO e do(s) fotografado(s).

- Aplicar em **dois lugares**:
  1. **Lightbox/modal de foto individual no `EventPage.tsx`** (quando o usuário clica em "Ver opções disponíveis" / abre a foto grande) — exibir abaixo do painel de compra.
  2. **`src/pages/FotoPage.tsx`** — abaixo da imagem e do painel de compra, antes do footer.
- Estilo: texto centralizado, `text-xs text-muted-foreground`, título `font-bold text-foreground`, espaçamento generoso (mt-12), separador sutil (`border-t`).

## Arquivos a alterar
- `src/pages/EventPage.tsx` — adicionar paginação + footer de termos no modal/lightbox.
- `src/pages/FotoPage.tsx` — adicionar footer de termos.
- `src/components/PhotoTermsFooter.tsx` — **novo** componente reutilizável.

## Fora do escopo
- Não alterar o gerenciador interno do fotógrafo (`PhotoGallery.tsx`) — ele já tem paginação própria de 20 (uso administrativo).
- Não alterar o `TermosDeUso.tsx` (página de termos gerais do site).
- Sem mudanças no backend, RLS ou edge functions.

## Texto do termo — confirmar
Vou usar o texto padrão acima (idêntico ao print do concorrente, trocando "Fotop" por "VIUFOTO"). Se você quiser uma redação diferente (ex.: incluir Lei 9.610/98, citar nome do fotógrafo do evento, link para os Termos completos), me diga antes de implementar.