export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import SemifinalPrep from '@/components/SemifinalPrep'
import { SESSION_STATUSES, STATUS_CONFIG, getStatusIndex, type SessionStatus } from '@/lib/phases'
import { Fragment } from 'react'

async function getStats() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, status, city, year, config')
    .order('year', { ascending: false })

  if (!sessions || sessions.length === 0) return { sessions: [], stats: {}, semifinalists: [], recentInstalls: [], semifinalEvent: null, config: { semifinal_date: null, semifinal_time: null, semifinal_location: null, selection_notifications_sent_at: null } }

  const activeSession = sessions[0]

  const { count: totalCandidates } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)

  const { count: pending } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)
    .eq('status', 'pending')

  const { count: approved } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)
    .eq('status', 'approved')

  const { count: totalVotes } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)

  const { data: recentCandidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, status, created_at, photo_url')
    .eq('session_id', activeSession.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Semifinalists with details
  const { data: semifinalists } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, category, status, photo_url, mp3_url, song_title, song_artist, slug')
    .eq('session_id', activeSession.id)
    .in('status', ['semifinalist', 'finalist', 'winner'])
    .order('category')
    .order('last_name')

  // Check if semifinal event exists
  const { data: semifinalEvent } = await supabase
    .from('live_events')
    .select('id, status')
    .eq('session_id', activeSession.id)
    .eq('event_type', 'semifinal')
    .limit(1)
    .maybeSingle()

  const config = (activeSession.config || {}) as Record<string, unknown>

  // PWA installs for active session
  const { count: pwaInstalls } = await supabase
    .from('pwa_installs')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)

  // Push notification subscriptions (public only) for active session
  const { count: pushSubscriptions } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)
    .eq('role', 'public')

  // Recent PWA installs
  const { data: recentInstalls } = await supabase
    .from('pwa_installs')
    .select('id, platform, install_source, city, region, created_at')
    .eq('session_id', activeSession.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // All-time totals
  const { count: totalPwaInstalls } = await supabase
    .from('pwa_installs')
    .select('*', { count: 'exact', head: true })

  const { count: totalPushSubscriptions } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'public')

  return {
    sessions,
    activeSession,
    stats: {
      totalCandidates: totalCandidates || 0,
      pending: pending || 0,
      approved: approved || 0,
      totalVotes: totalVotes || 0,
      pwaInstalls: pwaInstalls || 0,
      pushSubscriptions: Math.max((pushSubscriptions || 0) - 7, 0),
      totalPwaInstalls: totalPwaInstalls || 0,
      totalPushSubscriptions: Math.max((totalPushSubscriptions || 0) - 7, 0),
    },
    recentCandidates: recentCandidates || [],
    recentInstalls: recentInstalls || [],
    semifinalists: semifinalists || [],
    semifinalEvent: semifinalEvent || null,
    config: {
      semifinal_date: (config.semifinal_date as string) || null,
      semifinal_time: (config.semifinal_time as string) || null,
      semifinal_location: (config.semifinal_location as string) || null,
      selection_notifications_sent_at: (config.selection_notifications_sent_at as string) || null,
    },
  }
}

function StatCard({
  label,
  value,
  color,
  icon,
  subtitle,
}: {
  label: string
  value: number
  color: string
  icon: string
  subtitle?: string
}) {
  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: `${color}15`, color }}
        >
          {label}
        </span>
      </div>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-3xl" style={{ color }}>
        {value}
      </p>
      {subtitle && (
        <p className="text-white/30 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#f59e0b' },
  approved: { label: 'Approuvé', color: '#7ec850' },
  rejected: { label: 'Refusé', color: '#ef4444' },
  semifinalist: { label: 'Demi-finaliste', color: '#3b82f6' },
  finalist: { label: 'Finaliste', color: '#8b5cf6' },
  winner: { label: 'Gagnant', color: '#f59e0b' },
}

export default async function AdminDashboard() {
  const { activeSession, stats, recentCandidates = [], recentInstalls = [], semifinalists = [], semifinalEvent, config } = await getStats()

  const semifinalistCount = semifinalists.length
  const mp3Count = semifinalists.filter((c) => c.mp3_url).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white">
          Dashboard
        </h1>
        {activeSession && (
          <p className="text-white/40 text-sm mt-1">
            {activeSession.name} —{' '}
            <span style={{ color: STATUS_CONFIG[activeSession.status as SessionStatus]?.color }}>
              {STATUS_CONFIG[activeSession.status as SessionStatus]?.label || activeSession.status}
            </span>
          </p>
        )}
      </div>

      {/* Phase stepper */}
      {activeSession && (
        <div className="flex items-center gap-0 mb-8 px-4 py-3 bg-[#161228] border border-[#2a2545] rounded-2xl overflow-x-auto">
          {SESSION_STATUSES.map((s, idx) => {
            const cfg = STATUS_CONFIG[s]
            const currentIdx = getStatusIndex(activeSession.status)
            const isCompleted = idx < currentIdx
            const isCurrent = idx === currentIdx

            return (
              <Fragment key={s}>
                <div className="flex flex-col items-center gap-1 shrink-0" title={cfg.description}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                      isCompleted
                        ? 'bg-[#7ec850] text-white'
                        : isCurrent
                          ? 'text-white ring-2 ring-white/20'
                          : 'bg-white/5 text-white/15'
                    }`}
                    style={isCurrent ? { background: cfg.color } : undefined}
                  >
                    {isCompleted ? '✓' : cfg.icon}
                  </div>
                  <span className={`text-[9px] max-w-[60px] text-center leading-tight ${
                    isCurrent ? 'text-white font-bold' : 'text-white/20'
                  }`}>
                    {cfg.label}
                  </span>
                </div>
                {idx < SESSION_STATUSES.length - 1 && (
                  <div className={`flex-1 min-w-3 h-0.5 mx-0.5 ${idx < currentIdx ? 'bg-[#7ec850]' : 'bg-white/10'}`} />
                )}
              </Fragment>
            )
          })}
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10`}>
        <StatCard icon="🎤" label="Candidats" value={stats.totalCandidates ?? 0} color="#e91e8c" />
        <StatCard icon="⏳" label="En attente" value={stats.pending ?? 0} color="#f59e0b" />
        <StatCard icon="✅" label="Approuvés" value={stats.approved ?? 0} color="#7ec850" />
        <StatCard icon="❤️" label="Votes" value={stats.totalVotes ?? 0} color="#3b82f6" />
        {semifinalistCount > 0 && (
          <StatCard icon="🌟" label="Demi-finalistes" value={semifinalistCount} color="#8b5cf6" />
        )}
        <StatCard
          icon="📲"
          label="Installations PWA"
          value={stats.pwaInstalls ?? 0}
          color="#10b981"
          subtitle={(stats.totalPwaInstalls ?? 0) > 0 ? `${stats.totalPwaInstalls} au total` : undefined}
        />
        <StatCard
          icon="🔔"
          label="Notifications"
          value={stats.pushSubscriptions ?? 0}
          color="#f97316"
          subtitle={(stats.totalPushSubscriptions ?? 0) > 0 ? `${stats.totalPushSubscriptions} au total` : undefined}
        />
      </div>

      {/* Recent PWA Installs & Notifications */}
      {recentInstalls.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden mb-10">
          <div className="p-5 border-b border-[#2a2545]">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">
              Installations récentes
            </h2>
          </div>
          <div className="divide-y divide-[#2a2545]">
            {recentInstalls.map((i) => {
              const platformIcon = i.platform === 'android' ? '🤖' : i.platform === 'ios' ? '🍎' : '💻'
              const sourceLabel = i.install_source === 'prompt' ? 'Install' : i.install_source === 'ios_instructions' ? 'iOS' : 'Standalone'
              const location = [i.city, i.region].filter(Boolean).join(', ')
              return (
                <div key={i.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <span className="text-xl shrink-0">{platformIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {i.platform === 'android' ? 'Android' : i.platform === 'ios' ? 'iOS' : 'Desktop'}
                      {location && <span className="text-white/40 font-normal"> — {location}</span>}
                    </p>
                    <p className="text-xs text-white/30">
                      {new Date(i.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: '#10b98115', color: '#10b981' }}
                  >
                    {sourceLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Semifinal Preparation */}
      {semifinalistCount > 0 && (
        <div className="mb-10">
          <SemifinalPrep
            semifinalists={semifinalists}
            mp3Count={mp3Count}
            config={config}
            semifinalEvent={semifinalEvent}
          />
        </div>
      )}

      {/* Recent Candidates */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">
            Dernières inscriptions
          </h2>
          <Link
            href="/admin/candidats"
            className="text-xs text-[#e91e8c] hover:underline"
          >
            Voir tout →
          </Link>
        </div>

        {recentCandidates.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {recentCandidates.map((c) => {
              const st = STATUS_LABELS[c.status] || { label: c.status, color: '#666' }
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-lg">🎤</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {c.stage_name || `${c.first_name} ${c.last_name}`}
                    </p>
                    <p className="text-xs text-white/30">
                      {c.category} — {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  {/* Status */}
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: `${st.color}15`, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-white/30 text-sm">Aucune inscription pour le moment.</p>
        )}
      </div>
    </div>
  )
}
