'use strict'

const Fastify = require('fastify')
const multipart = require('@fastify/multipart')
const rateLimit = require('@fastify/rate-limit')
const cors = require('@fastify/cors')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const {
  RekognitionClient,
  DetectFacesCommand,
  SearchFacesByImageCommand,
  IndexFacesCommand,
  DeleteFacesCommand,
  CreateCollectionCommand,
  ListFacesCommand,
} = require('@aws-sdk/client-rekognition')

const {
  DynamoDBClient,
  DescribeTableCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb')

const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb')

// ── Boot guard ────────────────────────────────────────────────────────────────
// Refuse to start if no API key is configured. The legacy default value
// 'change-me' is a known footgun — it must be replaced explicitly.
if (!process.env.PG_API_KEY || process.env.PG_API_KEY === 'change-me') {
  console.error('FATAL: PG_API_KEY not set (or still set to the default "change-me"). Refusing to start.')
  process.exit(1)
}

// ── Config ────────────────────────────────────────────────────────────────────

const PG_API_KEY        = process.env.PG_API_KEY
const COLLECTION_BANNED = process.env.PG_COLLECTION_BANNED || 'hv-playguard-banned'
const DYNAMO_TABLE      = process.env.PG_DYNAMO_TABLE   || 'hv-playguard-events'
// Default raised to 21 (from 18) to compensate for AWS Rekognition's known
// tendency to over-age children. VERIFY_AGE verdict flags the ambiguous zone.
const AGE_THRESHOLD     = parseInt(process.env.PG_AGE_THRESHOLD  || '21', 10)
const MATCH_THRESHOLD   = parseFloat(process.env.PG_MATCH_THRESHOLD || '90')
const AWS_REGION        = process.env.AWS_REGION        || 'af-south-1'
const PORT              = parseInt(process.env.PORT     || '3007', 10)
const QUEUE_PATH        = process.env.PG_QUEUE_PATH     || path.join(process.cwd(), 'playguard-queue.json')

// ── AWS clients ───────────────────────────────────────────────────────────────

const rekognition = new RekognitionClient({ region: AWS_REGION })

let dynamo = null
let dynamoAvailable = false

async function initDynamo () {
  try {
    dynamo = new DynamoDBClient({ region: AWS_REGION })
    await dynamo.send(new DescribeTableCommand({ TableName: DYNAMO_TABLE }))
    dynamoAvailable = true
    console.log('[DYNAMO] Connected ✓')
  } catch (e) {
    dynamoAvailable = false
    console.warn('[DYNAMO] Unreachable — COLLECT mode active:', e.message)
  }
}

// ── Offline queue ─────────────────────────────────────────────────────────────

function loadQueue () {
  try {
    if (fs.existsSync(QUEUE_PATH)) return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'))
  } catch {}
  return []
}

function saveQueue (q) {
  try { fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2), 'utf8') } catch {}
}

function enqueue (item) {
  const q = loadQueue()
  q.push(item)
  saveQueue(q)
}

// ── Rekognition helpers ───────────────────────────────────────────────────────

async function ensureCollection () {
  try {
    await rekognition.send(new CreateCollectionCommand({ CollectionId: COLLECTION_BANNED }))
    console.log(`[REKOGNITION] Collection created: ${COLLECTION_BANNED}`)
  } catch (e) {
    if (e.name === 'ResourceAlreadyExistsException') {
      console.log(`[REKOGNITION] Collection ready: ${COLLECTION_BANNED}`)
    } else {
      throw e
    }
  }
}

function cleanBase64 (b64) {
  return b64.replace(/^data:image\/[a-z]+;base64,/, '')
}

async function detectFaces (imageBytes) {
  const res = await rekognition.send(new DetectFacesCommand({
    Image: { Bytes: imageBytes },
    Attributes: ['ALL'],
  }))
  return res.FaceDetails ?? []
}

async function searchBannedFace (imageBytes) {
  try {
    const res = await rekognition.send(new SearchFacesByImageCommand({
      CollectionId: COLLECTION_BANNED,
      Image: { Bytes: imageBytes },
      MaxFaces: 1,
      FaceMatchThreshold: MATCH_THRESHOLD,
    }))
    const match = (res.FaceMatches ?? [])[0]
    if (match) {
      return {
        detected: true,
        similarity: match.Similarity,
        faceId: match.Face?.FaceId,
        externalId: match.Face?.ExternalImageId,
      }
    }
    return { detected: false }
  } catch (e) {
    if (e.name === 'InvalidParameterException') return { detected: false }
    throw e
  }
}

async function findBanSk (faceId) {
  try {
    const res = await dynamo.send(new QueryCommand({
      TableName: DYNAMO_TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: marshall({ ':pk': `BAN#${faceId}` }),
      Limit: 1,
    }))
    return res.Items?.[0] ? unmarshall(res.Items[0]).sk : null
  } catch { return null }
}

// ── Auth hook ─────────────────────────────────────────────────────────────────

async function authHook (request, reply) {
  if (request.headers['x-playguard-key'] !== PG_API_KEY) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}

// ── Fastify setup ─────────────────────────────────────────────────────────────

const fastify = Fastify({ logger: true })

// CORS — explicit whitelist instead of wildcard. Additional origins can be
// added via the PG_CORS_EXTRA env var (comma-separated).
const CORS_ORIGINS = [
  'https://playguard.vercel.app',
  'https://congogaming.com',
  'https://www.congogaming.com',
  ...((process.env.PG_CORS_EXTRA || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)),
]

fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow same-origin / curl / server-to-server (no Origin header).
    if (!origin) return cb(null, true)
    if (CORS_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error(`Origin not allowed: ${origin}`), false)
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-playguard-key', 'X-API-Key'],
  credentials: false,
  maxAge: 600,
})

fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

// Global rate limit (lenient default). Stricter per-route limit is applied
// to /playguard/scan below.
fastify.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  // Trust the x-forwarded-for chain when running behind Render / Vercel.
  keyGenerator: (req) =>
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip,
})

// ── POST /playguard/scan ──────────────────────────────────────────────────────

fastify.post(
  '/playguard/scan',
  {
    preHandler: authHook,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  },
  async (request, reply) => {
  const scanId    = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  let imageBytes
  // Metadata fields are extracted from the multipart 'field' parts when
  // applicable, falling back to JSON body fields otherwise. Without this
  // loop, multipart scans silently dropped playerId/boardId/platform —
  // breaking the audit trail for board-side compliance reporting.
  let metaFromMultipart = null

  const contentType = request.headers['content-type'] ?? ''

  if (contentType.includes('multipart/form-data')) {
    metaFromMultipart = { playerId: '', boardId: '', platform: '' }
    let fileBuffer = null
    for await (const part of request.parts()) {
      if (part.type === 'file' && (part.fieldname === 'image' || part.fieldname === 'selfie')) {
        fileBuffer = await part.toBuffer()
      } else if (part.type === 'field') {
        const v = typeof part.value === 'string' ? part.value : ''
        if (part.fieldname === 'playerId' || part.fieldname === 'player_id') metaFromMultipart.playerId = v
        else if (part.fieldname === 'boardId' || part.fieldname === 'board_id') metaFromMultipart.boardId = v
        else if (part.fieldname === 'platform') metaFromMultipart.platform = v
      }
    }
    if (!fileBuffer) return reply.code(400).send({ error: 'No file uploaded (field name: image)' })
    imageBytes = fileBuffer
  } else {
    const body = request.body
    // Accept both 'image' (legacy) and 'selfie_b64' (SPA contract).
    const b64 = body?.image ?? body?.selfie_b64
    if (!b64) return reply.code(400).send({ error: 'Missing image field (image | selfie_b64)' })
    imageBytes = Buffer.from(cleanBase64(b64), 'base64')
  }

  const [faceDetails, banResult] = await Promise.all([
    detectFaces(imageBytes),
    searchBannedFace(imageBytes),
  ])

  const face = faceDetails[0]
  if (!face) return reply.code(422).send({ error: 'No face detected in image' })

  const ageRange      = face.AgeRange ?? { Low: 0, High: 0 }
  const isMinor       = ageRange.High < AGE_THRESHOLD
  // Rekognition over-ages children; if Low < 25 and not already a minor by
  // our (conservative) threshold, the estimate is considered uncertain and
  // the operator must verify physical ID.
  const isAmbiguous   = ageRange.Low < 25 && !isMinor
  const faceConfidence = face.Confidence ?? 0
  const quality       = {
    Brightness: face.Quality?.Brightness ?? 0,
    Sharpness:  face.Quality?.Sharpness  ?? 0,
  }

  // Verdict priority: BANNED > MINOR > VERIFY_AGE > ALLOWED
  const verdict = banResult.detected
    ? 'BANNED'
    : isMinor
      ? 'MINOR'
      : isAmbiguous
        ? 'VERIFY_AGE'
        : 'ALLOWED'

  // Resolve metadata across both transport flavours.
  const reqBody = request.body || {}
  const playerId  = metaFromMultipart?.playerId || reqBody.playerId || reqBody.player_id || ''
  const boardId   = metaFromMultipart?.boardId  || reqBody.boardId  || reqBody.board_id  || ''
  const platform  = metaFromMultipart?.platform || reqBody.platform || ''

  const result = {
    scanId,
    playerId,
    boardId,
    platform,
    verdict,
    access: verdict === 'ALLOWED',
    age: {
      range: ageRange,
      isMinor,
      isAmbiguous,
      threshold: AGE_THRESHOLD,
      ambiguityNote: isAmbiguous
        ? 'AWS Rekognition age estimate uncertain — physical ID check required'
        : null,
    },
    ban: banResult,
    quality,
    faceConfidence,
    timestamp,
  }

  const record = { pk: `SCAN#${scanId}`, sk: timestamp, ...result }

  if (dynamoAvailable) {
    try {
      await dynamo.send(new PutItemCommand({ TableName: DYNAMO_TABLE, Item: marshall(record) }))
    } catch (e) {
      fastify.log.warn('[DYNAMO] PutItem failed, queuing:', e.message)
      enqueue(record)
    }
  } else {
    enqueue(record)
  }

  return reply.send({ success: true, result })
  },
)

// ── POST /playguard/ban ───────────────────────────────────────────────────────

fastify.post('/playguard/ban', { preHandler: authHook }, async (request, reply) => {
  // Accept both legacy ({ image, externalId }) and SPA ({ selfie_b64, external_id }) shapes.
  const body = request.body ?? {}
  const image = body.image ?? body.selfie_b64
  const externalId = body.externalId ?? body.external_id
  const reason = body.reason ?? ''
  const operator = body.operator ?? ''
  if (!image || !externalId) return reply.code(400).send({ error: 'Missing image or externalId' })

  const imageBytes = Buffer.from(cleanBase64(image), 'base64')
  const bannedAt   = new Date().toISOString()

  const res = await rekognition.send(new IndexFacesCommand({
    CollectionId: COLLECTION_BANNED,
    Image: { Bytes: imageBytes },
    ExternalImageId: externalId,
    DetectionAttributes: ['DEFAULT'],
    MaxFaces: 1,
  }))

  const faceRecord = res.FaceRecords?.[0]
  if (!faceRecord) return reply.code(422).send({ error: 'No face detected for indexing' })

  const faceId    = faceRecord.Face?.FaceId
  const banRecord = { pk: `BAN#${faceId}`, sk: bannedAt, faceId, externalId, reason, operator, bannedAt }

  if (dynamoAvailable) {
    try {
      await dynamo.send(new PutItemCommand({ TableName: DYNAMO_TABLE, Item: marshall(banRecord) }))
    } catch (e) {
      fastify.log.warn('[DYNAMO] BanRecord write failed:', e.message)
    }
  }

  return reply.send({ success: true, faceId, externalId, bannedAt })
})

// ── DELETE /playguard/ban/:faceId ─────────────────────────────────────────────

fastify.delete('/playguard/ban/:faceId', { preHandler: authHook }, async (request, reply) => {
  const { faceId } = request.params

  await rekognition.send(new DeleteFacesCommand({
    CollectionId: COLLECTION_BANNED,
    FaceIds: [faceId],
  }))

  if (dynamoAvailable) {
    try {
      const sk = await findBanSk(faceId)
      if (sk) {
        await dynamo.send(new DeleteItemCommand({
          TableName: DYNAMO_TABLE,
          Key: marshall({ pk: `BAN#${faceId}`, sk }),
        }))
      }
    } catch (e) {
      fastify.log.warn('[DYNAMO] BanRecord delete failed:', e.message)
    }
  }

  return reply.send({ success: true, faceId })
})

// ── GET /playguard/status ─────────────────────────────────────────────────────

fastify.get('/playguard/status', { preHandler: authHook }, async (_request, reply) => {
  const queue = loadQueue()
  let collectionSize = 0

  try {
    let nextToken
    do {
      const res = await rekognition.send(new ListFacesCommand({
        CollectionId: COLLECTION_BANNED,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }))
      collectionSize += (res.Faces ?? []).length
      nextToken = res.NextToken
    } while (nextToken)
  } catch (e) {
    fastify.log.warn('[REKOGNITION] ListFaces failed:', e.message)
  }

  return reply.send({
    success: true,
    collection: COLLECTION_BANNED,
    collectionSize,
    queueSize: queue.length,
    awsRegion: AWS_REGION,
    mode: dynamoAvailable ? 'UPLOAD' : 'COLLECT',
    ageThreshold: AGE_THRESHOLD,
    matchThreshold: MATCH_THRESHOLD,
  })
})

// ── GET /playguard/events ─────────────────────────────────────────────────────

fastify.get('/playguard/events', { preHandler: authHook }, async (request, reply) => {
  const verdict = request.query.verdict
  const limit   = Math.min(parseInt(request.query.limit ?? '50', 10), 200)

  if (!dynamoAvailable) {
    let q = loadQueue().filter(i => i.pk?.startsWith('SCAN#'))
    if (verdict) q = q.filter(i => i.verdict === verdict)
    return reply.send({ success: true, events: q.slice(-limit).reverse(), source: 'queue' })
  }

  const attrValues = { ':prefix': 'SCAN#' }
  let filter = 'begins_with(pk, :prefix)'

  if (verdict) {
    filter += ' AND verdict = :verdict'
    attrValues[':verdict'] = verdict
  }

  const res = await dynamo.send(new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: filter,
    ExpressionAttributeValues: marshall(attrValues),
    Limit: limit * 3,
  }))

  const items = (res.Items ?? []).map(i => unmarshall(i))
  items.sort((a, b) => new Date(b.timestamp ?? b.sk) - new Date(a.timestamp ?? a.sk))

  return reply.send({ success: true, events: items.slice(0, limit), source: 'dynamo' })
})

// ── POST /playguard/sync ──────────────────────────────────────────────────────

fastify.post('/playguard/sync', { preHandler: authHook }, async (_request, reply) => {
  if (!dynamoAvailable) {
    try {
      dynamo = new DynamoDBClient({ region: AWS_REGION })
      await dynamo.send(new DescribeTableCommand({ TableName: DYNAMO_TABLE }))
      dynamoAvailable = true
    } catch (e) {
      return reply.code(503).send({ error: 'DynamoDB still unreachable', message: e.message })
    }
  }

  const queue = loadQueue()
  if (!queue.length) return reply.send({ success: true, flushed: 0 })

  let flushed = 0
  const failed = []

  for (const item of queue) {
    try {
      await dynamo.send(new PutItemCommand({ TableName: DYNAMO_TABLE, Item: marshall(item) }))
      flushed++
    } catch (e) {
      failed.push({ item, error: e.message })
    }
  }

  saveQueue(failed.map(f => f.item))
  return reply.send({ success: true, flushed, failed: failed.length })
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Initialise AWS resources BEFORE accepting traffic. Otherwise the server
// briefly serves requests while Rekognition collection / DynamoDB checks
// are still running — leading to spurious 'COLLECT mode' responses for
// the first scans after a cold-start.
async function bootstrap () {
  try {
    await ensureCollection()
  } catch (e) {
    fastify.log.warn('[REKOGNITION] Collection init failed:', e.message)
  }

  await initDynamo()

  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  fastify.log.info(`🛡️  PlayGuard backend running on port ${PORT}`)
  fastify.log.info(`   Region: ${AWS_REGION} | Collection: ${COLLECTION_BANNED}`)
  fastify.log.info(`   CORS origins: ${CORS_ORIGINS.join(', ')}`)
  fastify.log.info(`   Mode: ${dynamoAvailable ? 'UPLOAD' : 'COLLECT'}`)
}

bootstrap().catch(e => {
  console.error('[BOOTSTRAP] Fatal:', e)
  process.exit(1)
})
