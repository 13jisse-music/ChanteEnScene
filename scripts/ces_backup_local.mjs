// Backup local complet de la base CES vers le bureau.
// Exporte toutes les tables en JSON + les candidats en CSV (pour les relances).
// Usage : node scripts/ces_backup_local.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Lecture .env.local
const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Creds manquantes'); process.exit(1) }

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

const TABLES = [
  'sessions', 'candidates', 'votes', 'jurors', 'jury_scores', 'jury_priorities',
  'live_events', 'lineup', 'live_votes', 'photos', 'page_views', 'pwa_installs',
  'push_subscriptions', 'email_subscribers', 'email_campaigns', 'email_opens',
  'chatbot_faq', 'chatbot_conversations', 'admin_users', 'sponsors', 'shares',
  'registration_log', 'contact_messages',
]

const stamp = '2026-06-03'
const dir = `C:/tmp/CES_Backup_${stamp}`
fs.mkdirSync(dir, { recursive: true })

function toCsv(rows) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) s = '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
}

async function fetchAll(table) {
  const all = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) return { error }
    all.push(...data)
    if (data.length < PAGE) break
  }
  return { data: all }
}

const summary = {}
for (const table of TABLES) {
  const { data, error } = await fetchAll(table)
  if (error) { summary[table] = `ERREUR: ${error.message}`; continue }
  summary[table] = data.length
  fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(data, null, 2), 'utf8')
  // CSV pour candidats et inscrits newsletter (relances faciles dans Excel)
  if ((table === 'candidates' || table === 'email_subscribers') && data.length) {
    fs.writeFileSync(path.join(dir, `${table}.csv`), '﻿' + toCsv(data), 'utf8')
  }
}

fs.writeFileSync(path.join(dir, '_resume.json'), JSON.stringify({ date: stamp, tables: summary }, null, 2), 'utf8')
console.log('Backup termine dans:', dir)
console.log(JSON.stringify(summary, null, 2))
