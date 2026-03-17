export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// ==================== ENV ====================
const CES_PAT = process.env.SUPABASE_ACCESS_TOKEN || ''
const CES_REF = 'xarrchsokuhobwqvcnkg'
const LCDP_PAT = process.env.SUPABASE_LCDP_PAT || ''
const LCDP_REF = process.env.SUPABASE_LCDP_REF || 'gotmbirdcmkaisfebvpc'
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || ''
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || ''
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID || ''
const R2_TOKEN = 'StdWNTf0xO_YnyebAh0-0thVtPOx8_iP7daukuN0'
const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
const PAYPAL_ID = process.env.PAYPAL_CLIENT_ID || ''
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || ''

// ==================== HELPERS ====================
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch { return fallback }
}

// ==================== SUPABASE ====================
interface DayStats { rest: number; storage: number; auth: number }

async function getSupabaseUsage(pat: string, ref: string): Promise<{ days: Record<string, DayStats>; totalStorage: number; estBwGB: number } | null> {
  if (!pat) return null
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/usage.api-counts?interval=7day`,
    { headers: { Authorization: `Bearer ${pat}` }, cache: 'no-store' }
  )
  if (!res.ok) return null
  const data = await res.json()
  const rows = data.result || []
  const days: Record<string, DayStats> = {}
  for (const r of rows) {
    const day = r.timestamp.substring(0, 10)
    if (!days[day]) days[day] = { rest: 0, storage: 0, auth: 0 }
    days[day].rest += r.total_rest_requests || 0
    days[day].storage += r.total_storage_requests || 0
    days[day].auth += r.total_auth_requests || 0
  }
  const totalStorage = Object.values(days).reduce((s, d) => s + d.storage, 0)
  return { days, totalStorage, estBwGB: +(totalStorage * 0.00039).toFixed(2) }
}

// ==================== VERCEL ====================
async function getVercelData() {
  if (!VERCEL_TOKEN) return null
  const [projRes, deplRes] = await Promise.all([
    fetch('https://api.vercel.com/v9/projects', { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }),
    fetch('https://api.vercel.com/v6/deployments?limit=12&state=READY', { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }),
  ])
  const projData = await projRes.json()
  const deplData = await deplRes.json()
  const projects = (projData.projects || []).map((p: Record<string, unknown>) => ({
    name: p.name, id: p.id, framework: p.framework,
    updatedAt: new Date(p.updatedAt as number).toISOString().substring(0, 16),
  }))
  // Group deploys by project, last deploy per project
  const byProject: Record<string, { count: number; last: string; state: string }> = {}
  for (const d of (deplData.deployments || [])) {
    if (!byProject[d.name]) byProject[d.name] = { count: 0, last: new Date(d.created).toISOString().substring(0, 16), state: d.state }
    byProject[d.name].count++
  }
  return { projects, deployments: byProject, plan: 'hobby' }
}

// ==================== STRIPE ====================
async function getStripeData() {
  if (!STRIPE_KEY) return null
  const headers = { Authorization: `Basic ${btoa(STRIPE_KEY + ':')}` }
  const [balRes, chargesRes, subsRes] = await Promise.all([
    fetch('https://api.stripe.com/v1/balance', { headers }),
    fetch('https://api.stripe.com/v1/charges?limit=10', { headers }),
    fetch('https://api.stripe.com/v1/subscriptions?limit=100&status=active', { headers }),
  ])
  const balance = await balRes.json()
  const charges = await chargesRes.json()
  const subs = await subsRes.json()
  const available = (balance.available || []).reduce((s: number, b: { amount: number }) => s + b.amount, 0) / 100
  const pending = (balance.pending || []).reduce((s: number, b: { amount: number }) => s + b.amount, 0) / 100
  const recentCharges = (charges.data || []).map((c: Record<string, unknown>) => ({
    amount: (c.amount as number) / 100, currency: c.currency, status: c.status,
    created: new Date((c.created as number) * 1000).toISOString().substring(0, 10),
    description: c.description || c.metadata,
  }))
  return {
    balance: { available, pending, currency: 'eur' },
    activeSubscriptions: (subs.data || []).length,
    recentCharges,
  }
}

// ==================== R2 / CLOUDFLARE ====================
async function getR2Data() {
  if (!R2_ACCOUNT || !R2_TOKEN) return null
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT}/r2/buckets/chantenscene-assets`,
    { headers: { Authorization: `Bearer ${R2_TOKEN}` } }
  )
  if (!res.ok) return { error: res.status }
  const data = await res.json()
  return { bucket: data.result || data }
}

// ==================== OPENAI ====================
async function getOpenAIData() {
  if (!OPENAI_KEY) return null
  // OpenAI doesn't expose billing via standard API key anymore
  // But we can check models access as a health check
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
  })
  return { accessible: res.ok, status: res.status }
}

// ==================== PAYPAL ====================
async function getPayPalData() {
  if (!PAYPAL_ID || !PAYPAL_SECRET) return null
  // Get access token
  const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(PAYPAL_ID + ':' + PAYPAL_SECRET)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!tokenRes.ok) return { error: tokenRes.status }
  const tokenData = await tokenRes.json()
  const token = tokenData.access_token
  // Get recent transactions (last 30 days)
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86400000)
  const txRes = await fetch(
    `https://api-m.paypal.com/v1/reporting/transactions?start_date=${from.toISOString()}&end_date=${now.toISOString()}&fields=all&page_size=10`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )
  const txData = txRes.ok ? await txRes.json() : null
  return {
    accessible: true,
    totalTransactions: txData?.total_items || 0,
    recentTransactions: (txData?.transaction_details || []).slice(0, 5).map((t: Record<string, unknown>) => {
      const info = t.transaction_info as Record<string, unknown> || {}
      return {
        id: info.transaction_id,
        amount: info.transaction_amount,
        date: info.transaction_initiation_date,
        status: info.transaction_status,
      }
    }),
  }
}

// ==================== SITES UP CHECK ====================
async function checkSites() {
  const sites = [
    { name: 'ChanteEnScene', url: 'https://www.chantenscene.fr' },
    { name: 'JCM PNL', url: 'https://jeanchristophemartinez.fr' },
    { name: 'LCDP Ecole', url: 'https://lechantdespossible.fr' },
    { name: 'ToutEnMel', url: 'https://toutenmel.fr' },
  ]
  return Promise.all(sites.map(async (s) => {
    const start = Date.now()
    try {
      const res = await fetch(s.url, { redirect: 'manual', cache: 'no-store' })
      return { ...s, up: res.status < 500, ms: Date.now() - start, status: res.status }
    } catch {
      return { ...s, up: false, ms: Date.now() - start, status: 0 }
    }
  }))
}

// ==================== MAIN ====================
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}

export async function GET() {
  const timestamp = new Date().toISOString()

  // Fetch everything in parallel
  const [supabaseCES, supabaseLCDP, vercel, stripe, r2, openai, paypal, sites] = await Promise.all([
    safe(() => getSupabaseUsage(CES_PAT, CES_REF), null),
    safe(() => getSupabaseUsage(LCDP_PAT, LCDP_REF), null),
    safe(() => getVercelData(), null),
    safe(() => getStripeData(), null),
    safe(() => getR2Data(), null),
    safe(() => getOpenAIData(), null),
    safe(() => getPayPalData(), null),
    safe(() => checkSites(), []),
  ])

  // Monthly costs
  const costs = {
    supabaseCES: { plan: 'pro', cost: 25, note: supabaseCES && supabaseCES.estBwGB < 5.5 ? 'Downgrade possible → -25€' : 'Necessaire' },
    supabaseLCDP: { plan: 'free', cost: 0 },
    vercel: { plan: 'hobby', cost: 0, note: '75% CPU — surveiller' },
    r2: { plan: 'free', cost: 0 },
    ionos: { plan: 'hosting', cost: 5 },
    stripe: { plan: 'pay-per-use', cost: 0, note: '1.4% + 0.25€/tx' },
    total: 30,
    potential: 5,
  }

  const result = {
    timestamp,
    sites,
    supabase: { ces: supabaseCES, lcdp: supabaseLCDP },
    vercel,
    stripe,
    r2,
    openai,
    paypal,
    costs,
  }

  return NextResponse.json(result, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
