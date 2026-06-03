// Autotest E2E regie demi-finale + vote jury (slider+buzz) sur le site deploye.
// Pilote la regie via la base (reproduit callToStage/openVoting/finishPerformance corriges)
// + 5 jures reels dans Chrome qui votent. Verifie jury_scores. Nettoie le live_event a la fin.
// Usage : node scripts/autotest_regie_jury.mjs
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'https://chantenscene.fr'
const SESSION_ID = 'b3768288-3081-4e1a-b56e-94b0fc3d6bc3'
const ALL_TOKENS = ['TESTJURY1', 'TESTJURY2', 'TESTJURY3', 'TESTJURY4', 'TESTJURY5']
const NB_JURES = Number(process.env.NB_JURES || 2)   // allege par defaut (Surface 8Go)
const NB_CAND = Number(process.env.NB_CAND || 1)
const JURY_TOKENS = ALL_TOKENS.slice(0, NB_JURES)

// --- creds depuis .env.local ---
const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
function check(name, ok, detail = '') { results.push({ name, ok, detail }); log(ok ? 'OK ' : 'KO ', name, detail) }

// --- Actions regie (reproduisent admin/demi-finale/actions.ts corriges) ---
async function callToStage(eventId, candId) {
  await sb.from('lineup').update({ status: 'performing', started_at: new Date().toISOString(), ended_at: null, vote_opened_at: null, vote_closed_at: null }).eq('live_event_id', eventId).eq('candidate_id', candId)
  await sb.from('live_events').update({ current_candidate_id: candId, status: 'live', is_voting_open: false }).eq('id', eventId)
}
async function openVoting(eventId, candId) {
  const now = new Date().toISOString()
  await sb.from('lineup').update({ ended_at: now, vote_opened_at: now }).eq('live_event_id', eventId).eq('candidate_id', candId)
  await sb.from('live_events').update({ is_voting_open: true }).eq('id', eventId)
}
async function finishPerformance(eventId, candId) {
  await sb.from('lineup').update({ status: 'completed', vote_closed_at: new Date().toISOString() }).eq('live_event_id', eventId).eq('candidate_id', candId)
  await sb.from('live_events').update({ current_candidate_id: null, is_voting_open: false }).eq('id', eventId)
}

// --- Vote d'un jure dans sa page ---
async function juryVote(page, scoreValue, doBuzz) {
  await page.waitForSelector('input[type=range]', { timeout: 15000 })
  // Tout via page.evaluate (querySelector interne) : pas de passage d'ElementHandle (qui bloquait en headless)
  await page.evaluate((v) => {
    const el = document.querySelector('input[type=range]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true }))
  }, scoreValue)
  await sleep(400)
  let buzzResult = 'non tente'
  if (doBuzz) {
    buzzResult = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /buzz/i.test(x.textContent || ''))
      if (!b) return 'introuvable'
      if (b.disabled) return 'bloque'
      b.click(); return 'clique'
    })
  }
  await sleep(400)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('Valider la note'))
    if (b) b.click()
  })
  await sleep(1800)
  return buzzResult
}

async function main() {
  // 1. Candidats de la session test
  const { data: cands } = await sb.from('candidates').select('id, first_name, last_name').eq('session_id', SESSION_ID).eq('status', 'semifinalist').order('created_at')
  check('6 candidats de test presents', cands.length === 6, `(${cands.length})`)
  const testCands = cands.slice(0, NB_CAND)

  // 2. Nettoyage prealable (au cas ou un run precedent a laisse des choses)
  const { data: oldEvents } = await sb.from('live_events').select('id').eq('session_id', SESSION_ID)
  for (const e of oldEvents || []) { await sb.from('lineup').delete().eq('live_event_id', e.id); await sb.from('live_events').delete().eq('id', e.id) }
  await sb.from('jury_scores').delete().eq('session_id', SESSION_ID).eq('event_type', 'semifinal')

  // 3. Creer live_event + lineup
  const { data: evt } = await sb.from('live_events').insert({ session_id: SESSION_ID, event_type: 'semifinal', status: 'pending', is_voting_open: false }).select('id').single()
  const eventId = evt.id
  check('live_event semifinal cree', !!eventId)
  let pos = 0
  for (const c of cands) await sb.from('lineup').insert({ live_event_id: eventId, candidate_id: c.id, position: pos++, status: 'pending' })
  await sb.from('live_events').update({ status: 'live' }).eq('id', eventId)

  // 4. Chrome + 5 pages jures
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 90000, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const ctx = browser.defaultBrowserContext()
  await ctx.overridePermissions(BASE, []) // refuse notifications/geoloc sans prompt
  const pages = []
  for (const tok of JURY_TOKENS) {
    const p = await browser.newPage()
    p.on('dialog', (d) => d.dismiss().catch(() => {})) // ferme tout dialog bloquant (alert/confirm/beforeunload)
    // Force la visibilite (en headless visibilityState='hidden' bloque le polling fallback du hook)
    await p.evaluateOnNewDocument(() => {
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible' })
      Object.defineProperty(document, 'hidden', { get: () => false })
    })
    await p.goto(`${BASE}/jury/${tok}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    pages.push(p)
  }
  await sleep(4000)
  check('pages jures chargees', pages.length === NB_JURES, `(${pages.length}/${NB_JURES})`)

  // Diagnostic : une evaluation simple bloque-t-elle ? (detecte dialog/main-thread bloque)
  try {
    const ping = await Promise.race([pages[0].evaluate(() => 2 + 2), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 10s')), 10000))])
    check('evaluation JS page jure repond', ping === 4, `(=${ping})`)
  } catch (e) { check('evaluation JS page jure repond', false, e.message) }

  // 5. Sequence pour 2 candidats
  for (let ci = 0; ci < testCands.length; ci++) {
    const cand = testCands[ci]
    const cname = `${cand.first_name} ${cand.last_name}`
    log(`--- Candidat ${ci + 1}: ${cname} ---`)
    await callToStage(eventId, cand.id)
    await sleep(6000) // laisse le realtime/poll propager "performance en cours"
    await openVoting(eventId, cand.id)
    await sleep(7000) // laisse le poll 5s rattraper l'ouverture du vote

    // Diagnostic : sur le 1er candidat, dump l'etat visible de la page jury1
    if (ci === 0) {
      const hasSlider = await pages[0].$('input[type=range]')
      if (!hasSlider) {
        const txt = await pages[0].evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' | '))
        log('DIAG jury1 (pas de slider):', txt)
      } else {
        log('DIAG jury1 : slider present')
      }
    }

    // Chaque jure vote. Sur le candidat 1, jury1 pose un buzz. Sur le candidat 2, jury1 retente (doit etre bloque).
    const scoreByJury = [85, 60, 45, 70, 30]
    for (let ji = 0; ji < pages.length; ji++) {
      const doBuzz = ji === 0 // jury1 tente le buzz a chaque fois
      try {
        const r = await juryVote(pages[ji], scoreByJury[ji], doBuzz)
        if (ji === 0) check(`Buzz jury1 candidat ${ci + 1} : ${ci === 0 ? 'doit cliquer' : 'doit etre bloque'}`, ci === 0 ? r === 'clique' : r === 'bloque', `(${r})`)
      } catch (e) {
        check(`Vote jury${ji + 1} candidat ${ci + 1}`, false, e.message.slice(0, 60))
      }
    }
    await sleep(1500)
    await finishPerformance(eventId, cand.id)
    await sleep(1500)

    // Verif scores en base pour ce candidat
    const { data: sc } = await sb.from('jury_scores').select('total_score, scores').eq('candidate_id', cand.id).eq('event_type', 'semifinal')
    check(`${NB_JURES} votes enregistres candidat ${ci + 1}`, sc.length === NB_JURES, `(${sc.length})`)
    const buzzCount = sc.filter((s) => s.scores?.buzzed === true).length
    check(`Buzz candidat ${ci + 1} : ${ci === 0 ? '1 attendu' : '0 attendu'}`, buzzCount === (ci === 0 ? 1 : 0), `(${buzzCount})`)
    // total_score coherent : score + (buzz?200:0)
    const sample = sc[0]
    if (sample) {
      const expected = (sample.scores?.score || 0) + (sample.scores?.buzzed ? 200 : 0)
      check(`total_score coherent candidat ${ci + 1}`, sample.total_score === expected, `(${sample.total_score} vs ${expected})`)
    }
  }

  await browser.close()

  // 6. Nettoyage du run (garde session+candidats+jures pour re-tests)
  await sb.from('lineup').delete().eq('live_event_id', eventId)
  await sb.from('live_events').delete().eq('id', eventId)
  await sb.from('jury_scores').delete().eq('session_id', SESSION_ID).eq('event_type', 'semifinal')
  log('Nettoyage run termine (live_event + scores test supprimes)')

  // 7. Bilan
  const ko = results.filter((r) => !r.ok)
  log('==================== BILAN ====================')
  log(`${results.length - ko.length}/${results.length} verifications OK`)
  if (ko.length) { log('ECHECS:'); ko.forEach((r) => log('  -', r.name, r.detail)) }
  else log('TOUT EST VERT ✅')
}

main().catch((e) => { console.error('ERREUR FATALE:', e); process.exit(1) })
