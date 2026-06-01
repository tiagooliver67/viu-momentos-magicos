# Deploy de Produção — Lambda + SQS para OCR de Números de Peito

Este guia configura o pipeline automático: cada upload em `viufoto-images-bucket` aciona
OCR via Rekognition e grava em `photo_bib_numbers` sem intervenção manual.

## Arquitetura

```
S3 (PutObject /fotos/*.jpg)
   ↓ Event Notification
SQS viufoto-bib-queue (visibility 360s, DLQ após 3 tentativas)
   ↓ Event Source Mapping (batch 5)
Lambda viufoto-bib-detector (Node 20, 512MB, 60s)
   ↓ DetectText + INSERT
Supabase: photo_bib_numbers / event_photos.bibs_indexed_at
```

## Pré-requisitos

- AWS CLI v2 configurado em `sa-east-1`
- Bucket S3: `viufoto-images-bucket`
- Secrets do Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## 1. SQS + DLQ

```bash
aws sqs create-queue --region sa-east-1 --queue-name viufoto-bib-dlq
aws sqs create-queue --region sa-east-1 --queue-name viufoto-bib-queue \
  --attributes "VisibilityTimeout=360,RedrivePolicy={\"deadLetterTargetArn\":\"arn:aws:sqs:sa-east-1:ACCOUNT_ID:viufoto-bib-dlq\",\"maxReceiveCount\":\"3\"}"
```

Pegue o ARN: `aws sqs get-queue-attributes --queue-url ... --attribute-names QueueArn`.

## 2. Permitir S3 enviar para SQS

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "s3.amazonaws.com" },
    "Action": "sqs:SendMessage",
    "Resource": "arn:aws:sqs:sa-east-1:ACCOUNT_ID:viufoto-bib-queue",
    "Condition": { "ArnLike": { "aws:SourceArn": "arn:aws:s3:::viufoto-images-bucket" } }
  }]
}
```

Aplicar: `aws sqs set-queue-attributes --queue-url ... --attributes Policy=file://policy.json`

## 3. S3 Event Notification

No console S3 → Bucket → Properties → Event notifications:
- Event types: `s3:ObjectCreated:*`
- Prefix: `usuarios/`
- Suffix: `.jpg`
- Destination: SQS `viufoto-bib-queue`

(Repita com suffix `.jpeg`, `.png` se necessário.)

## 4. IAM Role da Lambda

Policy mínima:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["rekognition:DetectText"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["s3:GetObject"], "Resource": "arn:aws:s3:::viufoto-images-bucket/*" },
    { "Effect": "Allow", "Action": ["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"], "Resource": "arn:aws:sqs:sa-east-1:ACCOUNT_ID:viufoto-bib-queue" },
    { "Effect": "Allow", "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], "Resource": "*" }
  ]
}
```

## 5. Build & Deploy Lambda

```bash
cd viufoto-lambda-bib-detector
npm install --production
zip -r ../bib-detector.zip .

aws lambda create-function --region sa-east-1 \
  --function-name viufoto-bib-detector \
  --runtime nodejs20.x --handler src/index.handler \
  --role arn:aws:iam::ACCOUNT_ID:role/viufoto-bib-detector-role \
  --timeout 60 --memory-size 512 \
  --zip-file fileb://../bib-detector.zip \
  --environment "Variables={SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...,S3_BUCKET=viufoto-images-bucket,AWS_REGION_REK=sa-east-1}"
```

## 6. Conectar SQS → Lambda

```bash
aws lambda create-event-source-mapping --region sa-east-1 \
  --function-name viufoto-bib-detector \
  --event-source-arn arn:aws:sqs:sa-east-1:ACCOUNT_ID:viufoto-bib-queue \
  --batch-size 5
```

## 7. Validação

1. Suba uma foto teste no app.
2. Acompanhe SQS → mensagens entrando/saindo.
3. `aws logs tail /aws/lambda/viufoto-bib-detector --follow`
4. Conferir `photo_bib_numbers` no banco.
5. Buscar pelo número no `/evento/:id` — foto deve aparecer.

## Validação Imediata (sem AWS Console)

Antes do deploy completo, use o botão **"Reindexar números de peito"** no admin
(`/admin/eventos`) — chama a Edge Function `bib-reindex-event` que faz OCR sob demanda
em um evento existente. Útil para validar OCR + busca antes de ligar o pipeline automático.