export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
      const filePath = `${timestamp}/${table}.json`

      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(filePath, json, {
          contentType: 'application/json',
          upsert: true,
        })

      if (uploadError) {
        errors.push(`${table} upload: ${uploadError.message}`)
      }
    }
  }

  // Upload summary
  const summaryData = JSON.stringify({ timestamp, tables: summary, errors }, null, 2)
  await supabase.storage
    .from('backups')
    .upload(`${timestamp}/_summary.json`, summaryData, {
      contentType: 'application/json',
      upsert: true,
    })

  // Clean old backups (keep last 8 weeks)
  const { data: folders } = await supabase.storage
    .from('backups')
    .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } })

  if (folders && folders.length > 8) {
    const toDelete = folders.slice(0, folders.length - 8)
    for (const folder of toDelete) {
      const { data: files } = await supabase.storage
        .from('backups')
        .list(folder.name)
      if (files) {
        await supabase.storage
          .from('backups')
          .remove(files.map(f => `${folder.name}/${f.name}`))
      }
    }
  }

  const totalRows = Object.values(summary).reduce((a, b) => a + b, 0)

  return NextResponse.json({
    ok: true,
    timestamp,
    tables: Object.keys(summary).length,
    totalRows,
    errors: errors.length > 0 ? errors : undefined,
  })
}
