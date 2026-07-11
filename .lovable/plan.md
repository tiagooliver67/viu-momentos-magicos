# Frente A — Fix Lambda BIB (resize + convert antes do Rekognition)

## Mudanças de código

**1. `viufoto-lambda-bib-detector/package.json`** — adicionar `sharp`:

```json
"sharp": "^0.33.5"
```

**2. `viufoto-lambda-bib-detector/src/index.js`** — nova função `prepareForRekognition()` e simplificação de `detectText()`:

- Constantes: `TARGET_MAX_BYTES = 4MB`, `TARGET_MAX_SIDE = 2000px`.
- `prepareForRekognition(bytes, s3Key)`:
  - Se extensão é `webp|heic|heif|tif|tiff|avif` → converte para JPEG.
  - Se `bytes > 4MB` OU precisa converter → passa por `sharp`:
    - `.rotate()` para aplicar EXIF orientation.
    - `.resize({ ..., fit: "inside", withoutEnlargement: true })` limitando o lado maior a 2000 px.
    - `.jpeg({ quality: q, mozjpeg: true })` tentando `q = 88 → 78 → 68 → 58` até caber em 4 MB.
    - Se ainda não couber: força `1600×1600` com `q = 60` (fallback duro).
  - Se já é JPEG/PNG ≤ 4 MB → devolve os bytes originais sem tocar.
- `detectText(s3Key)`: remove o caminho `S3Object` (não funciona cross-region + não aceita WebP). Sempre baixa do S3, chama `prepareForRekognition`, envia bytes ao `DetectTextCommand`.
- Mantém o resto do handler intacto (parse de eventos SNS/SQS, `bumpProgress`, `bib_detection_errors`, etc.).

Nenhuma mudança de schema, RLS, secret ou UI.

## Comando de deploy (para você rodar depois)

`sharp` tem binário nativo — precisa ser instalado para a plataforma da Lambda (`linux-x64`), então **não use `npm install` do seu Mac direto**. Faça assim:

```bash
cd viufoto-lambda-bib-detector

# limpa qualquer instalação anterior (binários errados do host)
rm -rf node_modules package-lock.json

# instala forçando o binário Linux x64 que a Lambda usa
npm install --omit=dev \
  --os=linux --cpu=x64 \
  --libc=glibc \
  sharp @aws-sdk/client-rekognition @aws-sdk/client-s3 @supabase/supabase-js

# empacota
rm -f ../bib-detector.zip
zip -rq ../bib-detector.zip src node_modules package.json

# publica no Lambda
aws lambda update-function-code \
  --region sa-east-1 \
  --function-name viufoto-bib-detector \
  --zip-file fileb://../bib-detector.zip

# (opcional) aumenta memória — sharp gosta de RAM, 512MB é apertado
aws lambda update-function-configuration \
  --region sa-east-1 \
  --function-name viufoto-bib-detector \
  --memory-size 1024 --timeout 90
```

Se seu ambiente for Windows, roda dentro do WSL/Linux ou usa Docker `public.ecr.aws/lambda/nodejs:20` para o `npm install`.

## Validação após o deploy

1. Subir 1 foto grande (>5 MB) e 1 WebP em evento de teste.
2. `aws logs tail /aws/lambda/viufoto-bib-detector --follow --region sa-east-1` — procurar linhas `[bib] sharp prepared bytes=...`.
3. Consulta: `SELECT error_code, count(*) FROM bib_detection_errors WHERE created_at > now() - interval '10 minutes' GROUP BY 1;` — não deve aparecer `ImageTooLargeException` nem `InvalidImageFormatException`.
4. `IndexingProgressCard` no `/admin/eventos/:id` deve avançar processadas em tempo real.

## Depois que confirmar sucesso

- Rodar `bib-reindex-event` uma vez por evento afetado (58 pending + 26 error) — o botão "Reprocessar OCR" no admin já dispara isso.
- (Opcional) purgar os 63k `bib_detection_errors` antigos com `ImageTooLargeException` (mantendo últimos 7 dias para auditoria).

## Fora do escopo desta rodada

- Frente B1 (IndexFaces na mesma Lambda) — fica para a próxima confirmação.
- Backfill via edge function — fica para depois do fix A validado.
- Lambda Sharp de derivadas + CloudFront — backlog separado.
