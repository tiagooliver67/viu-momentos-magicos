# viufoto-face-indexer

Lambda dedicada para indexação facial (Amazon Rekognition `IndexFaces`).
Espelha o padrão da `viufoto-bib-detector`: SNS → SQS → Lambda com `sharp` para
resize/compressão, gravando em `event_photo_faces` + `event_face_collections`.

## Deploy (do zero)

### 0) Variáveis

```bash
export AWS_REGION=sa-east-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export SNS_ARN=arn:aws:sns:$AWS_REGION:$ACCOUNT_ID:viufoto-photo-uploaded
```

### 1) DLQ + fila principal

```bash
aws sqs create-queue --region $AWS_REGION --queue-name viufoto-face-dlq \
  --attributes MessageRetentionPeriod=1209600

export FACE_DLQ_URL=$(aws sqs get-queue-url --queue-name viufoto-face-dlq --query QueueUrl --output text)
export FACE_DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $FACE_DLQ_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

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

### 3) Subscription SNS → SQS

```bash
aws sns subscribe --topic-arn $SNS_ARN \
  --protocol sqs --notification-endpoint $FACE_QUEUE_ARN
```

### 4) IAM Role

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

### 5) Build & deploy (Linux/WSL — `sharp` precisa de binário glibc x64)

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

### 6) Event source mapping SQS → Lambda

```bash
aws lambda create-event-source-mapping --region $AWS_REGION \
  --function-name viufoto-face-indexer \
  --event-source-arn $FACE_QUEUE_ARN \
  --batch-size 3
```

## Update de código (após edits)

```bash
cd viufoto-lambda-face-indexer
rm -f ../face-indexer.zip
zip -rq ../face-indexer.zip src node_modules package.json
aws lambda update-function-code --region sa-east-1 \
  --function-name viufoto-face-indexer \
  --zip-file fileb://../face-indexer.zip
```

## Logs

```bash
aws logs tail /aws/lambda/viufoto-face-indexer --follow --region sa-east-1
```