## Diagnóstico

As fotos estão sendo exibidas **sem marca d'água** porque, no estado atual, o frontend está servindo **o arquivo original** em vez da versão thumb/medium com watermark cravada.

### Arquitetura desenhada (como deveria funcionar)

A ViuFoto tem duas estratégias para entregar fotos com marca d'água:

1. **Pipeline Lambda + CloudFront (produção):** quando a env var `VITE_CDN_BASE_URL` existe, a Lambda no AWS gera automaticamente `eventos/{id}/fotos/thumb/*.jpg` e `medium/*.jpg` com watermark cravada via Sharp, e o frontend monta URLs públicas da CDN para essas variantes. O original fica privado.
2. **Fallback client-side:** quando `VITE_CDN_BASE_URL` não está setada, o `useS3Upload` faz o resize + bake da watermark no navegador (`resizeImageWithWatermark`) e faz upload de 3 arquivos: original, thumb e medium.

### O que está acontecendo na prática

1. `VITE_CDN_BASE_URL` **não está configurada** no `.env` → `IS_LAMBDA_PIPELINE_ACTIVE = false`.
2. Portanto, deveria valer o fallback client-side. Porém, em `src/pages/EventPage.tsx` (linhas 117–119) o branch de fallback faz:

   ```ts
   const originalPaths = photos.map((p: any) => p.file_url);
   return getPublicSignedUrls(originalPaths);
   ```

   Ou seja, a galeria pública está pedindo URL assinada do **arquivo original** — que não tem marca d'água — em vez da versão `thumb/`. O resultado: as fotos aparecem limpas.

3. O mesmo padrão é correto em `Favoritos.tsx` (que usa `toThumbPath()` antes de pedir as URLs), mas está **errado em `EventPage`**, que é justamente a página onde o cliente vê o evento.

4. Adicionalmente, a variante `medium` no lightbox também está apontando para o original (linha 141), então mesmo ao ampliar a foto ela aparece sem marca d'água.

### Possíveis causas secundárias

- Se algum upload antigo foi feito antes do código de bake client-side existir, esses registros têm somente o original no S3 (não há `thumb/` nem `medium/` correspondentes). Nesse caso, mesmo após o fix as imagens antigas vão dar 404 e cair de volta no original (ou ficar quebradas). Solução: rodar a Lambda em modo backfill, OU re-processar pelo frontend.
- A Lambda + CloudFront descrita em `AWS_DEPLOY_GUIDE.md` é a solução definitiva e provavelmente ainda não foi deployada — por isso `VITE_CDN_BASE_URL` está vazia.

## Plano de correção

### Etapa 1 — Fix imediato no EventPage (frontend)

Trocar o fallback para apontar para `thumb/` e `medium/`:

```ts
// thumbnails (grid)
const thumbPaths = photos.map(p => toThumbPath(p.file_url));
return getPublicSignedUrls(thumbPaths);

// lightbox
const mediumPath = toMediumPath(selectedPhoto.file_url);
const res = await getPublicSignedUrls([mediumPath]);
return res[mediumPath] || "";
```

E ajustar o `getPhotoUrl` do componente para procurar pelo `toThumbPath(p.file_url)` no mapa, igual já é feito no branch CDN.

### Etapa 2 — Fallback gracioso para fotos antigas

Se a URL assinada do `thumb/` retornar 404 (uploads antigos sem variantes), exibir um placeholder ou aplicar o `WatermarkCanvas` (componente que já existe e cria watermark client-side em runtime sobre o original). Isso evita que apareça a foto limpa enquanto não há reprocessamento.

### Etapa 3 — Decisão sobre infraestrutura definitiva

Recomendo deployar a Lambda + CloudFront descrita em `AWS_DEPLOY_GUIDE.md` e setar `VITE_CDN_BASE_URL`. Vantagens:

- Watermark sempre garantida (server-side, não depende do navegador do fotógrafo)
- Performance melhor (CloudFront edge cache)
- Fotos antigas são reprocessadas automaticamente ao reuploadar

Posso preparar essa decisão como uma sub-tarefa separada (rodar backfill / orientar deploy).

## O que vou implementar quando você aprovar

- Editar `src/pages/EventPage.tsx`:
  - Branch fallback (sem CDN): pedir URLs assinadas dos paths `thumb/` e `medium/` em vez do original
  - Ajustar `getThumbnailUrl` para buscar pela chave `toThumbPath(p.file_url)`
  - Adicionar onError no `<img>` para fallback (placeholder ou WatermarkCanvas dinâmico)

## Detalhes técnicos

- Arquivos afetados: `src/pages/EventPage.tsx` (e talvez um util compartilhado para resolver thumb URL com fallback).
- Sem mudanças em backend, banco ou edge functions.
- Risco baixo: o `Favoritos.tsx` já segue esse padrão e funciona corretamente, então o fix segue um padrão consolidado.
