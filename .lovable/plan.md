# Frente B2 — Lambda `viufoto-face-indexer` dedicada (SQS própria + SNS fan-out)

## Arquitetura

```text
S3 PUT (usuarios/.../fotos/*.jpg|.jpeg|.webp)
  └─ Event Notification ─► SNS viufoto-photo-uploaded (já existente)
                              ├─► SQS viufoto-bib-queue  ─► Lambda viufoto-bib-detector (já existente)
                              └─► SQS viufoto-face-queue ─► Lambda viufoto-face-indexer (NOVO)
                                     DLQ: viufoto-face-dlq (3 retries)
```

Zero mudança na Lambda BIB. O tópico SNS ganha um segundo assinante.

## Novidades no repo

**Nova pasta `viufoto-lambda-face-indexer/`:**

- `package.json` — mesmas deps da BIB + `sharp`.
- `src/index.js` — handler novo, portando a lógica do edge `face-indexer` para Node/Lambda com `sharp` (não usa mais `@jsquash`).

### Comportamento do handler

Para cada `S3 Record` recebido via SNS→SQS:

1. `parseEventId(key)` — igual à Lambda BIB (`usuarios/{uid}/eventos/{eventId}/fotos/...`).
2. Ignora chaves com `/thumb/` ou `/medium/`.
3. Lê `events (face_search_enabled, face_index_mode)`:
   - Se `face_search_enabled = false` → skip silencioso.
   - Se `face_index_mode = 'on_demand'` → skip (só indexa na 1ª busca).
4. Localiza `event_photos.id` por `event_id + file_url = originalKey`.
   - Se ainda não existir a linha, **lança `PhotoRowNotReadyException`** (a mensagem volta para retry via SQS visibility timeout — mesmo padrão da BIB).
5. `ensureCollection(event_id)`:
   - Chama RPC `ensure_face_collection`.
   - Se `created = true`, faz `CreateCollectionCommand` idempotente (tolera `ResourceAlreadyExistsException`).
6. Baixa o **original** do S3, passa por `prepareForRekognition()` (mesma função da BIB — `sharp` 2000px/JPEG q88→58, converte WebP/HEIC).
7. `IndexFacesCommand`:
   - `CollectionId = event_<uuid-sem-hifen>`
   - `ExternalImageId = photo_id`
   - `MaxFaces = 15`, `QualityFilter = "AUTO"`, `DetectionAttributes = ["DEFAULT"]`.
8. Se retornar `FaceRecords`:
   - Insere em `event_photo_faces` (event_id, photo_id, rekognition_face_id, external_image_id, bounding_box, confidence, quality, pose).
9. `UPDATE event_photos SET faces_indexed_at = now() WHERE id = photo_id`.
10. Progresso realtime — **sem depender de `face_index_jobs`** (a SQS é a fila real):
    - `event_indexing_progress.faces_done += 1` (upsert, mesmo padrão de `bumpProgress` da BIB).
    - `event_face_collections.faces_indexed += faceRecords.length`, `last_indexed_at = now()`.
11. Em erro:
    - `PERMANENT_ERRORS` (InvalidImageFormat, InvalidS3Object, ImageTooLarge, InvalidParameter, ResourceNotFound) → grava em `bib_detection_errors` reutilizando a tabela (adicionar coluna `pipeline text default 'bib'` na migração de suporte — ver abaixo) e **não** relança (evita reprocessar em loop).
    - Erros transitórios → relança para a SQS reentregar até a DLQ (3 tentativas).
    - `event_indexing_progress.faces_errors += 1`.

### Migração de suporte (mínima)

Adicionar coluna opcional em `bib_detection_errors` para diferenciar erros de BIB vs Face na mesma tabela:

```sql
ALTER TABLE public.bib_detection_errors
  ADD COLUMN IF NOT EXISTS pipeline text NOT NULL DEFAULT 'bib';
-- Índice para admin filtrar por pipeline
CREATE INDEX IF NOT EXISTS idx_bib_detection_errors_pipeline
  ON public.bib_detection_errors(pipeline, created_at DESC);
```

Nenhuma outra mudança de schema — `event_photo_faces`, `event_face_collections`, `event_indexing_progress` e `events.face_search_enabled` já existem.

## Comandos AWS CLI (para você rodar)

Assumindo `AWS_REGION=sa-east-1`, `ACCOUNT_ID` exportado, e `SNS_ARN=arn:aws:sns:sa-east-1:$ACCOUNT_ID:viufoto-photo-uploaded` já existente da BIB.

### 1) DLQ e fila principal

```bash
export AWS_REGION=sa-east-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export SNS_ARN=arn:aws:sns:$AWS_REGION:$ACCOUNT_ID:viufoto-photo-uploaded

# DLQ
aws sqs create-queue --region $AWS_REGION --queue-name viufoto-face-dlq \
  --attributes MessageRetentionPeriod=1209600

export FACE_DLQ_URL=$(aws sqs get-queue-url --queue-name viufoto-face-dlq --query QueueUrl --output text)
export FACE_DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $FACE_DLQ_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

# Fila principal (VisibilityTimeout = 6x o timeout da Lambda = 6x60s = 360s)
aws sqs create-queue --region $AWS_REGION --queue-name viufoto-face-queue \
  --attributes "{\"VisibilityTimeout\":\"360\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$FACE_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

export FACE_QUEUE_URL=$(aws sqs get-queue-url --queue-name viufoto-face-queue --query QueueUrl --output text)
export FACE_QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url $FACE_QUEUE_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)
```

### 2) Permitir SNS publicar na SQS

```bash
cat > /tmp/face-sqs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "sns.amazonaws.com" },
    "Action": "sqs:SendMessage",
    "Resource": "$FACE_QUEUE_ARN",
    "Condition": { "ArnEquals": { "aws:SourceArn": "$SNS_ARN" } }
  }]
}
EOF
aws sqs set-queue-attributes --queue-url $FACE_QUEUE_URL \
  --attributes Policy=file:///tmp/face-sqs-policy.json
```

### 3) Assinar a fila no tópico SNS (Raw delivery OFF)

```bash
aws sns subscribe --topic-arn $SNS_ARN \
  --protocol sqs --notification-endpoint $FACE_QUEUE_ARN
```

Não muda nada na fila BIB — as duas ficam recebendo cópia de cada evento S3.

### 4) IAM Role da Lambda

```bash
cat > /tmp/face-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF

aws iam create-role --role-name viufoto-face-indexer-role \
  --assume-role-policy-document file:///tmp/face-trust.json

cat > /tmp/face-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": [
        "rekognition:IndexFaces",
        "rekognition:CreateCollection",
        "rekognition:DescribeCollection"
      ], "Resource": "*" },
    { "Effect": "Allow", "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::viufoto-images-bucket/*" },
    { "Effect": "Allow", "Action": [
        "sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"
      ], "Resource": "$FACE_QUEUE_ARN" },
    { "Effect": "Allow", "Action": [
        "logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"
      ], "Resource": "*" }
  ]
}
EOF

aws iam put-role-policy --role-name viufoto-face-indexer-role \
  --policy-name viufoto-face-indexer-inline \
  --policy-document file:///tmp/face-policy.json
```

### 5) Build & deploy da Lambda

`sharp` precisa de binário Linux x64 (rode em WSL/Linux/Docker se estiver no Windows/Mac ARM):

```bash
cd viufoto-lambda-face-indexer
rm -rf node_modules package-lock.json

npm install --omit=dev --os=linux --cpu=x64 --libc=glibc \
  sharp @aws-sdk/client-rekognition @aws-sdk/client-s3 @supabase/supabase-js

rm -f ../face-indexer.zip
zip -rq ../face-indexer.zip src node_modules package.json

aws lambda create-function --region $AWS_REGION \
  --function-name viufoto-face-indexer \
  --runtime nodejs20.x --handler src/index.handler \
  --role arn:aws:iam::$ACCOUNT_ID:role/viufoto-face-indexer-role \
  --timeout 60 --memory-size 1024 \
  --zip-file fileb://../face-indexer.zip \
  --environment "Variables={SUPABASE_URL=<SEU_URL>,SUPABASE_SERVICE_ROLE_KEY=<SEU_SERVICE_KEY>,S3_BUCKET=viufoto-images-bucket,S3_REGION=sa-east-1,REK_REGION=us-east-1,MIN_FACE_CONFIDENCE=80}"

aws lambda put-function-concurrency \
  --function-name viufoto-face-indexer \
  --reserved-concurrent-executions 20
```

> **Nota:** você já sabe seu `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do deploy da Lambda BIB — reutilize os mesmos valores.

### 6) Conectar SQS → Lambda

```bash
aws lambda create-event-source-mapping --region $AWS_REGION \
  --function-name viufoto-face-indexer \
  --event-source-arn $FACE_QUEUE_ARN \
  --batch-size 3
```

Batch pequeno porque `IndexFaces` custa mais CPU e cada imagem passa por `sharp`.

## Validação após o deploy

1. Subir 3 fotos com pessoas em um evento de teste (com `face_search_enabled = true` e `face_index_mode ≠ 'on_demand'`).
2. `aws logs tail /aws/lambda/viufoto-face-indexer --follow --region sa-east-1` — procurar `[face] indexed faces=N photoId=...`.
3. SQL rápido:
   ```sql
   SELECT count(*) FROM event_photo_faces WHERE event_id = '<TESTE>';
   SELECT faces_indexed, status FROM event_face_collections WHERE event_id = '<TESTE>';
   SELECT faces_done, faces_errors FROM event_indexing_progress WHERE event_id = '<TESTE>';
   ```
4. Ir no evento no app, abrir `FaceSearchModal`, subir uma selfie de alguém que aparece nas fotos → deve retornar matches.

## Fora do escopo desta rodada

- Backfill das 120 fotos antigas (fica para a Frente C — `pipeline-backfill-event` que empurra para ambas as filas SQS; você me pediu no item 3 e vou plantar em plano separado depois desta subir).
- Alarme CloudWatch na `viufoto-face-dlq` (posso adicionar ao mesmo alarme do BIB numa próxima rodada).
- Purga dos 63k `bib_detection_errors` antigos.

## Aprovando este plano eu vou:

1. Criar `viufoto-lambda-face-indexer/package.json`.
2. Criar `viufoto-lambda-face-indexer/src/index.js` (portando a lógica da edge `face-indexer` para Node + `sharp`).
3. Criar `viufoto-lambda-face-indexer/README.md` com os comandos AWS CLI acima.
4. Migração adicionando `bib_detection_errors.pipeline` para separar erros BIB/Face.

Você roda os comandos AWS na sequência (SQS → IAM → Lambda → event source mapping) e depois disparamos o teste juntos.
