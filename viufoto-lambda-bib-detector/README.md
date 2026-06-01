# viufoto-bib-detector (AWS Lambda)

Detector de números de peito (BIB) usando **AWS Rekognition DetectText**.

## Fluxo

```
S3 PUT em usuarios/.../fotos/*.jpg
    -> S3 Event Notification
    -> SQS (viufoto-ocr-queue)
    -> Lambda viufoto-bib-detector
    -> Rekognition.DetectText (na versão /medium/.webp)
    -> Filtros (regex, confidence>=80)
    -> INSERT em public.photo_bib_numbers (via Supabase service_role)
    -> UPDATE event_photos.bibs_indexed_at, bibs_count
```

## Variáveis de ambiente

| Var | Descrição |
|---|---|
| `S3_BUCKET` | Bucket onde as fotos vivem (`viufoto-images-bucket`) |
| `AWS_REGION` | `sa-east-1` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (somente backend) |
| `MIN_CONFIDENCE` | Default `80` |
| `DEFAULT_REGEX` | Default `^\d{1,6}$` |

## IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "rekognition:DetectText", "Resource": "*" },
    { "Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::viufoto-images-bucket/*" },
    { "Effect": "Allow", "Action": ["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"], "Resource": "arn:aws:sqs:sa-east-1:*:viufoto-ocr-queue" },
    { "Effect": "Allow", "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], "Resource": "*" }
  ]
}
```

## Build & Deploy

```bash
cd viufoto-lambda-bib-detector
npm install
zip -r ../viufoto-bib-detector.zip .
aws lambda create-function \
  --function-name viufoto-bib-detector \
  --runtime nodejs20.x \
  --handler src/index.handler \
  --role arn:aws:iam::<ACCOUNT>:role/viufoto-bib-detector \
  --zip-file fileb://../viufoto-bib-detector.zip \
  --timeout 60 --memory-size 512 --region sa-east-1
```

Vincule a Lambda à fila `viufoto-ocr-queue` (Event Source Mapping, batch size 10).

## Custos

- DetectText: **US$ 1 / 1.000 imagens** em sa-east-1.
- 10k fotos: ~US$ 10
- 100k fotos: ~US$ 100
- 1M fotos: ~US$ 1.000

## Toggle por evento

A coluna `events.bib_search_enabled` (default `true`) controla se a Lambda deve processar. Eventos sem bib (casamento, formatura) podem desligar e economizar 100% do custo.
