export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2, listR2Objects, deleteR2Objects } from '@/lib/r2'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

const TABLES = [
  'sessions',
  'candidates',
  'votes',
  'jurors',
  'jury_scores',
  'live_events',
  'lineup',
  'live_votes',
  'photos',
  'page_views',
  'pwa_installs',
  'push_subscriptions',
  'email_subscribers',
  'email_campaigns',
  'chatbot_faq',
  'chatbot_conversations',
  'admin_users',
  'sponsors',
  'shares',
]

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const summary: Record<string, number> = {}
  const errors: string[] = []

  for (const table of TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(10000)

    if (error) {
      errors.push(`${table}: ${error.message}`)
      continue
    }

    summary[table] = data?.length ?? 0

    if (data && data.length > 0) {
      const json = JSON.stringify(data, null, 2)
      const key = `backups/${timestamp}/${table}.json`

      try {
        await uploadToR2(key, Buffer.from(json), 'application/json')
      } catch (err) {
        errors.push(`${table} upload: ${err instanceof Error ? err.message : 'R2 error'}`)
      }
    }
  }

  // Upload summary to R2
  const summaryData = JSON.stringify({ timestamp, tables: summary, errors }, null, 2)
  try {
    await uploadToR2(`backups/${timestamp}/_summary.json`, Buffer.from(summaryData), 'application/json')
  } catch { /* ignore */ }

  // Clean old backups (keep last 8)
  try {
    const allBackups = await listR2Objects('backups/', 1000)
    // Get unique timestamp prefixes
    const timestamps = [...new Set(allBackups.map(f => f.key.split('/')[1]).filter(Boolean))]
    timestamps.sort()
    if (timestamps.length > 8) {
      const toDelete = timestamps.slice(0, timestamps.length - 8)
      const keysToDelete = allBackups
        .filter(f => toDelete.some(ts => f.key.startsWith(`backups/${ts}/`)))
        .map(f => f.key)
      await deleteR2Objects(keysToDelete)
    }
  } catch { /* ignore cleanup errors */ }

  const totalRows = Object.values(summary).reduce((a, b) => a + b, 0)

  return NextResponse.json({
    ok: true,
    timestamp,
    tables: Object.keys(summary).length,
    totalRows,
    errors: errors.length > 0 ? errors : undefined,
  })
}
