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
├── backend/          ← Fastify server (port 3007), Node.js
│   ├── server.js
│   └── package.json
├── dashboard/        ← Next.js operator dashboard
│   ├── app/
│   ├── components/
│   └── lib/
├── types.ts          ← Shared TypeScript types
├── .env.example
└── README.md
```

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
# Backend
cd backend
npm install
cp ../.env.example .env   # fill in your values
npm run dev               # node --watch server.js on port 3007

# Dashboard
cd dashboard
npm install
cp ../.env.example .env.local   # set NEXT_PUBLIC_API_URL + NEXT_PUBLIC_PG_API_KEY
npm run dev               # http://localhost:3008
```

---

## License

MIT — Hybrid Vector / CoreHuman
