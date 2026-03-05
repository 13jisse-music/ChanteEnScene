export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import SemifinalPrep from '@/components/SemifinalPrep'
import PwaFunnel from '@/components/PwaFunnel'
import InstallsMap from '@/components/InstallsMap'
import DailyStats from '@/components/DailyStats'
import ChangelogCard from '@/components/ChangelogCard'
// DevTimeCard removed from dashboard grid
import { SESSION_STATUSES, STATUS_CONFIG, getStatusIndex, type SessionStatus } from '@/lib/phases'
import { Fragment } from 'react'

async function getStats() {
  const supabase = createAdminClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, slug, status, city, year, config')
    .order('year', { ascending: false })

  if (!sessions || sessions.length === 0) return { sessions: [], stats: {}, semifinalists: [], recentInstalls: [], semifinalEvent: null, config: { semifinal_date: null, semifinal_time: null, semifinal_location: null, selection_notifications_sent_at: null }, donations: { totalEuros: 0, count: 0, lastDonation: null }, jury: { onlineNow: 0, totalActive: 0 } }

  const activeSession = sessions[0]
  const sid = activeSession.id
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // All queries in parallel (no dependencies between them)
  const [
    { count: totalCandidates },
    { count: pending },
    { count: approved },
    { count: totalVotes },
    { data: recentCandidates },
    { data: semifinalists },
    { data: semifinalEvent },
    { count: pwaInstalls },
    { count: pushSubscriptions },
    { data: recentInstalls },
    { count: totalPwaInstalls },
    { count: totalPushSubscriptions },
    { count: emailSubscribers },
    { data: visitorsData },
    { data: installsData },
    { data: pushData },
    { data: donationsData },
    { count: totalPageViews },
    { data: dailyViewsRaw },
    { data: onlineJurors },
    { count: totalJurors },
  ] = await Promise.all([
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('session_id', sid),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('session_id', sid).eq('status', 'pending'),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('session_id', sid).eq('status', 'approved'),
    supabase.from('votes').select('*', { count: 'exact', head: true }).eq('session_id', sid),
    supabase.from('candidates').select('id, first_name, last_name, stage_name, category, status, created_at, photo_url').eq('session_id', sid).order('created_at', { ascending: false }).limit(5),
    supabase.from('candidates').select('id, first_name, last_name, stage_name, category, status, photo_url, mp3_url, song_title, song_artist, slug').eq('session_id', sid).in('status', ['semifinalist', 'finalist', 'winner']).order('category').order('last_name'),
    supabase.from('live_events').select('id, status').eq('session_id', sid).eq('event_type', 'semifinal').limit(1).maybeSingle(),
    supabase.from('pwa_installs').select('*', { count: 'exact', head: true }).eq('session_id', sid),
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('session_id', sid).eq('role', 'public'),
    supabase.from('pwa_installs').select('id, platform, install_source, city, region, latitude, longitude, created_at').eq('session_id', sid).order('created_at', { ascending: false }),
    supabase.from('pwa_installs').select('*', { count: 'exact', head: true }),
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('role', 'public'),
    supabase.from('email_subscribers').select('*', { count: 'exact', head: true }).eq('session_id', sid).eq('is_active', true),
    supabase.from('page_views').select('fingerprint, user_agent').eq('session_id', sid).not('fingerprint', 'is', null),
    supabase.from('pwa_installs').select('platform').eq('session_id', sid),
    supabase.from('push_subscriptions').select('fingerprint').eq('session_id', sid).eq('role', 'public'),
    supabase.from('donations').select('amount_cents, donor_name, tier, created_at').eq('session_id', sid).order('created_at', { ascending: false }),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('session_id', sid),
    supabase.from('page_views').select('fingerprint, created_at').eq('session_id', sid).gte('created_at', sevenDaysAgo),
    supabase.from('jurors').select('id, last_seen_at').eq('session_id', sid).eq('is_active', true).not('last_seen_at', 'is', null).gte('last_seen_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()),
    supabase.from('jurors').select('*', { count: 'exact', head: true }).eq('session_id', sid).eq('is_active', true),
  ])

  const config = (activeSession.config || {}) as Record<string, unknown>

  // Unique visitors with device classification
  const visitorsByDevice = { android: 0, ios: 0, desktop: 0 }
  if (visitorsData) {
    const seen = new Map<string, string | null>()
    for (const row of visitorsData) {
      if (!seen.has(row.fingerprint)) seen.set(row.fingerprint, row.user_agent)
    }
    for (const ua of seen.values()) {
      const lower = (ua || '').toLowerCase()
      if (/iphone|ipad|ipod/.test(lower)) {
        visitorsByDevice.ios++
      } else if (/android/.test(lower)) {
        visitorsByDevice.android++
      } else {
        visitorsByDevice.desktop++
      }
    }
  }
  const uniqueVisitors = visitorsByDevice.android + visitorsByDevice.ios + visitorsByDevice.desktop

  // PWA installs by device
  const installsByDevice = { android: 0, ios: 0, desktop: 0 }
  if (installsData) {
    for (const row of installsData) {
      if (row.platform === 'android') {
        installsByDevice.android++
      } else if (row.platform === 'ios') {
        installsByDevice.ios++
      } else {
        installsByDevice.desktop++
      }
    }
  }

  // Push subscriptions by device (match fingerprint to page_views user_agent)
  const pushByDevice = { android: 0, ios: 0, desktop: 0 }
  if (pushData && visitorsData) {
    const fpToUa = new Map<string, string | null>()
    for (const row of visitorsData) {
      if (row.fingerprint && !fpToUa.has(row.fingerprint)) fpToUa.set(row.fingerprint, row.user_agent)
    }
    const counted = new Set<string>()
    for (const row of pushData) {
      if (!row.fingerprint || counted.has(row.fingerprint)) continue
      counted.add(row.fingerprint)
      const ua = fpToUa.get(row.fingerprint)
      const lower = (ua || '').toLowerCase()
      if (/iphone|ipad|ipod/.test(lower)) {
        pushByDevice.ios++
      } else if (/android/.test(lower)) {
        pushByDevice.android++
      } else {
        pushByDevice.desktop++
      }
    }
  }

  // Donations
  const totalDonationsEuros = donationsData
    ? donationsData.reduce((sum, d) => sum + d.amount_cents, 0) / 100
    : 0
  const donationsCount = donationsData?.length || 0
  const lastDonation = donationsData?.[0] || null

  // Daily stats for last 7 days
  const dailyStats: { date: string; label: string; pageViews: number; uniqueVisitors: number }[] = []
  if (dailyViewsRaw) {
    const byDay = new Map<string, { views: number; fingerprints: Set<string> }>()
    for (const row of dailyViewsRaw) {
      const day = new Date(row.created_at).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
      if (!byDay.has(day)) byDay.set(day, { views: 0, fingerprints: new Set() })
      const d = byDay.get(day)!
      d.views++
      if (row.fingerprint) d.fingerprints.add(row.fingerprint)
    }
    // Fill all 7 days (even empty ones)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
      const label = d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric' })
      const data = byDay.get(key)
      dailyStats.push({
        date: key,
        label,
        pageViews: data?.views || 0,
        uniqueVisitors: data?.fingerprints.size || 0,
      })
    }
  }

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
      emailSubscribers: emailSubscribers || 0,
      uniqueVisitors,
      totalPageViews: totalPageViews || 0,
      visitorsByDevice,
      installsByDevice,
      pushByDevice,
    },
    dailyStats,
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
    donations: {
      totalEuros: totalDonationsEuros,
      count: donationsCount,
      lastDonation,
    },
    jury: {
      onlineNow: onlineJurors?.length || 0,
      totalActive: totalJurors || 0,
    },
  }
}

function StatCard({
  label,
  value,
  color,
  icon,
  subtitle,
  href,
  valueStr,
}: {
  label: string
  value?: number
  color: string
  icon: string
  subtitle?: string
  href?: string
  valueStr?: string
}) {
  const content = (
    <div className={`bg-[#161228] border border-[#2a2545] rounded-2xl p-3 sm:p-5 transition-colors ${href ? 'hover:bg-[#1a1533] hover:border-[#3a3565] cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-lg sm:text-2xl">{icon}</span>
        <span
          className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full truncate max-w-[100px] sm:max-w-none"
          style={{ background: `${color}15`, color }}
        >
          {label}
        </span>
      </div>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl" style={{ color }}>
        {valueStr ?? value}
      </p>
      {subtitle && (
        <p className="text-white/30 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
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
  const { activeSession, stats, dailyStats = [], recentCandidates = [], recentInstalls = [], semifinalists = [], semifinalEvent, config, donations, jury } = await getStats()

  const semifinalistCount = semifinalists.length
  const mp3Count = semifinalists.filter((c) => c.mp3_url).length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl text-white">
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
        <div className="flex items-center gap-0 mb-6 sm:mb-8 px-2 sm:px-4 py-3 bg-[#161228] border border-[#2a2545] rounded-2xl overflow-x-auto">
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

      {/* Stats Grid — Concours */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-10">
        {/* Candidats — carte fusionnée cliquable */}
        <Link href="/admin/candidats" className="block">
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-3 sm:p-5 hover:bg-[#1a1533] hover:border-[#3a3565] transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-lg sm:text-2xl">🎤</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full" style={{ background: '#e91e8c15', color: '#e91e8c' }}>
                Candidats
              </span>
            </div>
            <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl text-[#e91e8c]">
              {stats.totalCandidates ?? 0}
            </p>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#2a2545]">
              <span className="text-xs" style={{ color: '#7ec850' }}>
                ✅ {stats.approved ?? 0} <span className="text-white/30">approuvé{(stats.approved ?? 0) > 1 ? 's' : ''}</span>
              </span>
              <span className="text-xs" style={{ color: '#f59e0b' }}>
                ⏳ {stats.pending ?? 0} <span className="text-white/30">en attente</span>
              </span>
            </div>
          </div>
        </Link>
        <StatCard icon="❤️" label="Votes" value={stats.totalVotes ?? 0} color="#3b82f6" href="/admin/votes" />
        {semifinalistCount > 0 && (
          <StatCard icon="🌟" label="Demi-finalistes" value={semifinalistCount} color="#8b5cf6" href="/admin/candidats" />
        )}
        <StatCard icon="👀" label="Visiteurs" value={stats.uniqueVisitors ?? 0} color="#8b5cf6" href="/admin/visiteurs" />
        <StatCard icon="📧" label="Abonnés email" value={stats.emailSubscribers ?? 0} color="#ec4899" href="/admin/abonnes" />
        <StatCard
          icon="💰"
          label="Dons"
          valueStr={`${donations.totalEuros.toLocaleString('fr-FR')} €`}
          color="#7ec850"
          href="/admin/sponsors"
          subtitle={donations.count > 0 ? `${donations.count} don${donations.count > 1 ? 's' : ''}` : 'Aucun don'}
        />
        <StatCard
          icon="👨‍⚖️"
          label="Jury"
          valueStr={`${jury.onlineNow}/${jury.totalActive}`}
          color={jury.onlineNow > 0 ? '#7ec850' : '#3b82f6'}
          href="/admin/jury"
          subtitle={jury.onlineNow > 0 ? `${jury.onlineNow} en ligne maintenant` : `${jury.totalActive} juré(s) au total`}
        />
      </div>

      {/* Daily Traffic Chart */}
      {dailyStats.length > 0 && (
        <div className="mb-6 sm:mb-10">
          <DailyStats data={dailyStats} />
        </div>
      )}

      {/* PWA Adoption Funnel */}
      <div className="mb-6 sm:mb-10">
        <PwaFunnel
          uniqueVisitors={stats.uniqueVisitors ?? 0}
          pwaInstalls={stats.pwaInstalls ?? 0}
          pushSubscriptions={stats.pushSubscriptions ?? 0}
          visitorsByDevice={stats.visitorsByDevice ?? { android: 0, ios: 0, desktop: 0 }}
          installsByDevice={stats.installsByDevice ?? { android: 0, ios: 0, desktop: 0 }}
          pushByDevice={stats.pushByDevice ?? { android: 0, ios: 0, desktop: 0 }}
        />
      </div>

      {/* Recent PWA Installs & Notifications */}
      {recentInstalls.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden mb-6 sm:mb-10">
          <div className="p-4 sm:p-5 border-b border-[#2a2545] flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base">
              Installations récentes
            </h2>
            <InstallsMap installs={recentInstalls} />
          </div>
          <div className="divide-y divide-[#2a2545] overflow-y-auto" style={{ maxHeight: '300px' }}>
            {recentInstalls.map((i) => {
              const platformIcon = i.platform === 'android' ? '🤖' : i.platform === 'ios' ? '🍎' : '💻'
              const sourceLabel = i.install_source === 'prompt' ? 'Install' : i.install_source === 'ios_instructions' ? 'iOS' : 'Standalone'
              const location = [i.city, i.region].filter(Boolean).join(', ')
              const hasCoords = i.latitude && i.longitude
              const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${i.latitude},${i.longitude}` : null
              const Wrapper = mapsUrl ? 'a' : 'div'
              return (
                <Wrapper
                  key={i.id}
                  {...(mapsUrl ? { href: mapsUrl, target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-white/[0.02] transition-colors ${mapsUrl ? 'cursor-pointer' : ''}`}
                >
                  <span className="text-lg sm:text-xl shrink-0">{platformIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {i.platform === 'android' ? 'Android' : i.platform === 'ios' ? 'iOS' : 'Desktop'}
                      {location && <span className="text-white/40 font-normal"> — {location}</span>}
                      {mapsUrl && <span className="text-white/20 ml-1 text-xs">📍</span>}
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
                </Wrapper>
              )
            })}
          </div>
        </div>
      )}

      {/* Semifinal Preparation */}
      {semifinalistCount > 0 && (
        <div className="mb-6 sm:mb-10">
          <SemifinalPrep
            semifinalists={semifinalists}
            mp3Count={mp3Count}
            config={config}
            semifinalEvent={semifinalEvent}
          />
        </div>
      )}

      {/* Changelog — Dernières mises à jour du site */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden mb-6 sm:mb-10">
        <div className="p-4 sm:p-5 border-b border-[#2a2545] flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base">
            Mises à jour du site
          </h2>
          <a
            href="https://github.com/13jisse-music/ChanteEnScene/commits/master"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#e91e8c] hover:underline"
          >
            Historique complet →
          </a>
        </div>
        <ChangelogCard />
      </div>

      {/* Recent Candidates */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base">
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
                <div key={c.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-white/[0.02] transition-colors">
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
