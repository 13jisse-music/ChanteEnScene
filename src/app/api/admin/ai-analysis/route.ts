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

  const prompt = `Tu es un expert en marketing digital et analytics pour un concours de chant amateur en France (ChanteEnScène, chantenscene.fr). Analyse ces données de trafic et donne des recommandations concrètes.

DONNÉES :
- Session : ${sessionName}
- Période : ${days[0].date} → ${days[days.length - 1].date} (${days.length} jours)
- Pages vues totales : ${totalViews}
- Visiteurs uniques totaux : ${totalVisitors}
- Jours avec trafic : ${activeDays.length}/${days.length}
- Pic : ${peakDay.pageViews} pages vues le ${peakDay.date}

ÉVOLUTION HEBDOMADAIRE :
${weeks.map(w => `${w.week} : ${w.views} vues, ${w.visitors} visiteurs`).join('\n')}

ACTIONS ET IMPACT SUR LE TRAFIC :
${eventImpact.map((e: { date: string; type: string; label: string; avgBefore: number; avgAfter: number }) =>
  `${e.date} [${e.type}] "${e.label}" — moy. avant: ${e.avgBefore}/j, moy. après: ${e.avgAfter}/j`
).join('\n')}

Réponds en français avec cette structure :
1. **Résumé** (3-4 lignes)
2. **Corrélations actions/trafic** — quelles actions ont généré le plus de trafic ?
3. **Tendances** — le trafic monte, descend, stagne ?
4. **Points d'attention** — jours sans activité, baisses inexpliquées
5. **Recommandations concrètes** (5-7 actions prioritaires avec timing)
6. **Projection** — si on applique les recommandations, quel trafic attendre ?

Sois direct et concret, pas de blabla marketing générique.`

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
