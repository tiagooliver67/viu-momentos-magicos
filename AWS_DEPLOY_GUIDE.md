# 🚀 Deploy Guide — AWS Lambda + Sharp + S3 + CloudFront

Pipeline: **Upload → S3 → Lambda (Sharp) → thumb/medium + watermark → CloudFront → Usuário**

---

## 📋 Pré-requisitos

- Conta AWS com acesso a Lambda, S3, CloudFront, IAM
- AWS CLI configurado (`aws configure`)
- Node.js 18+ local (para build da Lambda)
- Bucket S3: `viufoto-images-bucket` (região: `sa-east-1`)

---

## 1️⃣ Build da Lambda

```bash
cd viufoto-lambda-sharp
npm install
zip -r ../viufoto-lambda.zip .
```

> ⚠️ **Sharp precisa de binários Linux x64**. Se estiver buildando no Mac/Windows:
> ```bash
> npm install --platform=linux --arch=x64 sharp
> ```

---

## 2️⃣ Criar IAM Role

### Console AWS → IAM → Roles → Create Role

- **Trusted Entity**: AWS Service → Lambda
- **Nome**: `viufoto-lambda-image-processor`

### Policy (JSON):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::viufoto-images-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:sa-east-1:*:*"
    }
  ]
}
```

---

## 3️⃣ Deploy da Lambda

### Via AWS CLI:
```bash
aws lambda create-function \
  --function-name viufoto-image-processor \
  --runtime nodejs18.x \
  --handler src/index.handler \
  --role arn:aws:iam::<ACCOUNT_ID>:role/viufoto-lambda-image-processor \
  --zip-file fileb://viufoto-lambda.zip \
  --timeout 60 \
  --memory-size 1024 \
  --region sa-east-1
```

### Via Console:
1. Lambda → Create function → Author from scratch
2. **Nome**: `viufoto-image-processor`
3. **Runtime**: Node.js 18.x
4. **Architecture**: x86_64
5. **Role**: `viufoto-lambda-image-processor`
6. Upload do ZIP
7. **Handler**: `src/index.handler`
8. **Timeout**: 60s | **Memory**: 1024MB

---

## 4️⃣ Configurar S3 Trigger

### Console AWS → S3 → viufoto-images-bucket → Properties → Event Notifications

1. **Create event notification**
2. **Nome**: `process-new-photos`
3. **Prefix**: `eventos/`
4. **Suffix**: `.jpg` (criar uma notificação para cada formato)
   - Repetir para `.jpeg`, `.png`, `.webp`
5. **Event type**: `PUT` (s3:ObjectCreated:Put)
6. **Destination**: Lambda function → `viufoto-image-processor`

> ⚠️ O trigger NÃO deve ativar para paths que contêm `/thumb/` ou `/medium/` — 
> a Lambda já faz essa verificação no código e ignora automaticamente.

---

## 5️⃣ Watermark Default

Upload da watermark padrão para o bucket:

```bash
aws s3 cp watermark-default.png s3://viufoto-images-bucket/config/watermark-default.png
```

Para watermark personalizada por evento:
```
s3://viufoto-images-bucket/eventos/{eventId}/config/watermark.png
```

---

## 6️⃣ Configurar CloudFront

### Console AWS → CloudFront → Create Distribution

#### Origin:
- **Origin domain**: `viufoto-images-bucket.s3.sa-east-1.amazonaws.com`
- **Origin access**: Origin Access Control (OAC)
  - Create new OAC → Sign requests (recommended)
- **Origin path**: (vazio)

#### Default Cache Behavior:
- **Viewer protocol policy**: Redirect HTTP to HTTPS
- **Allowed HTTP methods**: GET, HEAD
- **Cache policy**: CachingOptimized
- **Compress objects**: Yes (Gzip + Brotli)

#### Custom Cache Behaviors (criar 2):

**Behavior 1 — Thumbs (público, cache longo)**
- Path pattern: `eventos/*/fotos/thumb/*`
- Cache policy: CachingOptimized (TTL 365 dias)
- No signed URLs needed

**Behavior 2 — Medium (público, cache longo)**
- Path pattern: `eventos/*/fotos/medium/*`
- Cache policy: CachingOptimized (TTL 365 dias)
- No signed URLs needed

**Default behavior — Originais (bloqueado)**
- Restrict viewer access: Yes
- Trusted signers or trusted key groups (para URLs assinadas)

#### Settings:
- **Price class**: Use only South America, US, Europe
- **Alternate domain (CNAME)**: `cdn.viufoto.com` (opcional)
- **SSL certificate**: Request via ACM (se usando domínio custom)

### Atualizar S3 Bucket Policy (copiar do CloudFront):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::viufoto-images-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
        }
      }
    }
  ]
}
```

---

## 7️⃣ Configurar Frontend (Lovable)

Após o CloudFront estar funcionando, adicione a variável de ambiente no Lovable:

```
VITE_CDN_BASE_URL=https://d1234abcdef.cloudfront.net
```

Ou com domínio custom:
```
VITE_CDN_BASE_URL=https://cdn.viufoto.com
```

> Quando essa variável está definida, o frontend automaticamente:
> - Usa URLs da CDN para thumb/medium (sem chamadas à Edge Function)
> - Pula processamento client-side de watermark no upload
> - Mantém URLs assinadas apenas para originais (pós-compra)

---

## 8️⃣ Teste

### Teste Manual:
```bash
# Upload de uma imagem de teste
aws s3 cp foto-teste.jpg s3://viufoto-images-bucket/eventos/test-123/fotos/foto-teste.jpg

# Verificar após ~10s
aws s3 ls s3://viufoto-images-bucket/eventos/test-123/fotos/thumb/
aws s3 ls s3://viufoto-images-bucket/eventos/test-123/fotos/medium/

# Testar via CDN
curl -I https://<cloudfront-domain>/eventos/test-123/fotos/thumb/foto-teste.jpg
```

### Checklist:
- [ ] Lambda é invocada no upload
- [ ] Thumb (400px) gerado corretamente
- [ ] Medium (1200px) gerado corretamente
- [ ] Watermark aplicada em thumb e medium
- [ ] Original NÃO tem watermark
- [ ] CloudFront serve thumb/medium publicamente
- [ ] Original requer URL assinada
- [ ] Performance OK no mobile
- [ ] Sem erros no console

---

## 9️⃣ Monitoramento

### CloudWatch Logs:
```bash
aws logs tail /aws/lambda/viufoto-image-processor --follow
```

### Métricas recomendadas:
- Lambda: Duration, Errors, Throttles
- CloudFront: Requests, Cache Hit Rate, 4xx/5xx errors
- S3: PutRequests (uploads)

---

## 🔒 Segurança

| Recurso | Acesso |
|---------|--------|
| Original (`eventos/{id}/fotos/*.jpg`) | ❌ Privado — URL assinada pós-compra |
| Thumb (`eventos/{id}/fotos/thumb/*.jpg`) | ✅ Público via CDN (com watermark) |
| Medium (`eventos/{id}/fotos/medium/*.jpg`) | ✅ Público via CDN (com watermark) |
| Watermark (`config/watermark-default.png`) | ❌ Privado — só Lambda acessa |

---

## 📊 Performance Esperada

| Métrica | Antes (client-side) | Depois (Lambda + CDN) |
|---------|--------------------|-----------------------|
| Processamento | Browser (Canvas) | Lambda (Sharp) |
| Tempo de geração | ~2-5s por foto | ~1-2s por foto |
| Entrega | S3 signed URLs | CloudFront edge cache |
| Latência thumb | ~800ms | ~50-100ms (cache hit) |
| Carga no browser | Alta (CPU) | Zero |
