'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from 'recharts'

interface EventMarker {
  type: 'newsletter' | 'facebook' | 'instagram' | 'social' | 'inscription'
  label: string
  count?: number
}

interface DayBucket {
  date: string
  pageViews: number
  uniqueVisitors: number
  events: EventMarker[]
}

const PERIODS = [
  { key: '7d', label: '7j' },
  { key: '30d', label: '30j' },
  { key: '90d', label: '3 mois' },
  { key: 'all', label: 'Tout' },
] as const

const EVENT_COLORS: Record<string, string> = {
  newsletter: '#f59e0b',
  facebook: '#3b82f6',
  instagram: '#ec4899',
  social: '#8b5cf6',
  inscription: '#10b981',
}

const EVENT_ICONS: Record<string, string> = {
  newsletter: '📧',
  facebook: '📘',
  instagram: '📸',
  social: '📣',
  inscription: '🎤',
}

const EVENT_LABELS: Record<string, string> = {
  newsletter: 'Newsletter',
  facebook: 'Post Facebook',
  instagram: 'Post Instagram',
  social: 'Post social',
  inscription: 'Inscription',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const dayData = payload[0]?.payload as DayBucket | undefined
  if (!dayData) return null

  const dateStr = new Date(dayData.date).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  })

  return (
    <div className="bg-[#1a1232] border border-[#e91e8c]/30 rounded-xl p-3 text-xs max-w-[280px]">
      <p className="text-white/70 font-medium mb-2">{dateStr}</p>
      <div className="flex gap-4 mb-2">
        <span className="text-[#6366f1]">{dayData.pageViews} pages vues</span>
        <span className="text-[#8b5cf6]">{dayData.uniqueVisitors} visiteurs</span>
      </div>
      {dayData.events.length > 0 && (
        <div className="border-t border-white/10 pt-2 space-y-1">
          {dayData.events.map((ev, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span>{EVENT_ICONS[ev.type]}</span>
              <span style={{ color: EVENT_COLORS[ev.type] }} className="leading-tight">
                {ev.label}
                {ev.count ? ` (${ev.count})` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsChart({ days }: { days: DayBucket[] }) {
  const [period, setPeriod] = useState<string>('all')
  const [showEvents, setShowEvents] = useState(true)

  const filteredDays = useMemo(() => {
    if (period === 'all') return days
    const now = new Date()
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const cutoff = new Date(now.getTime() - daysBack * 86400000)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return days.filter(d => d.date >= cutoffStr)
  }, [days, period])

  // Prepare chart data with event marker column
  const chartData = useMemo(() => {
    return filteredDays.map(d => {
      const dateObj = new Date(d.date)
      const label = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      return {
        ...d,
        label,
        hasEvent: d.events.length > 0 ? d.pageViews || 5 : 0,
      }
    })
  }, [filteredDays])

  // Collect all event days for reference lines
  const eventDays = useMemo(() => {
    if (!showEvents) return []
    return filteredDays
      .filter(d => d.events.length > 0)
      .map(d => ({
        date: d.date,
        label: new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        events: d.events,
      }))
  }, [filteredDays, showEvents])

  // Collect all unique event types in the data
  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    for (const d of days) {
      for (const ev of d.events) types.add(ev.type)
    }
    return Array.from(types)
  }, [days])

  // All events flat list for timeline below chart
  const allEvents = useMemo(() => {
    return filteredDays
      .flatMap(d => d.events.map(ev => ({ ...ev, date: d.date })))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredDays])

  if (!days.length) {
    return <p className="text-white/40 text-sm">Aucune donnee de trafic.</p>
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-[#161228] border border-[#2a2545] rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.key
                  ? 'bg-[#e91e8c]/20 text-[#e91e8c]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowEvents(!showEvents)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            showEvents
              ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]'
              : 'bg-transparent border-[#2a2545] text-white/40'
          }`}
        >
          {showEvents ? '🔔 Actions visibles' : '🔕 Actions masquees'}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
            Trafic {period === 'all' ? 'depuis l\'ouverture' : `— ${PERIODS.find(p => p.key === period)?.label}`}
          </h2>
        </div>
        <div className="p-4" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barGap={1}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={chartData.length > 60 ? Math.floor(chartData.length / 15) : chartData.length > 30 ? 2 : 0}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value: string) => {
                  if (value === 'pageViews') return 'Pages vues'
                  if (value === 'uniqueVisitors') return 'Visiteurs uniques'
                  return value
                }}
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
              />
              <Bar dataKey="pageViews" fill="#6366f1" radius={[3, 3, 0, 0]} opacity={0.8} />
              <Line
                dataKey="uniqueVisitors"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                type="monotone"
              />
              {/* Event reference lines */}
              {showEvents && eventDays.map((ed, i) => (
                <ReferenceLine
                  key={i}
                  x={ed.label}
                  stroke={EVENT_COLORS[ed.events[0]?.type] || '#f59e0b'}
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event legend */}
      {showEvents && eventTypes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {eventTypes.map(type => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: EVENT_COLORS[type] }} />
              <span>{EVENT_ICONS[type]}</span>
              <span className="text-white/50">{EVENT_LABELS[type]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Events timeline */}
      {showEvents && allEvents.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
              Historique des actions ({allEvents.length})
            </h2>
          </div>
          <div className="divide-y divide-[#2a2545] max-h-[400px] overflow-y-auto">
            {allEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                <span className="text-base">{EVENT_ICONS[ev.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 truncate">{ev.label}</p>
                  <p className="text-[10px] text-white/30">
                    {new Date(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                    {ev.count ? ` — ${ev.count} envoi${ev.count > 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${EVENT_COLORS[ev.type]}20`, color: EVENT_COLORS[ev.type] }}
                >
                  {EVENT_LABELS[ev.type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
