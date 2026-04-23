import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { fetch } from 'undici'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const UPLOAD_DIR = path.join(ROOT, 'uploads')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const PORT = Number(process.env.PORT || 8091)
const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE || 'https://singulai.live/alt-api'
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://singulai.live/dashboard'
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${PUBLIC_API_BASE}/auth/google/callback`
const INITIAL_BONUS = Number(process.env.SGL_INITIAL_BONUS || 10000)
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const COSTS = {
  avatar_message: 10,
  create_capsule: 150,
  create_legacy: 500,
  save_memory: 25,
  upload_document: 50,
  emotional_absorption: 75,
  recalibrate: 100,
  sync: 40
}

const MODELS = {
  safe: {
    id: 'safe',
    model: 'Safe Quantum',
    avatarName: 'Pedro',
    accent: '#26B0E2'
  },
  diffusion: {
    id: 'diffusion',
    model: 'Difusão Spin',
    avatarName: 'Laura',
    accent: '#E2269C'
  },
  focus: {
    id: 'focus',
    model: 'Foco Atômico',
    avatarName: 'Letícia',
    accent: '#E2C026'
  }
}

function now() {
  return new Date().toISOString()
}

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

function sessionToken() {
  return crypto.randomUUID()
}

function walletAddress() {
  return `0x${crypto.randomBytes(20).toString('hex')}`
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    walletAddress: user.wallet_address,
    sglBalance: Number(user.sgl_balance || 0),
    firstBonusSent: user.first_bonus_sent,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }
}

async function initDb() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      picture TEXT,
      wallet_address TEXT,
      sgl_balance NUMERIC DEFAULT 0,
      first_bonus_sent BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      network TEXT DEFAULT 'sepolia',
      chain_id INTEGER DEFAULT 11155111,
      token TEXT DEFAULT 'SGL',
      type TEXT DEFAULT 'native_singulai_alt',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sgl_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      balance_before NUMERIC NOT NULL,
      balance_after NUMERIC NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      redirect_to TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      used BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS avatar_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      model_id TEXT,
      avatar_name TEXT,
      user_message TEXT,
      avatar_reply TEXT,
      cost NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS capsules (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      message TEXT,
      delivery_type TEXT,
      recipient_email TEXT,
      recipient_name TEXT,
      scheduled_for TIMESTAMPTZ,
      status TEXT DEFAULT 'draft',
      delivered BOOLEAN DEFAULT FALSE,
      cost NUMERIC DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS legacies (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      cost NUMERIC DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      content TEXT,
      type TEXT DEFAULT 'text',
      tags JSONB DEFAULT '[]'::jsonb,
      cost NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      original_name TEXT,
      mime_type TEXT,
      size BIGINT DEFAULT 0,
      path TEXT,
      cost NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT,
      status TEXT DEFAULT 'queued',
      result JSONB DEFAULT '{}'::jsonb,
      metadata JSONB DEFAULT '{}'::jsonb,
      cost NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `)
}

async function ensureWallet(client, user) {
  const existing = await client.query(`SELECT * FROM wallets WHERE user_id = $1 LIMIT 1`, [user.id])

  if (existing.rows[0]) {
    return existing.rows[0]
  }

  const address = user.wallet_address || walletAddress()

  await client.query(
    `UPDATE users SET wallet_address = $1, updated_at = now() WHERE id = $2`,
    [address, user.id]
  )

  const wallet = await client.query(
    `INSERT INTO wallets (id, user_id, address)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [randomId('wallet'), user.id, address]
  )

  user.wallet_address = address
  return wallet.rows[0]
}

async function ledger(client, user, amount, type, reason, metadata = {}) {
  const before = Number(user.sgl_balance || 0)
  const after = before + Number(amount)

  if (after < 0) {
    const err = new Error('Insufficient SGL balance')
    err.statusCode = 402
    throw err
  }

  await client.query(
    `UPDATE users SET sgl_balance = $1, updated_at = now() WHERE id = $2`,
    [after, user.id]
  )

  user.sgl_balance = after

  const entry = await client.query(
    `INSERT INTO sgl_ledger
      (id, user_id, amount, type, reason, balance_before, balance_after, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      randomId('ledger'),
      user.id,
      amount,
      type,
      reason,
      before,
      after,
      JSON.stringify(metadata)
    ]
  )

  return entry.rows[0]
}

async function firstBonus(client, user) {
  if (user.first_bonus_sent) return null

  const entry = await ledger(client, user, INITIAL_BONUS, 'credit', 'first_valid_google_auth_bonus', {
    token: 'SGL',
    network: 'sepolia',
    source: 'singulai-alt-backend'
  })

  await client.query(
    `UPDATE users SET first_bonus_sent = true, updated_at = now() WHERE id = $1`,
    [user.id]
  )

  user.first_bonus_sent = true
  return entry
}

async function charge(client, user, service, metadata = {}) {
  const cost = COSTS[service] || 0
  if (!cost) return null

  return ledger(client, user, -cost, 'debit', service, {
    service,
    cost,
    ...metadata
  })
}

async function createSession(client, user) {
  const token = sessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  const result = await client.query(
    `INSERT INTO sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [token, user.id, token, expiresAt]
  )

  return result.rows[0]
}

async function getSession(token) {
  if (!token) return null

  const result = await pool.query(
    `SELECT s.*, u.*
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
       AND s.revoked = false
       AND s.expires_at > now()
     LIMIT 1`,
    [token]
  )

  return result.rows[0] || null
}

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
    const token = bearer || req.headers['x-session-token'] || req.query.sessionToken
    const result = await getSession(token)

    if (!result) {
      return res.status(401).json({ valid: false, error: 'Invalid session' })
    }

    req.user = {
      id: result.user_id,
      google_id: result.google_id,
      email: result.email,
      name: result.name,
      picture: result.picture,
      wallet_address: result.wallet_address,
      sgl_balance: result.sgl_balance,
      first_bonus_sent: result.first_bonus_sent,
      created_at: result.created_at,
      updated_at: result.updated_at
    }

    req.session = {
      id: result.id,
      token: result.token,
      expires_at: result.expires_at
    }

    next()
  } catch (err) {
    next(err)
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }
})

const app = express()
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined'))

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'singulai-alt-backend',
    googleAuth: true,
    db: 'postgres:singulai_alt',
    time: now()
  })
})

router.get('/auth/google', asyncHandler(async (req, res) => {
  const state = crypto.randomBytes(24).toString('hex')
  const redirectTo = req.query.next || DASHBOARD_URL

  await pool.query(
    `INSERT INTO oauth_states (state, redirect_to) VALUES ($1, $2)`,
    [state, redirectTo]
  )

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')

  res.redirect(url.toString())
}))

router.get('/auth/google/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query

  if (!code || !state) {
    return res.redirect(`${DASHBOARD_URL}?error=missing_google_code`)
  }

  const stateResult = await pool.query(
    `SELECT * FROM oauth_states WHERE state = $1 AND used = false LIMIT 1`,
    [state]
  )

  const stateRow = stateResult.rows[0]

  if (!stateRow) {
    return res.redirect(`${DASHBOARD_URL}?error=invalid_state`)
  }

  await pool.query(`UPDATE oauth_states SET used = true WHERE state = $1`, [state])

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI
    })
  })

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text()
    console.error('Google token error:', errText)
    return res.redirect(`${DASHBOARD_URL}?error=google_token_failed`)
  }

  const tokenData = await tokenResponse.json()

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  })

  if (!userInfoResponse.ok) {
    return res.redirect(`${DASHBOARD_URL}?error=google_userinfo_failed`)
  }

  const googleUser = await userInfoResponse.json()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let userResult = await client.query(
      `SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1`,
      [googleUser.sub, String(googleUser.email).toLowerCase()]
    )

    let user = userResult.rows[0]

    if (!user) {
      const newUser = await client.query(
        `INSERT INTO users (id, google_id, email, name, picture, wallet_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          randomId('user'),
          googleUser.sub,
          String(googleUser.email).toLowerCase(),
          googleUser.name || googleUser.email,
          googleUser.picture || null,
          walletAddress()
        ]
      )

      user = newUser.rows[0]
    } else {
      const updated = await client.query(
        `UPDATE users
         SET google_id = COALESCE(google_id, $1),
             name = COALESCE($2, name),
             picture = COALESCE($3, picture),
             updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [googleUser.sub, googleUser.name, googleUser.picture, user.id]
      )

      user = updated.rows[0]
    }

    const wallet = await ensureWallet(client, user)
    await firstBonus(client, user)
    const freshUser = (await client.query(`SELECT * FROM users WHERE id = $1`, [user.id])).rows[0]
    const session = await createSession(client, freshUser)

    await client.query('COMMIT')

    const redirectBase = stateRow.redirect_to || DASHBOARD_URL
    const finalUrl = new URL(redirectBase)

    finalUrl.searchParams.set('auth', 'google')
    finalUrl.searchParams.set('source', 'alt')
    finalUrl.searchParams.set('session', session.token)
    finalUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(publicUser(freshUser))))
    finalUrl.searchParams.set('wallet', encodeURIComponent(JSON.stringify(wallet)))

    res.redirect(finalUrl.toString())
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))


router.post('/auth/simple', asyncHandler(async (req, res) => {
  const rawIdentifier = String(
    req.body?.identifier ||
    req.body?.email ||
    req.body?.phone ||
    ''
  ).trim()

  if (!rawIdentifier) {
    return res.status(400).json({
      ok: false,
      error: 'Informe um e-mail ou celular'
    })
  }

  const lowered = rawIdentifier.toLowerCase()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowered)
  const digits = rawIdentifier.replace(/\D/g, '')

  let email
  let name
  let authKind

  if (isEmail) {
    email = lowered
    name = req.body?.name || lowered.split('@')[0] || 'Usuário Demo'
    authKind = 'email'
  } else if (digits.length >= 8) {
    email = `phone_${digits}@singulai.demo`
    name = req.body?.name || `Visitante ${digits.slice(-4)}`
    authKind = 'phone'
  } else {
    return res.status(400).json({
      ok: false,
      error: 'Informe um e-mail válido ou celular com DDD'
    })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let user = (
      await client.query(
        `SELECT * FROM users WHERE email = $1 LIMIT 1`,
        [email]
      )
    ).rows[0]

    if (!user) {
      user = (
        await client.query(
          `INSERT INTO users (id, email, name, wallet_address)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [randomId('user'), email, name, walletAddress()]
        )
      ).rows[0]
    } else {
      user = (
        await client.query(
          `UPDATE users
           SET name = COALESCE($1, name),
               updated_at = now()
           WHERE id = $2
           RETURNING *`,
          [name, user.id]
        )
      ).rows[0]
    }

    const wallet = await ensureWallet(client, user)
    await firstBonus(client, user)

    const freshUser = (
      await client.query(
        `SELECT * FROM users WHERE id = $1`,
        [user.id]
      )
    ).rows[0]

    const session = await createSession(client, freshUser)

    await client.query('COMMIT')

    res.json({
      ok: true,
      valid: true,
      authKind,
      session: session.token,
      sessionToken: session.token,
      user: publicUser(freshUser),
      wallet,
      sglBalance: Number(freshUser.sgl_balance || 0)
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))


router.post('/auth/demo', asyncHandler(async (req, res) => {
  const email = String(req.body?.email || 'alt-demo@singulai.live').toLowerCase()
  const name = req.body?.name || 'SingulAI Alt Demo'

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let user = (await client.query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email])).rows[0]

    if (!user) {
      user = (await client.query(
        `INSERT INTO users (id, email, name, wallet_address)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [randomId('user'), email, name, walletAddress()]
      )).rows[0]
    }

    const wallet = await ensureWallet(client, user)
    await firstBonus(client, user)
    const freshUser = (await client.query(`SELECT * FROM users WHERE id = $1`, [user.id])).rows[0]
    const session = await createSession(client, freshUser)

    await client.query('COMMIT')

    res.json({
      ok: true,
      valid: true,
      session: session.token,
      sessionToken: session.token,
      user: publicUser(freshUser),
      wallet,
      sglBalance: Number(freshUser.sgl_balance || 0)
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.post('/auth/verify-session', asyncHandler(async (req, res) => {
  const token = req.body?.sessionToken || req.body?.session || req.headers['x-session-token']
  const result = await getSession(token)

  if (!result) {
    return res.status(401).json({ valid: false })
  }

  const user = {
    id: result.user_id,
    google_id: result.google_id,
    email: result.email,
    name: result.name,
    picture: result.picture,
    wallet_address: result.wallet_address,
    sgl_balance: result.sgl_balance,
    first_bonus_sent: result.first_bonus_sent,
    created_at: result.created_at,
    updated_at: result.updated_at
  }

  const client = await pool.connect()
  try {
    const wallet = await ensureWallet(client, user)
    res.json({
      valid: true,
      session: token,
      user: publicUser(user),
      wallet,
      sglBalance: Number(user.sgl_balance || 0)
    })
  } finally {
    client.release()
  }
}))

router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) })
}))

router.get('/dashboard/summary', auth, asyncHandler(async (req, res) => {
  const userId = req.user.id

  const counts = {}
  for (const table of ['capsules', 'legacies', 'memories', 'documents', 'actions']) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE user_id = $1`, [userId])
    counts[table] = result.rows[0].count
  }

  const wallet = (await pool.query(`SELECT * FROM wallets WHERE user_id = $1 LIMIT 1`, [userId])).rows[0]

  res.json({
    ok: true,
    user: publicUser(req.user),
    wallet,
    sglBalance: Number(req.user.sgl_balance || 0),
    counts,
    models: Object.values(MODELS),
    costs: COSTS
  })
}))

router.get('/models', (req, res) => res.json({ ok: true, models: Object.values(MODELS) }))
router.get('/costs', (req, res) => res.json({ ok: true, costs: COSTS }))

router.get('/sgl/balance', auth, (req, res) => {
  res.json({
    ok: true,
    balance: Number(req.user.sgl_balance || 0),
    token: 'SGL',
    network: 'sepolia',
    chainId: 11155111
  })
})

router.get('/sgl/ledger', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM sgl_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  )

  res.json({ ok: true, ledger: result.rows })
}))

router.post('/sgl/credit', auth, asyncHandler(async (req, res) => {
  const amount = Number(req.body?.amount || 0)

  if (!amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid amount' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const entry = await ledger(client, req.user, amount, 'credit', req.body?.reason || 'dev_credit', { dev: true })
    await client.query('COMMIT')
    res.json({ ok: true, ledger: entry, balance: Number(req.user.sgl_balance || 0) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.post('/avatar/message', auth, asyncHandler(async (req, res) => {
  const message = String(req.body?.message || '').trim()
  const modelId = req.body?.modelId || 'safe'
  const model = MODELS[modelId] || MODELS.safe

  if (!message) {
    return res.status(400).json({ ok: false, error: 'Message is required' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const debit = await charge(client, req.user, 'avatar_message', { modelId, messageLength: message.length })

    const replyText = `Recebi sua mensagem em ${model.model}. Esta resposta vem do backend alternativo com sessão real e saldo SGL isolado.`

    const record = (await client.query(
      `INSERT INTO avatar_messages
        (id, user_id, model_id, avatar_name, user_message, avatar_reply, cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [randomId('msg'), req.user.id, model.id, model.avatarName, message, replyText, COSTS.avatar_message]
    )).rows[0]

    await client.query('COMMIT')

    res.json({
      ok: true,
      message: record,
      reply: {
        id: randomId('reply'),
        role: 'avatar',
        modelId: model.id,
        avatarName: model.avatarName,
        content: replyText,
        createdAt: now()
      },
      ledger: debit,
      balance: Number(req.user.sgl_balance || 0)
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/avatar/messages', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM avatar_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  )

  res.json({ ok: true, messages: result.rows })
}))

router.post('/capsules', auth, asyncHandler(async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const debit = await charge(client, req.user, 'create_capsule', req.body || {})

    const result = await client.query(
      `INSERT INTO capsules
        (id, user_id, title, message, delivery_type, recipient_email, recipient_name, scheduled_for, cost, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        randomId('capsule'),
        req.user.id,
        req.body?.title || 'Nova cápsula',
        req.body?.message || '',
        req.body?.deliveryType || 'scheduled',
        req.body?.recipientEmail || '',
        req.body?.recipientName || '',
        req.body?.scheduledFor || null,
        COSTS.create_capsule,
        JSON.stringify(req.body?.metadata || {})
      ]
    )

    await client.query('COMMIT')

    res.json({ ok: true, capsule: result.rows[0], ledger: debit, balance: Number(req.user.sgl_balance || 0) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/capsules', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM capsules WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id])
  res.json({ ok: true, capsules: result.rows })
}))

router.post('/legacy', auth, asyncHandler(async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const debit = await charge(client, req.user, 'create_legacy', req.body || {})

    const result = await client.query(
      `INSERT INTO legacies (id, user_id, title, description, cost, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        randomId('legacy'),
        req.user.id,
        req.body?.title || 'Legado Digital',
        req.body?.description || '',
        COSTS.create_legacy,
        JSON.stringify(req.body?.metadata || {})
      ]
    )

    await client.query('COMMIT')
    res.json({ ok: true, legacy: result.rows[0], ledger: debit, balance: Number(req.user.sgl_balance || 0) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/legacy', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM legacies WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id])
  res.json({ ok: true, legacies: result.rows })
}))

router.post('/memories', auth, asyncHandler(async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const debit = await charge(client, req.user, 'save_memory', req.body || {})

    const result = await client.query(
      `INSERT INTO memories (id, user_id, title, content, type, tags, cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        randomId('memory'),
        req.user.id,
        req.body?.title || 'Memória',
        req.body?.content || '',
        req.body?.type || 'text',
        JSON.stringify(req.body?.tags || []),
        COSTS.save_memory
      ]
    )

    await client.query('COMMIT')
    res.json({ ok: true, memory: result.rows[0], ledger: debit, balance: Number(req.user.sgl_balance || 0) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/memories', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id])
  res.json({ ok: true, memories: result.rows })
}))

router.post('/documents', auth, upload.single('file'), asyncHandler(async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const debit = await charge(client, req.user, 'upload_document', {
      originalName: req.file?.originalname,
      size: req.file?.size
    })

    const result = await client.query(
      `INSERT INTO documents
        (id, user_id, title, original_name, mime_type, size, path, cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        randomId('doc'),
        req.user.id,
        req.body?.title || req.file?.originalname || 'Documento',
        req.file?.originalname || null,
        req.file?.mimetype || null,
        req.file?.size || 0,
        req.file?.path || null,
        COSTS.upload_document
      ]
    )

    await client.query('COMMIT')
    res.json({ ok: true, document: result.rows[0], ledger: debit, balance: Number(req.user.sgl_balance || 0) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/documents', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id])
  res.json({ ok: true, documents: result.rows })
}))

router.post('/actions/:type', auth, asyncHandler(async (req, res) => {
  const type = req.params.type

  if (!['emotional_absorption', 'recalibrate', 'sync'].includes(type)) {
    return res.status(400).json({ ok: false, error: 'Unknown action type' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const debit = await charge(client, req.user, type, req.body || {})

    const result = await client.query(
      `INSERT INTO actions (id, user_id, type, result, metadata, cost)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        randomId('action'),
        req.user.id,
        type,
        JSON.stringify({ message: `Ação ${type} registrada no backend alternativo.`, etaSeconds: 15 }),
        JSON.stringify(req.body || {}),
        COSTS[type]
      ]
    )

    await client.query('COMMIT')
    res.json({ ok: true, action: result.rows[0], ledger: debit, balance: Number(req.user.sgl_balance || 0) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/actions', auth, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM actions WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id])
  res.json({ ok: true, actions: result.rows })
}))

router.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found', path: req.originalUrl })
})

app.use('/alt-api', router)
app.use('/', router)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.message || 'Internal server error'
  })
})

await initDb()

app.listen(PORT, '127.0.0.1', () => {
  console.log(`SingulAI Alt Backend running on http://127.0.0.1:${PORT}`)
  console.log(`Google callback: ${GOOGLE_REDIRECT_URI}`)
})
