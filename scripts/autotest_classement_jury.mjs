// Autotest E2E de la PHASE CLASSEMENT du jury de demi-finale (briques A/B/C/D).
// Le vote slider+buzz etant deja valide (12/12, autotest_regie_jury.mjs), ce script SEED directement
// les scores semifinal en base, ouvre la phase classement (show_priorities), pilote N jures dans Chrome
// sur le vrai composant PrioritesClient en mode semifinal, puis verifie :
//  - persistance des priorites (round='final', session_id, ranks)
//  - pre-remplissage par note decroissante (le juré peut valider sans rien toucher)
//  - boutons retirer/ajouter (un juré modifie son top)
//  - agregation points de preference -> top N par categorie (brique D)
// Usage : BASE=http://localhost:3000 node scripts/autotest_classement_jury.mjs
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.BASE || 'http://localhost:3000'
const SESSION_ID = 'ddddddd1-0000-4000-8000-000000000001'
const ALL_TOKENS = ['TESTJURY1', 'TESTJURY2', 'TESTJURY3', 'TESTJURY4', 'TESTJURY5']
const NB_JURES = Number(process.env.NB_JURES || 3)
const TOKENS = ALL_TOKENS.slice(0, NB_JURES)

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); log(ok ? 'OK ' : 'KO ', name, detail) }

const CATS = ['Ado', 'Adulte', 'Enfant']
const candNum = (c) => Number((c.last_name.match(/(\d+)$/) || [])[1] || 0) // 'Ado 3' -> 3
const score = (n) => (5 - n) * 20 // n1=80, n2=60, n3=40, n4=20 (identique pour tous les jures)

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes(t))
    if (b) b.click()
  }, text)
}

async function driveJuror(page, token, tweak) {
  await page.goto(`${BASE}/jury/${token}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Commencer/.test(b.textContent || '')), { timeout: 30000 })
  await sleep(400)
  await clickByText(page, 'Commencer')
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Valider mon classement|Complétez les/.test(b.textContent || '')), { timeout: 30000 })
  await sleep(700)

  // Pre-remplissage : sans rien toucher, le bouton de validation doit deja etre actif (top N rempli par les notes)
  const prefilled = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Valider mon classement') && !b.disabled)
  )

  let tweakOk = null
  if (tweak) {
    // Onglet Ado actif par defaut : retirer n2, ajouter n3 -> classement [n1, n3]
    tweakOk = await page.evaluate((removeId, addId) => {
      const btnOf = (id) => document.querySelector(`[data-id="${id}"] [data-action]`)
      const r = btnOf(removeId); if (!r) return 'remove introuvable'; r.click(); return 'ok'
    }, tweak.removeId, tweak.addId)
    await sleep(400)
    if (tweakOk === 'ok') {
      tweakOk = await page.evaluate((addId) => {
        const b = document.querySelector(`[data-id="${addId}"] [data-action]`)
        if (!b) return 'add introuvable'; if (b.disabled) return 'add desactive'; b.click(); return 'ok'
      }, tweak.addId)
    }
    await sleep(400)
  }

  await clickByText(page, 'Valider mon classement')
  await page.waitForFunction(() => /Classement enregistré/.test(document.body.innerText), { timeout: 30000 })
  return { prefilled, tweakOk }
}

async function main() {
  // 1. Candidats de test groupes par categorie
  const { data: cands } = await sb.from('candidates')
    .select('id, last_name, category').eq('session_id', SESSION_ID).eq('status', 'semifinalist')
  check('12 candidats de test presents', cands.length === 12, `(${cands.length})`)
  const byCat = {}
  for (const cat of CATS) byCat[cat] = cands.filter(c => c.category === cat).sort((a, b) => candNum(a) - candNum(b))

  // 2. Jures de test
  const { data: jurors } = await sb.from('jurors')
    .select('id, qr_token').eq('session_id', SESSION_ID).eq('role', 'semifinal').eq('is_active', true)
  const usedJurors = TOKENS.map(t => jurors.find(j => j.qr_token === t)).filter(Boolean)
  check(`${NB_JURES} jures de test trouves`, usedJurors.length === NB_JURES, `(${usedJurors.length})`)

  // 3. Nettoyage prealable du run + ouverture de la phase classement
  await sb.from('jury_priorities').delete().eq('session_id', SESSION_ID).eq('round', 'final')
  await sb.from('jury_scores').delete().eq('session_id', SESSION_ID).eq('event_type', 'semifinal')
  await sb.from('jurors').update({ show_priorities: false, show_results: false }).eq('session_id', SESSION_ID)

  // 4. SEED des scores semifinal (le vote est deja valide ailleurs) : note decroissante n1>n2>n3>n4
  const rows = []
  for (const j of usedJurors) for (const cat of CATS) for (const c of byCat[cat]) {
    const s = score(candNum(c))
    rows.push({ session_id: SESSION_ID, juror_id: j.id, candidate_id: c.id, event_type: 'semifinal', total_score: s, scores: { score: s, buzzed: false } })
  }
  const { error: seedErr } = await sb.from('jury_scores').insert(rows)
  check('scores semifinal seedes', !seedErr, seedErr ? seedErr.message : `(${rows.length} lignes)`)

  // Ouvre la phase classement pour les jures utilises (= setSemifinalJuryPhase 'priorities')
  await sb.from('jurors').update({ show_priorities: true, show_results: false })
    .in('id', usedJurors.map(j => j.id))

  // 5. Chrome + pilotage des jures
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 90000, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const ctx = browser.defaultBrowserContext()
  await ctx.overridePermissions(BASE, [])

  // juror0 modifie son top Ado : retire n2, ajoute n3 -> [n1, n3] (test boutons retirer/ajouter)
  const adoN = byCat['Ado']
  const tweakForFirst = { removeId: adoN[1].id, addId: adoN[2].id } // n2, n3

  for (let i = 0; i < usedJurors.length; i++) {
    // 2 tentatives : la 1ere requete sur le serveur peut etre froide (lente). Un echec rechauffe la route.
    let r = null, lastErr = null
    for (let attempt = 1; attempt <= 2 && !r; attempt++) {
      const p = await browser.newPage()
      p.on('dialog', (d) => d.dismiss().catch(() => {}))
      await p.evaluateOnNewDocument(() => {
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible' })
        Object.defineProperty(document, 'hidden', { get: () => false })
      })
      try {
        r = await driveJuror(p, TOKENS[i], i === 0 ? tweakForFirst : null)
      } catch (e) {
        lastErr = e
        // En cas de retry, on repart d'un classement propre pour ce jure
        await sb.from('jury_priorities').delete().eq('juror_id', usedJurors[i].id).eq('round', 'final')
      }
      await p.close()
    }
    if (r) {
      check(`Juré ${i + 1} : top pre-rempli (validation active d'emblee)`, r.prefilled === true, `(prefilled=${r.prefilled})`)
      if (i === 0) check('Juré 1 : boutons retirer + ajouter (Ado)', r.tweakOk === 'ok', `(${r.tweakOk})`)
      check(`Juré ${i + 1} : classement validé (ecran confirmation)`, true)
    } else {
      check(`Juré ${i + 1} : parcours classement`, false, (lastErr?.message || '').slice(0, 80))
    }
  }
  await browser.close()

  // 6. Verif persistance (brique C : round='final', session_id, ranks)
  const { data: prios } = await sb.from('jury_priorities')
    .select('juror_id, candidate_id, category, rank, round, session_id').eq('session_id', SESSION_ID).eq('round', 'final')
  check('priorites round=final enregistrees', prios.length === NB_JURES * CATS.length * 2, `(${prios.length} pour ${NB_JURES} jures x 3 cats x 2)`)
  check('toutes les priorites ont session_id', prios.every(p => p.session_id === SESSION_ID))
  check('tous les rangs sont 1..2', prios.every(p => p.rank >= 1 && p.rank <= 2))

  // juror0 Ado doit etre [n1, n3] (tweak), les autres [n1, n2] (pre-rempli)
  const j0 = usedJurors[0].id
  const j0ado = prios.filter(p => p.juror_id === j0 && p.category === 'Ado').sort((a, b) => a.rank - b.rank).map(p => p.candidate_id)
  check('Juré 1 Ado = [n1, n3] (modif manuelle persistee)', JSON.stringify(j0ado) === JSON.stringify([adoN[0].id, adoN[2].id]), `(${j0ado.length})`)
  if (NB_JURES > 1) {
    const j1 = usedJurors[1].id
    const j1ado = prios.filter(p => p.juror_id === j1 && p.category === 'Ado').sort((a, b) => a.rank - b.rank).map(p => p.candidate_id)
    check('Juré 2 Ado = [n1, n2] (pre-rempli)', JSON.stringify(j1ado) === JSON.stringify([adoN[0].id, adoN[1].id]), `(${j1ado.length})`)
  }

  // 7. Agregation brique D (replique computeFinalRanking : points = topN - rank + 1, topN=2)
  const topN = 2
  let aggOk = true
  const declared = []
  for (const cat of CATS) {
    const pts = {}
    for (const p of prios.filter(p => p.category === cat)) pts[p.candidate_id] = (pts[p.candidate_id] || 0) + (topN - p.rank + 1)
    const ranked = byCat[cat].map(c => ({ id: c.id, n: candNum(c), points: pts[c.id] || 0 }))
      .sort((a, b) => b.points - a.points)
    const top2 = ranked.slice(0, 2).map(r => r.n)
    if (JSON.stringify(top2) !== JSON.stringify([1, 2])) aggOk = false
    ranked.slice(0, 2).forEach(r => declared.push(r.id))
    log(`  ${cat}: ` + ranked.map(r => `n${r.n}=${r.points}pts`).join(' '))
  }
  check('agregation top 2/cat = [n1, n2] (points de preference)', aggOk)
  check('6 finalistes seraient declares (2 x 3 cats)', declared.length === 6, `(${declared.length})`)

  // 8. Nettoyage du run (garde la session test pour re-tests ; suppression finale via SQL)
  await sb.from('jury_priorities').delete().eq('session_id', SESSION_ID).eq('round', 'final')
  await sb.from('jury_scores').delete().eq('session_id', SESSION_ID).eq('event_type', 'semifinal')
  await sb.from('jurors').update({ show_priorities: false, show_results: false }).eq('session_id', SESSION_ID)
  log('Nettoyage run termine')

  const ko = results.filter(r => !r.ok)
  log('==================== BILAN ====================')
  log(`${results.length - ko.length}/${results.length} verifications OK`)
  if (ko.length) { log('ECHECS:'); ko.forEach(r => log('  -', r.name, r.detail)) } else log('TOUT EST VERT ✅')
  process.exit(ko.length ? 1 : 0)
}

main().catch((e) => { console.error('ERREUR FATALE:', e); process.exit(1) })
