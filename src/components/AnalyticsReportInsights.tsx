'use client'

import { useState } from 'react'
import type { AnalyticsReport } from '@/lib/analytics-report'

// Icones par type d'insight
function getIcon(text: string): string {
  if (text.includes('rebond') && text.includes('eleve')) return 'warning'
  if (text.includes('rebond') && text.includes('Excellent')) return 'success'
  if (text.includes('Performance') || text.includes('LCP')) return 'perf'
  if (text.includes('erreur')) return 'error'
  if (text.includes('mobile')) return 'mobile'
  if (text.includes('Outil') || text.includes('Page la plus')) return 'tool'
  if (text.includes('sortie')) return 'exit'
  if (text.includes('scroll') || text.includes('engagement')) return 'scroll'
  if (text.includes('retention') || text.includes('retour')) return 'retention'
  if (text.includes('inscription') || text.includes('anonyme')) return 'conversion'
  if (text.includes('courte')) return 'time'
  return 'info'
}

const ICON_MAP: Record<string, { emoji: string; color: string }> = {
  warning: { emoji: '!', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  success: { emoji: '+', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  perf: { emoji: 'P', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  error: { emoji: 'E', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  mobile: { emoji: 'M', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  tool: { emoji: 'T', color: 'text-[#e91e8c] bg-[#e91e8c]/10 border-[#e91e8c]/20' },
  exit: { emoji: 'X', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  scroll: { emoji: 'S', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  retention: { emoji: 'R', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  conversion: { emoji: 'C', color: 'text-[#e91e8c] bg-[#e91e8c]/10 border-[#e91e8c]/20' },
  time: { emoji: 'D', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  info: { emoji: 'i', color: 'text-gray-300 bg-white/5 border-white/10' },
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`
}

export default function AnalyticsReportInsights({ report }: { report: AnalyticsReport }) {
  const [expanded, setExpanded] = useState(false)
  const { summary, content, insights } = report

  // Resume en une phrase
  const summaryLine = summary.totalPageViews === 0
    ? 'Pas encore de donnees. Le tracker collecte les visites automatiquement.'
    : `${summary.totalPageViews} pages vues par ${summary.uniqueVisitors} visiteur${summary.uniqueVisitors > 1 ? 's' : ''} en ${summary.totalSessions} session${summary.totalSessions > 1 ? 's' : ''}. Duree moyenne : ${formatDuration(summary.avgSessionDuration)}. Rebond : ${summary.bounceRate}%.`

  const topTool = content.topTools[0]

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2545]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">
            Diagnostic ({report.period.days} derniers jours)
          </h2>
          <span className="text-[10px] text-gray-500">
            {new Date(report.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-300 leading-relaxed">{summaryLine}</p>
        {topTool && (
          <p className="mt-1 text-xs text-gray-400">
            Page preferee : <span className="text-[#e91e8c] font-medium">{topTool.name}</span> ({topTool.views} vues)
          </p>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors mb-3"
          >
            <span className="text-[#e91e8c] font-bold">{insights.length}</span>
            <span>recommandation{insights.length > 1 ? 's' : ''}</span>
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="space-y-2">
              {insights.map((text, i) => {
                const iconType = getIcon(text)
                const { emoji, color } = ICON_MAP[iconType]
                return (
                  <div key={i} className={`flex gap-3 rounded-xl border p-3 ${color}`}>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                      {emoji}
                    </span>
                    <p className="text-xs text-gray-200 leading-relaxed">{text}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick stats visuelles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
        <MiniStat label="Scroll moyen" value={`${summary.avgScrollDepth}%`} good={summary.avgScrollDepth > 50} />
        <MiniStat label="Pages/session" value={String(summary.avgPagesPerSession)} good={summary.avgPagesPerSession > 2} />
        <MiniStat label="Connectes" value={`${Math.round((summary.authVsAnon.authenticated / Math.max(summary.totalPageViews, 1)) * 100)}%`} />
        <MiniStat label="Retour" value={`${summary.returningVisitorRate}%`} good={summary.returningVisitorRate > 30} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-[#161228] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${good === true ? 'text-emerald-400' : good === false ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
