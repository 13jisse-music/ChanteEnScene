export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { days, sessionName } = body

  if (!days?.length) {
    return NextResponse.json({ error: 'Pas de données' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY

  // Build a compact summary for the AI (avoid sending huge payloads)
  const totalViews = days.reduce((s: number, d: { pageViews: number }) => s + d.pageViews, 0)
  const totalVisitors = days.reduce((s: number, d: { uniqueVisitors: number }) => s + d.uniqueVisitors, 0)
  const activeDays = days.filter((d: { pageViews: number }) => d.pageViews > 0)
  const peakDay = days.reduce((max: { pageViews: number; date: string }, d: { pageViews: number; date: string }) =>
    d.pageViews > max.pageViews ? d : max, days[0])

  // Collect events
  const events = days.flatMap((d: { date: string; events: { type: string; label: string; count?: number }[] }) =>
    d.events.map((ev: { type: string; label: string; count?: number }) => ({ date: d.date, ...ev }))
  )

  // Weekly averages
  const weeks: { week: string; views: number; visitors: number }[] = []
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7)
    const weekStart = slice[0].date
    weeks.push({
      week: weekStart,
      views: slice.reduce((s: number, d: { pageViews: number }) => s + d.pageViews, 0),
      visitors: slice.reduce((s: number, d: { uniqueVisitors: number }) => s + d.uniqueVisitors, 0),
    })
  }

  // Days around events (before/after traffic)
  const eventImpact = events.map((ev: { date: string; type: string; label: string }) => {
    const idx = days.findIndex((d: { date: string }) => d.date === ev.date)
    const before = idx > 0 ? days.slice(Math.max(0, idx - 2), idx).reduce((s: number, d: { pageViews: number }) => s + d.pageViews, 0) / Math.min(idx, 2) : 0
    const after = idx < days.length - 1 ? days.slice(idx, Math.min(days.length, idx + 3)).reduce((s: number, d: { pageViews: number }) => s + d.pageViews, 0) / Math.min(3, days.length - idx) : 0
    return { ...ev, avgBefore: Math.round(before), avgAfter: Math.round(after) }
  })

  // Format dates in French for the prompt
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const prompt = `Tu es un expert en marketing digital pour un concours de chant amateur en France (ChanteEnScène, chantenscene.fr).

CONTEXTE IMPORTANT — Ce qui est DÉJÀ automatisé :
- Publication automatique Facebook + Instagram tous les mercredis (cron job, social card avec photo candidat)
- Newsletter envoyée manuellement via l'admin (Resend, 86 abonnés)
- Le site est référencé sur Google mais pas encore de campagne SEO/SEA active
- Pas encore de Google Analytics (tracking interne uniquement via fingerprint)
- L'organisateur est seul (auto-entrepreneur), pas une grosse équipe marketing

DONNÉES DE TRAFIC :
- Session : ${sessionName}
- Du ${fmtDate(days[0].date)} au ${fmtDate(days[days.length - 1].date)} (${days.length} jours)
- **${totalViews.toLocaleString('fr-FR')}** pages vues totales
- **${totalVisitors.toLocaleString('fr-FR')}** visiteurs uniques
- ${activeDays.length} jours actifs sur ${days.length}
- Pic : **${peakDay.pageViews}** pages vues le ${fmtDate(peakDay.date)}

ÉVOLUTION PAR SEMAINE :
${weeks.map(w => `Semaine du ${fmtDate(w.week)} : ${w.views} vues, ${w.visitors} visiteurs`).join('\n')}

ACTIONS ET LEUR IMPACT :
${eventImpact.map((e: { date: string; type: string; label: string; avgBefore: number; avgAfter: number }) =>
  `Le ${fmtDate(e.date)} — ${e.type === 'newsletter' ? 'Newsletter' : e.type === 'facebook' ? 'Post Facebook' : e.type === 'instagram' ? 'Post Instagram' : e.type === 'inscription' ? 'Inscription' : 'Post social'} : "${e.label}" → trafic moyen avant : ${e.avgBefore}/j, après : ${e.avgAfter}/j`
).join('\n')}

RÈGLES DE FORMATAGE (OBLIGATOIRE) :
- Utilise TOUJOURS des dates en français lisibles (ex: "le mardi 3 mars", "il y a 8 jours", "la semaine dernière")
- JAMAIS de format ISO (2026-03-03)
- Mets les chiffres importants en **gras**
- Utilise des tirets - pour les listes (pas d'astérisques *)
- Chaque point de liste = une idée, une ligne
- Saute une ligne entre chaque paragraphe
- Sois concis : 2-3 phrases max par section (sauf recommandations)

STRUCTURE :
1. **Résumé**
2. **Corrélations actions/trafic**
3. **Tendances**
4. **Points d'attention**
5. **Recommandations concrètes** — 5-7 actions NOUVELLES (ne pas répéter ce qui est déjà automatisé). Précise le timing (cette semaine, dans 15 jours, etc.)
6. **Projection**

Sois direct, concret, adapté à un organisateur solo. Pas de blabla marketing générique.`

  // Cascade: Gemini (free) → Groq (free)
  let text: string | null = null
  let provider = ''

  // 1. Try Gemini Flash
  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
          }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null
        if (text) provider = 'Gemini Flash'
      } else {
        console.warn('Gemini error:', res.status, await res.text())
      }
    } catch (err) {
      console.warn('Gemini failed:', err)
    }
  }

  // 2. Fallback: Groq (Llama 3.3 70B)
  if (!text && process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        text = data?.choices?.[0]?.message?.content || null
        if (text) provider = 'Groq Llama'
      } else {
        console.warn('Groq error:', res.status, await res.text())
      }
    } catch (err) {
      console.warn('Groq failed:', err)
    }
  }

  // 3. Fallback: OpenAI GPT-4o-mini (~0.01$)
  if (!text && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        text = data?.choices?.[0]?.message?.content || null
        if (text) provider = 'OpenAI GPT-4o-mini'
      } else {
        console.warn('OpenAI error:', res.status, await res.text())
      }
    } catch (err) {
      console.warn('OpenAI failed:', err)
    }
  }

  if (!text) {
    return NextResponse.json({ error: 'Aucune IA disponible (Gemini, Groq et OpenAI en erreur)' }, { status: 502 })
  }

  return NextResponse.json({ analysis: text, provider })
}
