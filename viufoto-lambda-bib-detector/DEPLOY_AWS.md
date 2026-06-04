# Deploy Definitivo — OCR Automático (S3 → SNS → SQS → Lambda → Rekognition → Supabase)

Arquitetura **event-driven**, escalável para 100k+ fotos por evento, com fila reutilizável
para reconhecimento facial futuro. Sem cliques manuais; o botão "Reprocessar OCR" no admin
permanece apenas como fallback.

```text
S3 PUT (usuarios/.../fotos/*.jpg|.jpeg|.webp)
  └─ Event Notification ─► SNS  viufoto-photo-uploaded
                              ├─► SQS viufoto-bib-queue ─► Lambda viufoto-bib-detector
                              │       (DLQ: viufoto-bib-dlq, 3 retries)
                              └─► SQS viufoto-face-queue (FUTURO, face recognition)
```

- **Rekognition**: `us-east-1` (DetectText indisponível em sa-east-1 para esta conta).
- **S3 bucket**: `viufoto-images-bucket` em `sa-east-1` (não muda).
- **Lambda**: roda em `sa-east-1` (perto do S3), chama Rekognition em `us-east-1` com `Image.Bytes`.

---

## Pré-requisitos

- AWS CLI v2 configurado, `ACCOUNT_ID` exportado.
- Secrets Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Bucket `viufoto-images-bucket` já existe.

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=sa-east-1
```

---

## 1. SNS topic

```bash
aws sns create-topic --region $AWS_REGION --name viufoto-photo-uploaded
export SNS_ARN=arn:aws:sns:$AWS_REGION:$ACCOUNT_ID:viufoto-photo-uploaded

# Permitir S3 publicar no SNS
cat > /tmp/sns-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "s3.amazonaws.com" },
    "Action": "sns:Publish",
    "Resource": "$SNS_ARN",
    "Condition": { "ArnLike": { "aws:SourceArn": "arn:aws:s3:::viufoto-images-bucket" } }
  }]
}
EOF
aws sns set-topic-attributes --topic-arn $SNS_ARN \
  --attribute-name Policy --attribute-value file:///tmp/sns-policy.json
```

## 2. SQS + DLQ

```bash
aws sqs create-queue --region $AWS_REGION --queue-name viufoto-bib-dlq \
  --attributes MessageRetentionPeriod=1209600
export DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name viufoto-bib-dlq --query QueueUrl --output text) \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

aws sqs create-queue --region $AWS_REGION --queue-name viufoto-bib-queue \
  --attributes "{\"VisibilityTimeout\":\"360\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

export QUEUE_URL=$(aws sqs get-queue-url --queue-name viufoto-bib-queue --query QueueUrl --output text)
export QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url $QUEUE_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

# Permitir SNS enviar para SQS
cat > /tmp/sqs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "sns.amazonaws.com" },
    "Action": "sqs:SendMessage",
    "Resource": "$QUEUE_ARN",
    "Condition": { "ArnEquals": { "aws:SourceArn": "$SNS_ARN" } }
  }]
}
EOF
aws sqs set-queue-attributes --queue-url $QUEUE_URL \
  --attributes Policy=file:///tmp/sqs-policy.json

# Subscrever a fila no tópico (Raw delivery OFF — Lambda já trata envelope SNS)
aws sns subscribe --topic-arn $SNS_ARN --protocol sqs --notification-endpoint $QUEUE_ARN
```

## 3. S3 Event Notification → SNS

Console S3 → `viufoto-images-bucket` → Properties → Event notifications → Create:
- **Event types**: `s3:ObjectCreated:*`
- **Prefix**: `usuarios/`
- **Suffix**: criar uma notificação para cada: `.jpg`, `.jpeg`, `.webp`
- **Destination**: SNS topic → `viufoto-photo-uploaded`

> A Lambda já ignora chaves contendo `/thumb/` ou `/medium/` — variantes não são reprocessadas.

## 4. IAM Role da Lambda

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "rekognition:DetectText", "Resource": "*" },
    { "Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::viufoto-images-bucket/*" },
    { "Effect": "Allow", "Action": ["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"], "Resource": "arn:aws:sqs:sa-east-1:*:viufoto-bib-queue" },
    { "Effect": "Allow", "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], "Resource": "*" }
  ]
}
```

## 5. Build & deploy da Lambda

```bash
cd viufoto-lambda-bib-detector
npm install --production
zip -r ../bib-detector.zip .

aws lambda create-function --region $AWS_REGION \
  --function-name viufoto-bib-detector \
  --runtime nodejs20.x --handler src/index.handler \
  --role arn:aws:iam::$ACCOUNT_ID:role/viufoto-bib-detector-role \
  --timeout 60 --memory-size 512 \
  --zip-file fileb://../bib-detector.zip \
  --environment "Variables={SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...,S3_BUCKET=viufoto-images-bucket,S3_REGION=sa-east-1,REK_REGION=us-east-1,MIN_CONFIDENCE=80}"

# Limite de concorrência (evita estourar 50 TPS DetectText do Rekognition)
aws lambda put-function-concurrency --function-name viufoto-bib-detector \
  --reserved-concurrent-executions 20
```

## 6. Conectar SQS → Lambda

```bash
aws lambda create-event-source-mapping --region $AWS_REGION \
  --function-name viufoto-bib-detector \
  --event-source-arn $QUEUE_ARN \
  --batch-size 5
```

---

## Tabelas e UI já implantadas no app

Já estão em produção no Lovable Cloud / frontend:

- `event_indexing_progress` — snapshot por evento (total, processadas, erros, last_updated_at).
  Lambda faz `upsert` a cada foto; realtime publica no canal `postgres_changes`.
- `event_photos.indexing_status` — `pending | processing | done | error`.
- Trigger `tg_event_photos_progress` mantém `total_photos` sincronizado.
- Hook `useIndexingProgress(eventId)` + `<IndexingProgressCard />` no `/admin/eventos`
  exibem total / processadas / pendentes / erros / "atualizado Xs atrás".
- Botão "Reprocessar OCR" segue disponível como fallback (chama a Edge Function existente
  `bib-reindex-event`, lote pequeno).

---

## Validação (smoke test)

1. Suba 5 fotos novas em um evento de teste.
2. `aws sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names ApproximateNumberOfMessages`
   → deve subir e zerar em segundos.
3. `aws logs tail /aws/lambda/viufoto-bib-detector --follow`
4. Em `/admin/eventos`, o card de progresso deve evoluir em tempo real (sem refresh).
5. Buscar pelo número de peito no evento → fotos aparecem.

---

## Plano de migração sem downtime

| Passo | Estado anterior | Estado novo | Risco |
|---|---|---|---|
| 1 | OCR manual via Edge Function | OCR manual + tabela de progresso já ativa | Zero — só leitura nova |
| 2 | — | Provisionar SNS+SQS+Lambda **sem** ligar S3 Event | Zero — pipeline inerte |
| 3 | — | Smoke test: enviar 1 mensagem manual para SQS via `aws sqs send-message` | Zero — controlado |
| 4 | — | Ligar S3 Event Notification em **um evento de teste** (prefix `usuarios/test-uid/`) | Baixo — escopo restrito |
| 5 | — | Ampliar prefix para `usuarios/` (todos) | Médio — monitorar DLQ |
| 6 | Botão "Indexar nº peito" em destaque | Botão demovido a fallback ("Reprocessar OCR") | Já feito no frontend |
| 7 | Edge Function ativa | Edge Function **mantida** apenas como fallback | Zero |

**Rollback instantâneo**: desativar a S3 Event Notification (1 clique no console S3) — o sistema
volta exatamente ao estado anterior, com o botão fallback ainda funcionando.

**Kill-switch por evento**: `UPDATE events SET bib_search_enabled = false WHERE id = ...` — a
Lambda ignora o evento sem alterar infra.

**Pausar pipeline globalmente sem perder mensagens**:
`aws lambda put-function-concurrency --function-name viufoto-bib-detector --reserved-concurrent-executions 0`
— a fila acumula, nada processa; reverter para 20 quando estiver pronto.

---

## Custos (sa-east-1 + us-east-1, por foto)

- Rekognition DetectText: **US$ 0.001**
- Lambda (512 MB × ~1.5 s): ~US$ 0.0000125
- S3 GET (variante medium): ~US$ 0.0000004
- SNS + SQS: praticamente zero

| Volume | Total estimado |
|---|---|
| 500 fotos | ~US$ 0.51 |
| 5.000 fotos | ~US$ 5.07 |
| 20.000 fotos | ~US$ 20.30 |
| 100.000 fotos | ~US$ 101.30 |

`events.bib_search_enabled = false` zera o custo para eventos sem nº de peito.

---

## Reconhecimento facial (extensão futura, zero impacto)

1. `aws sqs create-queue --queue-name viufoto-face-queue` (+ DLQ).
2. `aws sns subscribe --topic-arn $SNS_ARN --protocol sqs --notification-endpoint <face-queue-arn>`.
3. Deploy nova Lambda `viufoto-face-indexer` (Rekognition `IndexFaces` + collection por evento).
4. Nova tabela `photo_faces` + reutilizar `event_indexing_progress.faces_done` / `faces_errors`.
5. Frontend: o mesmo `<IndexingProgressCard />` ganha uma segunda barra. Pipeline OCR não muda.

---

## Monitoramento

- CloudWatch Alarm: `ApproximateNumberOfMessagesVisible > 10` na DLQ → e-mail admin.
- Tabela `bib_detection_errors` no app + filtro por evento.
- Logs: `aws logs tail /aws/lambda/viufoto-bib-detector --follow`.