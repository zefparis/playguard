/**
 * authHook timing-safe comparison tests.
 *
 * Uses Node's built-in test runner (node:test) — zero external dependencies.
 * Run with: node --test auth.test.js
 *
 * Tests the exact timing-safe comparison pattern used in server.js:authHook:
 *   - valid key → passes (no reply sent)
 *   - missing key → 401 Unauthorized
 *   - wrong key (same length) → 401 Unauthorized
 *   - wrong key (different length) → 401 Unauthorized (no crash/exception)
 *
 * @copyright (c) 2026 Benjamin BARRERE / IA SOLUTION
 * @license Patents Pending FR2514274 | FR2514546
 */

const { test, describe } = require('node:test')
const assert = require('node:assert')
const crypto = require('node:crypto')

const PG_API_KEY = 'test-playguard-api-key-min-32-chars!!'

/**
 * Replicates the authHook logic from server.js exactly.
 * This is the function under test — it must stay in sync with server.js.
 */
async function authHook (request, reply) {
  const provided = request.headers['x-playguard-key']
  if (typeof provided !== 'string' || !provided) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  const authBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(PG_API_KEY)
  let isAuthorized = false
  if (authBuf.length === expectedBuf.length) {
    isAuthorized = crypto.timingSafeEqual(authBuf, expectedBuf)
  }
  if (!isAuthorized) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}

function mockRequest (headers = {}) {
  return { headers }
}

function mockReply () {
  const r = {
    statusCode: 200,
    body: null,
    code (c) { this.statusCode = c; return this },
    send (b) { this.body = b; return this },
  }
  return r
}

describe('authHook — timing-safe API key comparison', () => {
  test('valid key → passes (reply untouched, statusCode 200)', async () => {
    const req = mockRequest({ 'x-playguard-key': PG_API_KEY })
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 200)
    assert.strictEqual(reply.body, null)
  })

  test('missing key → 401 Unauthorized', async () => {
    const req = mockRequest({})
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })

  test('undefined header value → 401 Unauthorized', async () => {
    const req = mockRequest({ 'x-playguard-key': undefined })
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })

  test('empty string key → 401 Unauthorized', async () => {
    const req = mockRequest({ 'x-playguard-key': '' })
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })

  test('wrong key (same length) → 401 Unauthorized', async () => {
    // Same length as PG_API_KEY but different content
    const wrongKey = 'X'.repeat(PG_API_KEY.length)
    const req = mockRequest({ 'x-playguard-key': wrongKey })
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })

  test('wrong key (different length, shorter) → 401 Unauthorized, no crash', async () => {
    const req = mockRequest({ 'x-playguard-key': 'short' })
    const reply = mockReply()
    // Must not throw — length guard prevents timingSafeEqual from throwing
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })

  test('wrong key (different length, longer) → 401 Unauthorized, no crash', async () => {
    const req = mockRequest({ 'x-playguard-key': PG_API_KEY + 'EXTRA' })
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })

  test('partial prefix of key → 401 Unauthorized, no crash', async () => {
    // Attacker who knows the first N bytes — must still be rejected
    const req = mockRequest({ 'x-playguard-key': PG_API_KEY.slice(0, 10) })
    const reply = mockReply()
    await authHook(req, reply)
    assert.strictEqual(reply.statusCode, 401)
    assert.strictEqual(reply.body.error, 'Unauthorized')
  })
})
