'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PHASE_PUSH_MESSAGES,
  STATUS_CONFIG,
  SESSION_STATUSES,
  getStatusIndex,
  isStatusAtOrPast,
  type SessionStatus,
} from '@/lib/phases'

interface Session {
  id: string
  name: string
  slug: string
  status: string
  config: Record<string, unknown> | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  status: string
  fingerprint: string | null
  email: string
}

interface PushStats {
  total: number
  public: number
  jury: number
  admin: number
  reachableCandidates: number
  totalCandidates: number
}

interface PushLog {
  id: string
  title: string
  body: string
  url: string | null
  role: string
  segment: string | null
  is_test: boolean
  sent: number
  failed: number
  expired: number
  sent_by: string | null
  created_at: string
}

type SegmentValue =
  | 'all'
  | 'public'
  | 'jury'
  | 'admin'
  | 'all_candidates'
  | 'approved'
  | 'semifinalist'
  | 'finalist'
  | 'specific_candidate'

interface SegmentDef {
  value: SegmentValue
  label: string
  icon: string
  minPhase?: SessionStatus
}

const SEGMENTS: SegmentDef[] = [
  { value: 'all', label: 'Tous', icon: '📢' },
  { value: 'public', label: 'Public', icon: '👥' },
  { value: 'jury', label: 'Jury', icon: '⭐' },
  { value: 'admin', label: 'Admin', icon: '🔧' },
  { value: 'all_candidates', label: 'Candidats', icon: '🎤', minPhase: 'registration_open' },
  { value: 'approved', label: 'Approuvés', icon: '✅', minPhase: 'registration_closed' },
  { value: 'semifinalist', label: 'Demi-finalistes', icon: '🎬', minPhase: 'semifinal' },
  { value: 'finalist', label: 'Finalistes', icon: '🏟️', minPhase: 'final' },
  { value: 'specific_candidate', label: 'Un candidat', icon: '👤', minPhase: 'registration_open' },
]

const SEGMENT_LABELS: Record<string, string> = {
  all: 'Tous',
  public: 'Public',
  jury: 'Jury',
  admin: 'Admin',
  all_candidates: 'Candidats',
  approved: 'Approuvés',
  semifinalist: 'Demi-finalistes',
  finalist: 'Finalistes',
  specific_candidate: 'Un candidat',
}

interface Props {
  sessions: Session[]
  activeSessionId: string
  activeSessionStatus: string
  activeSessionConfig: Record<string, unknown>
  candidates: Candidate[]
  pushStats: PushStats
  pushLogs: PushLog[]
}

export default function NotificationsAdmin({
  sessions,
  activeSessionId,
  activeSessionStatus,
  activeSessionConfig,
  candidates,
  pushStats,
  pushLogs: initialPushLogs,
}: Props) {
  const [sessionId, setSessionId] = useState(activeSessionId)
  const [segment, setSegment] = useState<SegmentValue>('all')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  // Form
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [pushUrl, setPushUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)

  // Phase mode
  const [pushMode, setPushMode] = useState<'instant' | 'phase'>('instant')
  const [pushPhase, setPushPhase] = useState<string>('')

  // Push logs
  const [pushLogs, setPushLogs] = useState<PushLog[]>(initialPushLogs)
  const [loadingPushLogs, setLoadingPushLogs] = useState(false)

  const activeSession = sessions.find((s) => s.id === sessionId)
  const sessionStatus = activeSession?.status || activeSessionStatus
  const sessionConfig = activeSession?.config || activeSessionConfig

  // Visible segments based on session phase
  const visibleSegments = useMemo(() => {
    return SEGMENTS.filter(
      (s) => !s.minPhase || isStatusAtOrPast(sessionStatus, s.minPhase)
    )
  }, [sessionStatus])

  // Remaining phases for phase-linked notifications
  const remainingPhases = useMemo(() => {
    const currentIdx = getStatusIndex(sessionStatus)
    return SESSION_STATUSES.filter((s) => {
      const idx = getStatusIndex(s)
      return idx > currentIdx && s !== 'archived' && PHASE_PUSH_MESSAGES[s]
    })
  }, [sessionStatus])

  const customNotifs = (sessionConfig?.custom_phase_notifications || {}) as Record<
    string,
    { title: string; body: string }
  >

  // Candidate search for individual targeting
  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates.slice(0, 10)
    const q = candidateSearch.toLowerCase()
    return candidates
      .filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          (c.stage_name && c.stage_name.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [candidates, candidateSearch])

  const selectedCandidate = selectedCandidateId
    ? candidates.find((c) => c.id === selectedCandidateId)
    : null

  // Reach estimation
  const reachEstimate = useMemo(() => {
    if (segment === 'all') return pushStats.total
    if (segment === 'public') return pushStats.public
    if (segment === 'jury') return pushStats.jury
    if (segment === 'admin') return pushStats.admin
    if (segment === 'specific_candidate') {
      if (!selectedCandidate) return 0
      return selectedCandidate.fingerprint ? 1 : 0
    }
    // Candidate segments — approximate from reachableCandidates
    return pushStats.reachableCandidates
  }, [segment, pushStats, selectedCandidate])

  // ─── Handlers ────────────────────────────────────────

  async function loadPushLogs() {
    setLoadingPushLogs(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('push_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setPushLogs((data as PushLog[]) || [])
    setLoadingPushLogs(false)
  }

  function prefillPhase(phase: string) {
    setPushPhase(phase)
    const custom = customNotifs[phase]
    const defaultMsg = PHASE_PUSH_MESSAGES[phase as SessionStatus]
    if (custom) {
      setPushTitle(custom.title)
      setPushBody(custom.body)
    } else if (defaultMsg) {
      setPushTitle(defaultMsg.title)
      setPushBody(defaultMsg.body)
    }
  }

  async function handleSavePhaseNotification() {
    if (!pushPhase || !pushTitle.trim() || !pushBody.trim() || !activeSession) return
    setSending(true)
    setPushResult(null)
    try {
      const supabase = createClient()
      const config = { ...(activeSession.config || {}) }
      const existing = (config.custom_phase_notifications || {}) as Record<
        string,
        { title: string; body: string }
      >
      existing[pushPhase] = { title: pushTitle.trim(), body: pushBody.trim() }
      config.custom_phase_notifications = existing

      const { error } = await supabase
        .from('sessions')
        .update({ config })
        .eq('id', activeSession.id)

      if (error) {
        setPushResult(`Erreur : ${error.message}`)
      } else {
        activeSession.config = config
        const phaseLabel = STATUS_CONFIG[pushPhase as SessionStatus]?.label || pushPhase
        setPushResult(`Notification programmée pour "${phaseLabel}" sauvegardée`)
        setPushTitle('')
        setPushBody('')
        setPushPhase('')
      }
    } catch {
      setPushResult('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  async function handleTestPush() {
    if (!pushTitle.trim() || !pushBody.trim() || !sessionId) return
    setSending(true)
    setPushResult(null)
    try {
      const reg = await navigator.serviceWorker?.ready
      const sub = await reg?.pushManager?.getSubscription()
      if (!sub) {
        setPushResult(
          "Pas d'abonnement push sur cet appareil. Activez les notifications d'abord."
        )
        setSending(false)
        return
      }
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          endpoint: sub.endpoint,
          payload: {
            title: pushTitle.trim(),
            body: pushBody.trim(),
            url: pushUrl.trim() || undefined,
          },
        }),
      })
      const data = await res.json()
      if (data.error) {
        setPushResult(`Erreur : ${data.error}`)
      } else if (data.sent > 0) {
        setPushResult('Test envoyé sur cet appareil !')
        loadPushLogs()
      } else {
        setPushResult('Aucun abonnement trouvé pour cet appareil.')
      }
    } catch {
      setPushResult('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  async function handlePush(e: React.FormEvent) {
    e.preventDefault()
    if (!pushTitle.trim() || !pushBody.trim() || !sessionId) return

    setSending(true)
    setPushResult(null)
    try {
      // Build request body based on segment type
      const isRoleSegment = ['all', 'public', 'jury', 'admin'].includes(segment)
      const body: Record<string, unknown> = {
        sessionId,
        payload: {
          title: pushTitle.trim(),
          body: pushBody.trim(),
          url: pushUrl.trim() || undefined,
        },
      }

      if (isRoleSegment) {
        body.role = segment
      } else {
        body.segment = segment
        if (segment === 'specific_candidate' && selectedCandidateId) {
          body.candidateId = selectedCandidateId
        }
      }

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) {
        setPushResult(`Erreur : ${data.error}`)
      } else {
        setPushResult(
          `Envoyé : ${data.sent} | Échoué : ${data.failed} | Expiré : ${data.expired}`
        )
        setPushTitle('')
        setPushBody('')
        setPushUrl('')
        loadPushLogs()
      }
    } catch {
      setPushResult('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'w-full bg-[#0d0b1a] border border-[#2a2545] rounded-xl p-3 text-white placeholder:text-white/20 focus:border-[#e91e8c] focus:outline-none'

  return (
    <>
      <h1 className="text-xl sm:text-2xl font-bold mb-2">Notifications push</h1>
      <p className="text-white/50 mb-6 sm:mb-8">
        Envoyez des notifications ciblées par segment ou par candidat.
      </p>

      {/* ── Stats rapides ── */}
      <div className="bg-[#1a1232]/60 rounded-2xl p-4 mb-6 border border-[#2a2545]/60">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span className="text-white/70">
              <span className="font-semibold text-white">{pushStats.total}</span> abonnés push
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            👥 {pushStats.public} public
          </div>
          <div className="flex items-center gap-2 text-white/40">
            ⭐ {pushStats.jury} jury
          </div>
          <div className="flex items-center gap-2 text-white/40">
            🔧 {pushStats.admin} admin
          </div>
          {pushStats.totalCandidates > 0 && (
            <div className="flex items-center gap-2 text-white/40">
              🎤 {pushStats.reachableCandidates}/{pushStats.totalCandidates} candidats joignables
            </div>
          )}
        </div>
      </div>

      {/* ── Formulaire push ── */}
      <div id="push-section" className="bg-[#1a1232] rounded-2xl p-6 mb-8 border border-[#2a2545]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">🔔</span> Envoyer une notification
        </h2>

        <form
          onSubmit={
            pushMode === 'phase'
              ? (e) => {
                  e.preventDefault()
                  handleSavePhaseNotification()
                }
              : handlePush
          }
          className="space-y-4"
        >
          {/* Mode toggle */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Mode d&apos;envoi</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPushMode('instant')
                  setPushPhase('')
                  setPushTitle('')
                  setPushBody('')
                  setPushResult(null)
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  pushMode === 'instant'
                    ? 'bg-[#e91e8c] text-white'
                    : 'bg-[#0d0b1a] border border-[#2a2545] text-white/50 hover:text-white/70'
                }`}
              >
                Envoi instantané
              </button>
              <button
                type="button"
                onClick={() => {
                  setPushMode('phase')
                  if (remainingPhases.length && !pushPhase) prefillPhase(remainingPhases[0])
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  pushMode === 'phase'
                    ? 'bg-[#e91e8c] text-white'
                    : 'bg-[#0d0b1a] border border-[#2a2545] text-white/50 hover:text-white/70'
                }`}
                disabled={remainingPhases.length === 0}
                title={remainingPhases.length === 0 ? 'Aucune étape restante' : undefined}
              >
                Liée à une étape
              </button>
            </div>
          </div>

          {/* Phase selector (only in phase mode) */}
          {pushMode === 'phase' && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Étape du concours</label>
              <select
                value={pushPhase}
                onChange={(e) => prefillPhase(e.target.value)}
                className={inputClass}
              >
                {remainingPhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {STATUS_CONFIG[phase].icon} {STATUS_CONFIG[phase].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/30 mt-1">
                La notification sera envoyée automatiquement quand la session passera à cette étape.
              </p>
            </div>
          )}

          {/* Session selector */}
          {sessions.length > 1 && pushMode === 'instant' && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Session</label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className={inputClass}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Segment selector (only in instant mode) */}
          {pushMode === 'instant' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Destinataires</label>
              <div className="flex flex-wrap gap-2">
                {visibleSegments.map((seg) => (
                  <button
                    key={seg.value}
                    type="button"
                    onClick={() => {
                      setSegment(seg.value)
                      setSelectedCandidateId(null)
                      setCandidateSearch('')
                    }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      segment === seg.value
                        ? 'bg-[#e91e8c] text-white'
                        : 'bg-[#0d0b1a] border border-[#2a2545] text-white/50 hover:text-white/70'
                    }`}
                  >
                    {seg.icon} {seg.label}
                  </button>
                ))}
              </div>

              {/* Reach indicator */}
              <p className="text-xs text-white/30 mt-2">
                {segment === 'specific_candidate' && !selectedCandidateId
                  ? 'Sélectionnez un candidat ci-dessous'
                  : reachEstimate > 0
                    ? `~${reachEstimate} appareil${reachEstimate > 1 ? 's' : ''} recevra cette notification`
                    : 'Aucun abonné push dans ce segment'}
              </p>
            </div>
          )}

          {/* Candidate autocomplete (specific_candidate mode) */}
          {pushMode === 'instant' && segment === 'specific_candidate' && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Rechercher un candidat</label>
              <input
                type="text"
                value={candidateSearch}
                onChange={(e) => {
                  setCandidateSearch(e.target.value)
                  setSelectedCandidateId(null)
                }}
                className={inputClass}
                placeholder="Nom ou nom de scène..."
              />
              {selectedCandidate ? (
                <div className="mt-2 p-3 rounded-xl bg-[#e91e8c]/10 border border-[#e91e8c]/30 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-white">
                      {selectedCandidate.stage_name ||
                        `${selectedCandidate.first_name} ${selectedCandidate.last_name}`}
                    </span>
                    <span className="text-xs text-white/40 ml-2">{selectedCandidate.status}</span>
                    {!selectedCandidate.fingerprint && (
                      <span className="text-xs text-yellow-400 ml-2">
                        ⚠ Pas de fingerprint — push impossible, email : {selectedCandidate.email}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCandidateId(null)
                      setCandidateSearch('')
                    }}
                    className="text-white/40 hover:text-white/70 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                !selectedCandidateId && (
                  <div className="mt-1 space-y-1 max-h-[200px] overflow-y-auto">
                    {filteredCandidates.map((c) => {
                      const name = c.stage_name || `${c.first_name} ${c.last_name}`
                      const hasPush = !!c.fingerprint
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCandidateId(c.id)
                            setCandidateSearch(name)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-colors"
                        >
                          <span className="text-sm text-white/70">{name}</span>
                          <span className="text-xs text-white/30 ml-2">{c.status}</span>
                          <span className={`text-xs ml-2 ${hasPush ? 'text-green-400' : 'text-yellow-400'}`}>
                            {hasPush ? '📱 push' : '📧 email'}
                          </span>
                        </button>
                      )
                    })}
                    {filteredCandidates.length === 0 && (
                      <p className="text-xs text-white/30 py-2 px-3">Aucun candidat trouvé</p>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Titre *</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className={inputClass}
              placeholder="ChanteEnScène"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Message *</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Nouveaux candidats cette semaine ! Venez voter..."
              required
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm text-white/60 mb-1">
              URL de redirection (optionnel)
            </label>
            <input
              type="url"
              value={pushUrl}
              onChange={(e) => setPushUrl(e.target.value)}
              className={inputClass}
              placeholder="https://chantenscene.fr/saison-2025/candidats"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={
                sending ||
                !pushTitle.trim() ||
                !pushBody.trim() ||
                (pushMode === 'instant'
                  ? !sessionId ||
                    (segment === 'specific_candidate' && !selectedCandidateId)
                  : !pushPhase)
              }
              className="bg-[#e91e8c] hover:bg-[#d11a7d] disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {sending
                ? pushMode === 'phase'
                  ? 'Sauvegarde...'
                  : 'Envoi en cours...'
                : pushMode === 'phase'
                  ? 'Sauvegarder pour cette étape'
                  : 'Envoyer la notification'}
            </button>
            {pushMode === 'instant' && (
              <button
                type="button"
                onClick={handleTestPush}
                disabled={sending || !pushTitle.trim() || !pushBody.trim() || !sessionId}
                className="bg-[#0d0b1a] border border-[#2a2545] hover:border-[#e91e8c]/50 disabled:opacity-50 text-white/60 hover:text-white font-medium px-5 py-3 rounded-xl transition-colors text-sm"
              >
                Tester sur mon appareil
              </button>
            )}
          </div>

          {pushResult && (
            <div
              className={`mt-3 p-3 rounded-xl border text-sm whitespace-pre-wrap ${
                pushResult.startsWith('Erreur')
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : 'bg-green-500/10 border-green-500/20 text-green-300'
              }`}
            >
              {pushResult}
            </div>
          )}
        </form>
      </div>

      {/* ── Notifications programmées ── */}
      {remainingPhases.length > 0 && (
        <div className="bg-[#1a1232]/60 rounded-2xl p-5 mb-8 border border-[#2a2545]/60">
          <h2 className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2">
            <span>🔔</span> Notifications push programmées
          </h2>
          <p className="text-white/30 text-xs mb-3">
            Ces notifications seront envoyées automatiquement quand la session change de phase.
          </p>
          <div className="space-y-2">
            {remainingPhases.map((phase) => {
              const sc = STATUS_CONFIG[phase]
              const custom = customNotifs[phase]
              const defaultMsg = PHASE_PUSH_MESSAGES[phase]!
              const msg = custom || defaultMsg
              return (
                <div
                  key={phase}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <span className="text-lg shrink-0 mt-0.5">{sc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-white/60">{sc.label}</span>
                      {custom ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e91e8c]/20 text-[#e91e8c] border border-[#e91e8c]/30">
                          personnalisée
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">
                          défaut
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate">
                      <span className="font-medium text-white/50">{msg.title}</span>
                      {' — '}
                      {msg.body}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPushMode('phase')
                      prefillPhase(phase)
                      document
                        .getElementById('push-section')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="text-[10px] text-white/30 hover:text-[#e91e8c] transition-colors shrink-0"
                  >
                    Modifier
                  </button>
                </div>
              )
            })}
          </div>
          {/* Inscription reminder cron info */}
          {!!sessionConfig?.registration_start && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-white/25 text-[10px] font-medium mb-1">
                Rappel inscriptions (cron) :
              </p>
              <p className="text-white/15 text-[10px]">
                📧 J-5 + Jour J avant le{' '}
                {new Date(
                  (sessionConfig.registration_start as string) + 'T00:00:00'
                ).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                — email + push public
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Historique push ── */}
      <div className="bg-[#1a1232] rounded-2xl p-6 border border-[#2a2545]">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">📋</span> Historique des notifications
        </h2>
        {loadingPushLogs ? (
          <p className="text-white/30 text-sm">Chargement...</p>
        ) : pushLogs.length === 0 ? (
          <p className="text-white/30 text-sm">Aucune notification envoyée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Titre</th>
                  <th className="text-left py-2 px-2">Message</th>
                  <th className="text-center py-2 px-2">Cible</th>
                  <th className="text-center py-2 px-2">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {pushLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="py-2 px-2 text-white/40 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-2 text-white/70 max-w-[150px] truncate">
                      {log.url ? (
                        <a
                          href={log.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#e91e8c] hover:underline"
                        >
                          {log.title}
                        </a>
                      ) : (
                        log.title
                      )}
                    </td>
                    <td className="py-2 px-2 text-white/50 max-w-[200px] truncate">
                      {log.body}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {log.is_test ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300">
                          Test
                        </span>
                      ) : log.segment ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300">
                          {SEGMENT_LABELS[log.segment] || log.segment}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[#e91e8c]/20 text-[#e91e8c]">
                          {log.role === 'all'
                            ? 'Tous'
                            : log.role === 'public'
                              ? 'Public'
                              : log.role === 'jury'
                                ? 'Jury'
                                : log.role === 'admin'
                                  ? 'Admin'
                                  : log.role}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center text-xs">
                      <span className="text-green-400">{log.sent}</span>
                      {log.failed > 0 && (
                        <span className="text-red-400 ml-1">/ {log.failed} err</span>
                      )}
                      {log.expired > 0 && (
                        <span className="text-yellow-400 ml-1">/ {log.expired} exp</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
