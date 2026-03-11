'use client'

import { useState } from 'react'

interface EventMarker {
  type: string
  label: string
  count?: number
}

interface DayBucket {
  date: string
  pageViews: number
  uniqueVisitors: number
  events: EventMarker[]
}

interface StaticInsight {
  icon: string
  title: string
  text: string
  color: string
}

function computeStaticInsights(days: DayBucket[]): StaticInsight[] {
  if (!days.length) return []
  const insights: StaticInsight[] = []

  // Peak day
  const peak = days.reduce((max, d) => d.pageViews > max.pageViews ? d : max, days[0])
  const peakDate = new Date(peak.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const peakEvents = peak.events.map(e => e.type)
  if (peakEvents.length > 0) {
    insights.push({
      icon: '🔥',
      title: 'Pic de trafic',
      text: `${peak.pageViews} pages vues le ${peakDate}. Actions ce jour-là : ${peakEvents.join(', ')}. ${peakEvents.includes('newsletter') ? 'La newsletter a clairement boosté le trafic.' : ''}`,
      color: '#e91e8c',
    })
  } else {
    insights.push({
      icon: '🔥',
      title: 'Pic de trafic',
      text: `${peak.pageViews} pages vues le ${peakDate}, sans action trackée ce jour-là. Peut-être du trafic organique ou un partage non tracké.`,
      color: '#e91e8c',
    })
  }

  // Action → traffic correlation
  const eventDays = days.filter(d => d.events.length > 0)
  const nonEventDays = days.filter(d => d.events.length === 0 && d.pageViews > 0)
  if (eventDays.length > 0 && nonEventDays.length > 0) {
    const avgWithEvent = Math.round(eventDays.reduce((s, d) => s + d.pageViews, 0) / eventDays.length)
    const avgWithout = Math.round(nonEventDays.reduce((s, d) => s + d.pageViews, 0) / nonEventDays.length)
    const boost = avgWithEvent > 0 && avgWithout > 0 ? Math.round((avgWithEvent / avgWithout - 1) * 100) : 0
    insights.push({
      icon: '📊',
      title: 'Impact des actions',
      text: `Jours avec action : ~${avgWithEvent} pages/jour. Sans action : ~${avgWithout} pages/jour. ${boost > 0 ? `Les actions génèrent +${boost}% de trafic en moyenne.` : 'Peu de différence mesurable.'}`,
      color: '#6366f1',
    })
  }

  // Best action type
  const typeStats = new Map<string, { total: number; count: number }>()
  for (const d of days) {
    for (const ev of d.events) {
      if (!typeStats.has(ev.type)) typeStats.set(ev.type, { total: 0, count: 0 })
      const s = typeStats.get(ev.type)!
      s.total += d.pageViews
      s.count++
    }
  }
  if (typeStats.size > 0) {
    let bestType = ''
    let bestAvg = 0
    for (const [type, { total, count }] of typeStats) {
      const avg = total / count
      if (avg > bestAvg) { bestAvg = avg; bestType = type }
    }
    const typeLabels: Record<string, string> = {
      newsletter: 'Newsletters', facebook: 'Posts Facebook', instagram: 'Posts Instagram',
      social: 'Posts sociaux', inscription: 'Inscriptions',
    }
    insights.push({
      icon: '🏆',
      title: 'Meilleur levier',
      text: `${typeLabels[bestType] || bestType} → ~${Math.round(bestAvg)} pages vues/jour en moyenne. ${bestType === 'newsletter' ? 'La newsletter reste le canal le plus efficace.' : `Les ${(typeLabels[bestType] || bestType).toLowerCase()} génèrent le plus de trafic.`}`,
      color: '#f59e0b',
    })
  }

  // Trend (last 7 days vs previous 7)
  if (days.length >= 14) {
    const last7 = days.slice(-7)
    const prev7 = days.slice(-14, -7)
    const avgLast = last7.reduce((s, d) => s + d.pageViews, 0) / 7
    const avgPrev = prev7.reduce((s, d) => s + d.pageViews, 0) / 7
    const trend = avgPrev > 0 ? Math.round((avgLast / avgPrev - 1) * 100) : 0
    insights.push({
      icon: trend > 0 ? '📈' : trend < -20 ? '📉' : '➡️',
      title: 'Tendance récente',
      text: trend > 10
        ? `+${trend}% cette semaine vs la précédente. Le trafic est en hausse !`
        : trend < -20
          ? `${trend}% cette semaine. Baisse notable — une action est recommandée.`
          : `Trafic stable (${trend > 0 ? '+' : ''}${trend}%). Continuez la régularité.`,
      color: trend > 0 ? '#10b981' : trend < -20 ? '#ef4444' : '#8b5cf6',
    })
  }

  // Days without action alert
  const today = days[days.length - 1]?.date
  if (today) {
    let daysSinceAction = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].events.length > 0) break
      daysSinceAction++
    }
    if (daysSinceAction >= 3) {
      insights.push({
        icon: '⚠️',
        title: 'Inactivité',
        text: `${daysSinceAction} jour${daysSinceAction > 1 ? 's' : ''} sans aucune action (post, newsletter, inscription). Le trafic baisse naturellement sans stimulus.`,
        color: '#ef4444',
      })
    }
  }

  // Conversion rate (inscriptions vs visitors)
  const totalInscriptions = days.reduce((s, d) => s + d.events.filter(e => e.type === 'inscription').reduce((ss, e) => ss + (e.count || 1), 0), 0)
  const totalVisitors = days.reduce((s, d) => s + d.uniqueVisitors, 0)
  if (totalInscriptions > 0 && totalVisitors > 0) {
    const rate = (totalInscriptions / totalVisitors * 100).toFixed(1)
    insights.push({
      icon: '🎯',
      title: 'Taux de conversion',
      text: `${totalInscriptions} inscription${totalInscriptions > 1 ? 's' : ''} pour ${totalVisitors} visiteurs uniques = ${rate}% de conversion. ${parseFloat(rate) > 5 ? 'Excellent !' : parseFloat(rate) > 2 ? 'Correct.' : 'Peut être amélioré avec un meilleur CTA.'}`,
      color: '#10b981',
    })
  }

  return insights
}

export default function AnalyticsInsights({ days, sessionName }: { days: DayBucket[]; sessionName: string }) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const insights = computeStaticInsights(days)

  async function handleAiAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, sessionName }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setAiAnalysis(data.analysis)
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (!days.length) return null

  return (
    <div className="space-y-4 mt-6">
      {/* Static insights */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2545] flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
            Insights automatiques
          </h2>
        </div>
        <div className="p-4 grid gap-3 sm:grid-cols-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-xl border border-[#2a2545] bg-[#0d0b1a]/50"
            >
              <span className="text-xl shrink-0">{ins.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: ins.color }}>{ins.title}</p>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{ins.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI analysis button */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2545] flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
            Analyse IA detaillee
          </h2>
          <button
            onClick={handleAiAnalysis}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl text-xs font-medium border transition-colors bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20 disabled:opacity-50"
          >
            {loading ? 'Analyse en cours...' : aiAnalysis ? 'Relancer l\'analyse' : '✨ Analyser avec Gemini'}
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 text-xs text-red-400 bg-red-500/5">
            {error}
          </div>
        )}

        {loading && (
          <div className="p-6 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#f59e0b]/30 border-t-[#f59e0b] rounded-full animate-spin" />
            <span className="text-xs text-white/40">Gemini analyse vos donnees...</span>
          </div>
        )}

        {aiAnalysis && !loading && (
          <div className="p-4">
            <div
              className="prose prose-invert prose-sm max-w-none text-white/70 [&_strong]:text-white [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h2]:text-[#f59e0b] [&_h3]:text-[#f59e0b] [&_li]:marker:text-[#f59e0b] [&_ul]:space-y-1"
              dangerouslySetInnerHTML={{
                __html: aiAnalysis
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                  .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                  .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                  .replace(/^- (.*$)/gm, '<li>$1</li>')
                  .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
                  .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/\n/g, '<br/>'),
              }}
            />
          </div>
        )}

        {!aiAnalysis && !loading && !error && (
          <div className="p-4 text-center text-xs text-white/30">
            Cliquez sur le bouton pour generer une analyse detaillee avec recommandations personnalisees.
          </div>
        )}
      </div>
    </div>
  )
}
