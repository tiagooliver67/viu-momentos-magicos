const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { RekognitionClient, DetectTextCommand, DetectFacesCommand } = require("@aws-sdk/client-rekognition");
const sharp = require("sharp");
const path = require("path");

const s3 = new S3Client({ region: "sa-east-1" });
const rekognition = new RekognitionClient({ region: "sa-east-1" });
const DEFAULT_WATERMARK_VERTICAL_KEY = "assets/default-watermark-vertical.png";
const DEFAULT_WATERMARK_HORIZONTAL_KEY = "assets/default-watermark-horizontal.png";

// Supabase (leitura da tabela watermark_configs via PostgREST)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ---------------------------------------------------------------------------
// CACHE EM MEMÓRIA (item 3): a Lambda "quente" processa dezenas de fotos do
// mesmo evento em sequência. Sem cache, cada foto faria uma consulta ao banco.
// TTL curto (5 min) para que uma alteração de marca d'água seja refletida
// rapidamente sem precisar esperar o container reciclar.
// ---------------------------------------------------------------------------
const CONFIG_TTL_MS = 5 * 60 * 1000;
const configCache = new Map(); // event_id -> { value, expiresAt }
const assetCache = new Map();  // url/key   -> { buffer, expiresAt }

const getCached = (map, key) => {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit;
  if (hit) map.delete(key);
  return null;
};

/** Extrai o event_id de caminhos "eventos/{eventId}/fotos/..." (item 1). */
function extractEventId(key) {
  if (typeof key !== "string") return "default";
  const parts = key.split("/");
  // Layout atual: "usuarios/{ownerId}/eventos/{eventId}/fotos/..."
  // Layout curto:  "eventos/{eventId}/fotos/..."
  const idx = parts.indexOf("eventos");
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return "default";
}

/** Consulta genérica ao PostgREST. Retorna array de linhas (ou null em falha). */
async function restSelect(pathWithQuery) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      console.log(`⚠️ PostgREST ${pathWithQuery} [${res.status}]: ${await res.text()}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log(`⚠️ Falha na consulta ${pathWithQuery}:`, e.message);
    return null;
  }
}

/**
 * Resolve as camadas de marca d'água do evento (com cache).
 * Ordem de precedência:
 *   1. watermark_configs (override legado/específico do evento, se existir);
 *   2. account_watermark_settings do organizador do evento (modelo ATIVO da conta);
 *   3. null → marca d'água padrão do bucket.
 */
async function fetchWatermarkConfig(eventId) {
  if (!eventId || eventId === "default") return null;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const cached = getCached(configCache, eventId);
  if (cached) return cached.value;

  let layers = null;

  // 1) Override por evento (tabela legada, ainda respeitada quando existir)
  const cfgRows = await restSelect(
    `watermark_configs?event_id=eq.${encodeURIComponent(eventId)}`
    + `&select=layers,created_at&order=created_at.desc&limit=1`,
  );
  const cfgRaw = Array.isArray(cfgRows) && cfgRows[0] ? cfgRows[0].layers : null;
  if (Array.isArray(cfgRaw) && cfgRaw.length > 0) layers = cfgRaw;

  // 2) Modelo ATIVO da conta do organizador do evento
  if (!layers) {
    const evRows = await restSelect(
      `events?id=eq.${encodeURIComponent(eventId)}&select=organizer_id&limit=1`,
    );
    const organizerId = Array.isArray(evRows) && evRows[0] ? evRows[0].organizer_id : null;
    if (organizerId) {
      const acctRows = await restSelect(
        `account_watermark_settings?user_id=eq.${encodeURIComponent(organizerId)}`
        + `&select=layers&limit=1`,
      );
      const acctRaw = Array.isArray(acctRows) && acctRows[0] ? acctRows[0].layers : null;
      if (Array.isArray(acctRaw) && acctRaw.length > 0) layers = acctRaw;
    }
  }

  configCache.set(eventId, { value: layers, expiresAt: Date.now() + CONFIG_TTL_MS });
  return layers;
}

/** Baixa a imagem de uma camada (URL http(s) ou key do próprio bucket), com cache. */
async function loadLayerImage(bucket, imageUrl) {
  if (!imageUrl) return null;
  const cached = getCached(assetCache, imageUrl);
  if (cached) return cached.buffer;

  let buffer = null;
  try {
    if (/^https?:\/\//i.test(imageUrl)) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: imageUrl.replace(/^\/+/, "") }));
      buffer = await streamToBuffer(obj.Body);
    }
  } catch (e) {
    console.log(`⚠️ Camada ignorada (${imageUrl}):`, e.message);
    return null;
  }

  assetCache.set(imageUrl, { buffer, expiresAt: Date.now() + CONFIG_TTL_MS });
  return buffer;
}

/** Aplica opacidade (0-100) a um PNG mantendo o canal alpha original. */
async function withOpacity(buffer, opacity) {
  const alpha = Math.max(0, Math.min(100, Number(opacity ?? 100))) / 100;
  if (alpha >= 1) return buffer;
  const img = sharp(buffer).ensureAlpha();
  const meta = await img.metadata();
  return img
    .composite([{
      input: {
        create: {
          width: meta.width, height: meta.height, channels: 4,
          background: { r: 0, g: 0, b: 0, alpha },
        },
      },
      blend: "dest-in",
    }])
    .png()
    .toBuffer();
}

/** Converte a posição nomeada em coordenadas left/top dentro do canvas. */
function resolvePosition(position, canvasW, canvasH, wmW, wmH) {
  const [vRaw, hRaw] = String(position || "center").split("-");
  const v = ["top", "middle", "bottom", "center"].includes(vRaw) ? vRaw : "center";
  const h = hRaw || (v === "center" ? "center" : "center");
  const top = v === "top" ? 0 : v === "bottom" ? canvasH - wmH : Math.round((canvasH - wmH) / 2);
  const left = h === "left" ? 0 : h === "right" ? canvasW - wmW : Math.round((canvasW - wmW) / 2);
  return {
    left: Math.max(0, Math.min(left, Math.max(0, canvasW - wmW))),
    top: Math.max(0, Math.min(top, Math.max(0, canvasH - wmH))),
  };
}

/**
 * Monta a lista de operações de composite do Sharp a partir das camadas salvas
 * em watermark_configs. Suporta os três modos: standard, repeated e full_fill.
 */
async function buildLayerComposites(bucket, layers, canvasW, canvasH) {
  const ops = [];

  for (const layer of layers) {
    const source = await loadLayerImage(bucket, layer.image_url || layer.imageUrl);
    if (!source) continue;

    const mode = layer.mode || "standard";
    const rotation = Number(layer.rotation || 0);
    const sizePct = Math.max(1, Math.min(200, Number(layer.size ?? 30)));

    try {
      if (mode === "full_fill") {
        // Equivalente ao comportamento atual: cobre 100% do canvas (fit cover).
        let buf = await sharp(source)
          .resize({ width: canvasW, height: canvasH, fit: "cover", position: "center" })
          .png()
          .toBuffer();
        buf = await withOpacity(buf, layer.opacity ?? 100);
        ops.push({ input: buf, left: 0, top: 0, blend: "over" });
        continue;
      }

      // standard / repeated: largura proporcional à largura da foto.
      const targetW = Math.max(1, Math.round((canvasW * sizePct) / 100));
      let unit = sharp(source).resize({ width: targetW, fit: "inside", withoutEnlargement: false });
      if (rotation % 360 !== 0) {
        unit = unit.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
      }
      let unitBuf = await unit.png().toBuffer();
      unitBuf = await withOpacity(unitBuf, layer.opacity ?? 100);
      const unitMeta = await sharp(unitBuf).metadata();
      const uw = unitMeta.width, uh = unitMeta.height;

      if (mode === "repeated") {
        const spacing = Math.max(0, Number(layer.spacing ?? 40));
        const stepX = uw + spacing;
        const stepY = uh + spacing;
        const cols = Math.ceil(canvasW / stepX) + 1;
        const rows = Math.ceil(canvasH / stepY) + 1;
        const maxTiles = 400; // guarda de performance
        let count = 0;
        for (let r = 0; r < rows && count < maxTiles; r++) {
          for (let c = 0; c < cols && count < maxTiles; c++) {
            const left = c * stepX - Math.round(spacing / 2);
            const top = r * stepY - Math.round(spacing / 2);
            if (left >= canvasW || top >= canvasH) continue;
            // Sharp não aceita coordenadas negativas nem overflow: recorta a peça.
            const cropLeft = Math.max(0, left);
            const cropTop = Math.max(0, top);
            const visibleW = Math.min(uw - (cropLeft - left), canvasW - cropLeft);
            const visibleH = Math.min(uh - (cropTop - top), canvasH - cropTop);
            if (visibleW <= 0 || visibleH <= 0) continue;
            const piece = (visibleW === uw && visibleH === uh)
              ? unitBuf
              : await sharp(unitBuf)
                  .extract({ left: cropLeft - left, top: cropTop - top, width: visibleW, height: visibleH })
                  .png().toBuffer();
            ops.push({ input: piece, left: cropLeft, top: cropTop, blend: "over" });
            count++;
          }
        }
      } else {
        // standard: uma única aplicação na posição escolhida.
        const safeW = Math.min(uw, canvasW);
        const safeH = Math.min(uh, canvasH);
        const finalBuf = (safeW === uw && safeH === uh)
          ? unitBuf
          : await sharp(unitBuf).extract({ left: 0, top: 0, width: safeW, height: safeH }).png().toBuffer();
        const { left, top } = resolvePosition(layer.position, canvasW, canvasH, safeW, safeH);
        ops.push({ input: finalBuf, left, top, blend: "over" });
      }
    } catch (e) {
      console.log(`⚠️ Falha ao montar camada "${layer.name || layer.id}":`, e.message);
    }
  }

  return ops;
}

exports.handler = async (event) => {
  try {
    // 1. EXTRAÇÃO FLEXÍVEL DO PAYLOAD (Aceita S3 direto ou envelope SNS)
    let record = event.Records[0];

    if (record.Sns && record.Sns.Message) {
      const snsPayload = JSON.parse(record.Sns.Message);
      record = snsPayload.Records[0];
      console.log("📦 Evento recebido via SNS Fan-out");
    } else {
      console.log("📦 Evento recebido via S3 direto");
    }

    const bucket = record.s3.bucket.name;
    let key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log("📥 Processando arquivo:", key);

    // 2. FILTRO DE PASTAS E EXTENSÃO (Evita loops infinitos)
    const forbidden = ["/thumb/", "/medium/", "/medium-clean/", "/poster/", "/preview/", "/assets/", "/config/", "/watermark/"];
    if (forbidden.some(folder => key.includes(folder)) || !key.match(/\.(jpe?g|png|webp)$/i)) {
      console.log("⛔ Arquivo ignorado (pasta protegida ou formato fora do domínio desta Lambda).");
      return;
    }

    // CORREÇÃO (item 1): antes `key.split("/")` atribuía o ARRAY inteiro a
    // userId, então a busca de marca d'água personalizada nunca encontrava o
    // arquivo certo. Agora extraímos o event_id real do caminho.
    const eventId = extractEventId(key);
    console.log("🆔 event_id extraído:", eventId);

    // 3. DOWNLOAD DO ORIGINAL
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const originalBuffer = await streamToBuffer(response.Body);

    // 🌟 VACINA PARA FOTOS HORIZONTAIS:
    const baseImage = sharp(originalBuffer).rotate();
    const metadata = await baseImage.metadata();
    console.log(`📸 Dimensões originais: ${metadata.width}x${metadata.height} (EXIF orientation: ${metadata.orientation || 1})`);

    // Dimensões EFETIVAS (pós-rotação EXIF) — usadas para escolher a marca
    // d'água padrão correta. Não regride: mesma lógica de antes.
    const exifOrientation = metadata.orientation || 1;
    const isRotated90 = exifOrientation >= 5 && exifOrientation <= 8;
    const effectiveWidth = isRotated90 ? metadata.height : metadata.width;
    const effectiveHeight = isRotated90 ? metadata.width : metadata.height;

    // 4. MARCA D'ÁGUA: config do evento (item 2) OU fallback padrão (comportamento atual)
    const layers = await fetchWatermarkConfig(eventId);

    let watermarkBuffer = null;
    if (layers && layers.length) {
      console.log(`🎨 Config de marca d'água encontrada (${layers.length} camada(s)).`);
    } else {
      try {
        const wmRes = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `usuarios/${eventId}/config/watermark.png` }));
        watermarkBuffer = await streamToBuffer(wmRes.Body);
        console.log("✅ Watermark do usuário carregada.");
      } catch (e) {
        try {
          const isLandscape = effectiveWidth >= effectiveHeight;
          const defaultKey = isLandscape ? DEFAULT_WATERMARK_HORIZONTAL_KEY : DEFAULT_WATERMARK_VERTICAL_KEY;
          const defRes = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: defaultKey }));
          watermarkBuffer = await streamToBuffer(defRes.Body);
          console.log(`✅ Watermark padrão (${isLandscape ? "horizontal" : "vertical"}) carregada.`);
        } catch (err) { console.log("⚠️ Nenhuma watermark disponível."); }
      }
    }

    const folderPath = path.dirname(key);
    const fileName = path.parse(key).name;
    const cacheHeader = "public, max-age=31536000, immutable";

    // 5. FUNÇÃO DE PROCESSAMENTO (Gera Thumb e Medium)
    const generateVariant = async (maxSize, quality) => {
      const pipeline = baseImage.clone().resize({
        width: maxSize,
        height: maxSize,
        fit: 'inside',
        withoutEnlargement: true
      });

      const hasLayers = Array.isArray(layers) && layers.length > 0;
      if (!hasLayers && !watermarkBuffer) {
        return await pipeline.webp({ quality }).toBuffer();
      }

      const { data: resizedData, info } = await pipeline.toBuffer({ resolveWithObject: true });

      if (hasLayers) {
        const ops = await buildLayerComposites(bucket, layers, info.width, info.height);
        if (ops.length === 0) {
          // Config existe mas nenhuma camada pôde ser carregada → não bloqueia o upload.
          return await sharp(resizedData).webp({ quality }).toBuffer();
        }
        return await sharp(resizedData).composite(ops).webp({ quality }).toBuffer();
      }

      // Fallback: cobertura total como já funciona hoje.
      const wmResized = await sharp(watermarkBuffer)
        .resize({ width: info.width, height: info.height, fit: 'cover', position: 'center' })
        .toBuffer();

      return await sharp(resizedData)
        .composite([{ input: wmResized, left: 0, top: 0, blend: 'over' }])
        .webp({ quality })
        .toBuffer();
    };

    // 6. GERAÇÃO E UPLOAD DOS ARQUIVOS
    console.log("🧩 Gerando Thumb...");
    const thumbBuffer = await generateVariant(500, 80);
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: `${folderPath}/thumb/${fileName}.webp`,
      Body: thumbBuffer, ContentType: "image/webp", CacheControl: cacheHeader
    }));

    console.log("🧩 Gerando Medium...");
    const mediumBuffer = await generateVariant(1200, 85);
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: `${folderPath}/medium/${fileName}.webp`,
      Body: mediumBuffer, ContentType: "image/webp", CacheControl: cacheHeader
    }));

    console.log("✅ Variantes geradas com sucesso.");

    // 7. INTELIGÊNCIA ARTIFICIAL (Otimizada)
    try {
      console.log("🤖 Iniciando Rekognition...");
      const rekognitionBuffer = await sharp(thumbBuffer).jpeg({ quality: 85 }).toBuffer();

      const textResponse = await rekognition.send(new DetectTextCommand({
        Image: { Bytes: rekognitionBuffer }
      }));

      const textos = textResponse.TextDetections
        .filter(t => t.Type === 'LINE')
        .map(t => t.DetectedText);

      console.log("🔢 Números/Textos detectados:", textos);

      const faceResponse = await rekognition.send(new DetectFacesCommand({
        Image: { Bytes: rekognitionBuffer }
      }));
      console.log(`👤 Rostos encontrados: ${faceResponse.FaceDetails.length}`);

    } catch (iaError) {
      console.error("⚠️ Erro na IA:", iaError.message);
    }

  } catch (error) {
    console.error("❌ ERRO CRÍTICO:", JSON.stringify(error, null, 2));
    throw error;
  }
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
