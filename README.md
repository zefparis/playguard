# PlayGuard — Online Player Verification

Player identity verification for South African gaming boards.  
Detects **banned players** and **minors** before granting access.  
Powered by AWS Rekognition — part of the HV-GUARD Suite.

---

## Purpose

South African gaming boards (WCGRB, ECGBB, KZNGLB, GGB) require operators to:
- Deny access to **self-excluded / banned players** (face match against banned registry)
- Deny access to **minors** (age estimation from biometrics)

PlayGuard runs both checks in parallel and returns a single `verdict`: **ALLOWED**, **MINOR**, or **BANNED**.

---

## Architecture

```
playguard/
├── src/              ← Vite + React 18 SPA (operator UI, deployed on Vercel)
│   ├── pages/        ← Home, Scan, BannedList, AddBan, Events
│   ├── services/api.ts
│   └── types.ts      ← Shared TypeScript types (ScanResult, BanRecord)
├── api/proxy.ts      ← Vercel Edge Function. Holds PG_API_KEY server-side
│                       and forwards /api/proxy/* to the upstream backend.
├── backend/          ← Fastify server (port 3007), Node.js, Rekognition + DynamoDB
│   ├── server.js
│   └── package.json
├── .env.example
└── README.md
```

**Security model**: the SPA never holds the API key. It calls same-origin
`/api/proxy/playguard/*`. The edge function injects `X-API-Key` and forwards
to `PG_API_URL`. CORS on the backend is whitelisted to the SPA origin and
the Congo Gaming domains.

---

## API Endpoints

All endpoints require the `x-playguard-key` header.

### `POST /playguard/scan`
Run a player check. Accepts **multipart/form-data** (file field `image`) or **JSON** (`{ image: "<base64>" }`).

Optional JSON body fields: `playerId`, `boardId`, `platform`.

**Response:**
```json
{
  "success": true,
  "result": {
    "scanId": "uuid",
    "verdict": "ALLOWED | MINOR | BANNED",
    "access": true,
    "age": { "range": { "Low": 22, "High": 32 }, "isMinor": false, "threshold": 18 },
    "ban": { "detected": false },
    "quality": { "Brightness": 84.2, "Sharpness": 91.5 },
    "faceConfidence": 99.8,
    "timestamp": "2026-04-22T10:00:00.000Z"
  }
}
```

### `POST /playguard/ban`
Index a face into the banned collection.

**Body:** `{ image: "<base64>", externalId: "player-id", reason: "self-exclusion", operator: "Casino X" }`

### `DELETE /playguard/ban/:faceId`
Remove a face from the banned collection and DynamoDB.

### `GET /playguard/status`
Collection size, queue size, thresholds, AWS region, mode (COLLECT/UPLOAD).

### `GET /playguard/events?verdict=BANNED&limit=50`
Last N scan events from DynamoDB (or local queue in COLLECT mode).

### `POST /playguard/sync`
Flush offline queue to DynamoDB (call when connectivity is restored).

---

## Environment Variables

| Variable               | Default                  | Description                         |
|------------------------|--------------------------|-------------------------------------|
| `PG_API_KEY`           | `change-me`              | Auth key for all endpoints          |
| `AWS_REGION`           | `af-south-1`             | AWS region                          |
| `AWS_ACCESS_KEY_ID`    | —                        | AWS credential                      |
| `AWS_SECRET_ACCESS_KEY`| —                        | AWS credential                      |
| `PG_COLLECTION_BANNED` | `hv-playguard-banned`    | Rekognition collection ID           |
| `PG_DYNAMO_TABLE`      | `hv-playguard-events`    | DynamoDB table name                 |
| `PG_AGE_THRESHOLD`     | `18`                     | Min age for access                  |
| `PG_MATCH_THRESHOLD`   | `90`                     | Min similarity (%) for ban match    |
| `PG_QUEUE_PATH`        | `./playguard-queue.json` | Offline queue file path             |

---

## COLLECT / UPLOAD Flow

PlayGuard operates in two modes:

- **UPLOAD** — DynamoDB reachable: all scan events and ban records are written immediately.
- **COLLECT** — DynamoDB unreachable: events are queued to `PG_QUEUE_PATH` (local JSON file). Call `POST /playguard/sync` to flush when connectivity returns.

The mode is reported in `GET /playguard/status` → `mode`.

---

## DynamoDB Table Schema

**Table name:** `hv-playguard-events`  
**Billing:** PAY_PER_REQUEST recommended  
**Primary key:** `pk` (String) + `sk` (String)

| pk              | sk (ISO timestamp)  | Type    | Description              |
|-----------------|---------------------|---------|--------------------------|
| `SCAN#<uuid>`   | `2026-04-22T10:…`   | Scan    | Player scan event        |
| `BAN#<faceId>`  | `2026-04-22T10:…`   | Ban     | Banned player record     |

**Attributes (Scan):** `scanId`, `playerId`, `boardId`, `platform`, `verdict`, `access`, `age`, `ban`, `quality`, `faceConfidence`, `timestamp`  
**Attributes (Ban):** `faceId`, `externalId`, `reason`, `operator`, `bannedAt`

---

## AWS IAM Permissions Required

```json
{
  "Effect": "Allow",
  "Action": [
    "rekognition:DetectFaces",
    "rekognition:SearchFacesByImage",
    "rekognition:IndexFaces",
    "rekognition:DeleteFaces",
    "rekognition:CreateCollection",
    "rekognition:ListFaces",
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:DeleteItem",
    "dynamodb:Query",
    "dynamodb:Scan",
    "dynamodb:DescribeTable"
  ],
  "Resource": [
    "arn:aws:rekognition:af-south-1:*:collection/hv-playguard-banned",
    "arn:aws:dynamodb:af-south-1:*:table/hv-playguard-events"
  ]
}
```

---

## Development

```bash
# Backend (Fastify, AWS Rekognition + DynamoDB)
cd backend
npm install
cp ../.env.example .env   # fill in your values; PG_API_KEY MUST be set or boot fails
npm run dev               # node --watch server.js on port 3007

# SPA (Vite)
cd ..
npm install
npm run dev               # http://localhost:3007 (Vite dev server)
# In dev, /api/proxy is unavailable. Either deploy a preview to Vercel or
# point the SPA temporarily at the backend (edit src/services/api.ts).
```

## Deployment (Vercel)

Set these env vars in the Vercel project (Production + Preview, **not**
in any committed file):

| Var            | Description                                     |
|----------------|-------------------------------------------------|
| `PG_API_URL`   | Upstream PlayGuard backend URL                  |
| `PG_API_KEY`   | Real API key — never exposed to the browser     |
| `PG_TENANT_ID` | (Optional) injected on every JSON request body  |

---

## License

MIT — Hybrid Vector / CoreHuman
