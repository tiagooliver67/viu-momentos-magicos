# viufoto-image-processor (Lambda)

Gera `thumb/` (500px, q80) e `medium/` (1200px, q85) em WebP a partir do original
enviado ao S3, aplicando marca d'água e disparando o Rekognition.

## Novidades desta versão (2.0.0)

1. **Bug do `userId` corrigido** — antes `key.split("/")` atribuía o array inteiro.
   Agora `extractEventId()` extrai o `event_id` real de `eventos/{id}/fotos/...`
   (com compatibilidade para `usuarios/{id}/...` e fallback `"default"`).
2. **Marca d'água por evento** — consulta `watermark_configs` (PostgREST) pelo
   `event_id` e monta o composite do Sharp dinamicamente, suportando os modos
   `standard`, `repeated` e `full_fill`, aplicando as camadas em ordem
   (`image_url`, `size`, `opacity`, `rotation`, `position`, `spacing`).
   Sem config → **fallback idêntico ao comportamento atual**
   (`assets/default-watermark-horizontal.png` / `-vertical.png` em cobertura total,
   escolhida pela orientação EXIF efetiva).
3. **Cache em memória** — config por `event_id` e imagens das camadas com TTL de
   5 minutos (module-level), evitando consulta ao banco a cada foto.
4. **Runtime Node.js 22.x** — `sharp@0.33.5` e `@aws-sdk/*` v3 são compatíveis.

## Variáveis de ambiente necessárias

| Nome | Uso |
|---|---|
| `SUPABASE_URL` | base do PostgREST |
| `SUPABASE_SERVICE_ROLE_KEY` | leitura de `watermark_configs` |

Sem essas variáveis a função **não quebra**: ela simplesmente cai no fallback
da marca d'água padrão.

## Deploy

```bash
npm install --omit=dev --os=linux --cpu=x64 --libc=glibc sharp
npm install --omit=dev
zip -r function.zip src node_modules package.json
aws lambda update-function-code --function-name viufoto-image-processor --zip-file fileb://function.zip --region sa-east-1
aws lambda update-function-configuration --function-name viufoto-image-processor --runtime nodejs22.x --region sa-east-1
```

## Rollback

Checkpoint registrado: versão anterior (Node.js 20.x), hash SHA256
`r8i6wq/ehJElQ08BITIBhWHHWcdq7S+SK4ljarRFwOg=`. Em caso de bug recorrente,
restaurar esse pacote e voltar o runtime para `nodejs20.x`.

## Testes recomendados antes de produção

- Evento **com** `watermark_configs`: camadas aparecem conforme configurado.
- Evento **sem** config: resultado idêntico ao atual (cobertura total).
- Foto **vertical** e **horizontal** em ambos os casos (EXIF não pode regredir).
- Comparar visualmente `full_fill` novo vs. comportamento atual — devem ser equivalentes.
