'use client'

import { useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  promoteToSemifinalist,
  demoteFromSemifinalist,
  bulkPromoteCategory,
} from '@/app/admin/jury-en-ligne/actions'
import {
  getEmailPreviews,
  sendSelectionNotifications,
} from '@/app/admin/resultats/actions'
import { updateSessionConfig } from '@/app/admin/config/actions'
import { STATUS_CONFIG, type SessionStatus } from '@/lib/phases'

/* ---------- types ---------- */

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string
  song_artist: string
  likes_count: number
  status: string
}

interface JuryScore {
  id: string
  candidate_id: string
  juror_id: string
  total_score: number
  scores: Record<string, string | number> | null
  comment: string | null
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
}

interface Props {
  session: { id: string; name: string; slug: string; status?: string; config: Record<string, unknown> }
  candidates: Candidate[]
  juryScores: JuryScore[]
  jurors: Juror[]
  categories: string[]
  notificationsSentAt: string | null
}

interface EmailReport {
  email: string
  name: string
  type: 'selection' | 'rejection'
  status: 'sent' | 'simulated' | 'failed'
  detail?: string
}

type Decision = 'oui' | 'peut-etre' | 'non'

const DC: Record<Decision, { label: string; emoji: string; color: string }> = {
  oui: { label: 'Oui', emoji: '👍', color: '#7ec850' },
  'peut-etre': { label: 'Peut-être', emoji: '🤔', color: '#f59e0b' },
  non: { label: 'Non', emoji: '👎', color: '#ef4444' },
}

function displayName(c: { first_name: string; last_name: string; stage_name: string | null }) {
  return c.stage_name || `${c.first_name} ${c.last_name}`
}

/* ---------- component ---------- */

export default function RegieEnLigne({ session, candidates, juryScores, jurors, categories, notificationsSentAt }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null)

  /* ---- email state ---- */
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailPreviews, setEmailPreviews] = useState<{ selectionHtml: string; rejectionHtml: string } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'selection' | 'rejection'>('selection')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    selectionSent: number
    rejectionSent: number
    failures: string[]
    report: EmailReport[]
    isSimulation: boolean
    sentAt: string
  } | null>(null)

  /* ---- config ---- */
  const config = (session.config || {}) as Record<string, unknown>
  const semifinalistsQuota = (config.semifinalists_per_category as number) || 10

  /* ---- compute rankings per category ---- */
  const categoryData = useMemo(() => {
    return categories.map((cat) => {
      const catCandidates = candidates.filter((c) => c.category === cat)

      const rankings = catCandidates.map((c) => {
        const scores = juryScores.filter((s) => s.candidate_id === c.id)
        let oui = 0, peutEtre = 0, non = 0
        for (const s of scores) {
          const d = (s.scores as Record<string, string> | null)?.decision as Decision | undefined
          if (d === 'oui') oui++
          else if (d === 'peut-etre') peutEtre++
          else if (d === 'non') non++
        }
        const total = scores.length
        const ouiPercent = total > 0 ? oui / total : 0
        const nonPercent = total > 0 ? non / total : 0
        const verdict: 'favorable' | 'defavorable' | 'balance' =
          ouiPercent > 0.5 ? 'favorable' : nonPercent > 0.5 ? 'defavorable' : 'balance'

        return {
          candidate: c,
          oui,
          peutEtre,
          non,
          total,
          ouiPercent,
          verdict,
          scores,
        }
      }).sort((a, b) => {
        if (b.ouiPercent !== a.ouiPercent) return b.ouiPercent - a.ouiPercent
        return (b.candidate.likes_count || 0) - (a.candidate.likes_count || 0)
      })

      const selected = rankings.filter((r) => r.candidate.status === 'semifinalist').length
      const favorableApproved = rankings.filter(
        (r) => r.verdict === 'favorable' && r.candidate.status === 'approved'
      ).length

      return { category: cat, rankings, selected, favorableApproved }
    })
  }, [categories, candidates, juryScores])

  /* ---- global stats ---- */
  const totalCandidates = candidates.length
  const totalVotes = juryScores.length
  const activeJurors = jurors.filter((j) => j.is_active).length
  const votedCandidates = new Set(juryScores.map((s) => s.candidate_id)).size
  const totalSelected = candidates.filter((c) => c.status === 'semifinalist').length

  /* ---- actions ---- */
  async function handlePromote(candidateId: string) {
    setLoadingId(candidateId)
    const result = await promoteToSemifinalist(candidateId)
    if (result?.error) alert(result.error)
    setLoadingId(null)
    router.refresh()
  }

  async function handleDemote(candidateId: string) {
    setLoadingId(candidateId)
    const result = await demoteFromSemifinalist(candidateId)
    if (result?.error) alert(result.error)
    setLoadingId(null)
    router.refresh()
  }

  async function handleBulkPromote(category: string) {
    if (!confirm(`Promouvoir tous les candidats favorables de "${category}" en demi-finalistes ?`)) return
    setLoadingId(`bulk-${category}`)
    const result = await bulkPromoteCategory(session.id, category)
    if (result?.error) alert(result.error)
    setLoadingId(null)
    router.refresh()
  }

  /* ---- email actions ---- */
  async function handleOpenEmailModal() {
    setShowEmailModal(true)
    setSendResult(null)
    setPreviewTab('selection')
    setEmailPreviews(null)
    setPreviewError(null)
    try {
      const result = await getEmailPreviews(session.id)
      if ('error' in result) {
        setPreviewError(result.error as string)
        return
      }
      setEmailPreviews(result as { selectionHtml: string; rejectionHtml: string })
    } catch (err) {
      setPreviewError(`Erreur de chargement: ${err}`)
    }
  }

  async function handleSendEmails() {
    setIsSending(true)
    const result = await sendSelectionNotifications(session.id)
    setIsSending(false)
    if ('error' in result) {
      alert(result.error)
      return
    }
    if ('success' in result) {
      setSendResult(result as typeof sendResult)
      setShowEmailModal(false)
      router.refresh()
    }
  }

  const nonSelectedCount = candidates.filter((c) => c.status === 'approved').length

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">
            Régie Jury En Ligne
          </h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {notificationsSentAt ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/30">
              ✉️ Emails envoyés le {new Date(notificationsSentAt).toLocaleDateString('fr-FR')}
            </span>
          ) : totalSelected > 0 ? (
            <button
              onClick={handleOpenEmailModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850] hover:bg-[#7ec850]/25 transition-colors"
            >
              ✉️ Aperçu et envoi des emails
            </button>
          ) : null}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10">
            {votedCandidates}/{totalCandidates} candidats évalués
          </div>
        </div>
      </div>

      {/* Phase banner */}
      {session.status && (
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{
            background: `${STATUS_CONFIG[session.status as SessionStatus]?.color || '#3b82f6'}10`,
            borderWidth: 1,
            borderColor: `${STATUS_CONFIG[session.status as SessionStatus]?.color || '#3b82f6'}30`,
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: STATUS_CONFIG[session.status as SessionStatus]?.color }}>
              Phase actuelle : {STATUS_CONFIG[session.status as SessionStatus]?.label || session.status}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {STATUS_CONFIG[session.status as SessionStatus]?.description}
            </p>
          </div>
        </div>
      )}

      {/* Jury online voting toggle */}
      <div className={`flex items-center justify-between rounded-xl p-4 ${
        config.jury_online_voting_closed
          ? 'bg-red-500/10 border border-red-500/30'
          : 'bg-[#7ec850]/10 border border-[#7ec850]/30'
      }`}>
        <div>
          <p className={`text-sm font-medium ${config.jury_online_voting_closed ? 'text-red-400' : 'text-[#7ec850]'}`}>
            {config.jury_online_voting_closed ? 'Vote jury en ligne fermé' : 'Vote jury en ligne ouvert'}
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            {config.jury_online_voting_closed
              ? 'Les jurés ne peuvent plus voter. Les recommandations sont calculées ci-dessous.'
              : 'Les jurés peuvent évaluer les candidats approuvés.'}
          </p>
        </div>
        <button
          onClick={async () => {
            const newValue = !config.jury_online_voting_closed
            const confirmMsg = newValue
              ? 'Fermer le vote du jury en ligne ? Les jurés ne pourront plus voter.'
              : 'Rouvrir le vote du jury en ligne ?'
            if (!confirm(confirmMsg)) return
            const newConfig = { ...config, jury_online_voting_closed: newValue }
            const result = await updateSessionConfig(session.id, newConfig)
            if (result.error) alert(result.error)
            else router.refresh()
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            config.jury_online_voting_closed
              ? 'bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850] hover:bg-[#7ec850]/25'
              : 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
          }`}
        >
          {config.jury_online_voting_closed ? 'Rouvrir le vote' : 'Fermer le vote jury'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon="🎤" label="Candidats" value={totalCandidates} color="#e91e8c" />
        <StatCard icon="🗳️" label="Votes" value={totalVotes} color="#7ec850" />
        <StatCard icon="👨‍⚖️" label="Jurés" value={activeJurors} color="#3b82f6" />
        <StatCard icon="✅" label="Évalués" value={votedCandidates} color="#f5a623" />
        <StatCard icon="⭐" label="Sélectionnés" value={totalSelected} color="#8b5cf6" />
      </div>

      {/* Per-category sections */}
      {categoryData.map(({ category, rankings, selected, favorableApproved }) => (
        <div key={category} className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
          {/* Category header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2545]">
            <div className="flex items-center gap-3">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">{category}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                selected > semifinalistsQuota
                  ? 'bg-red-500/15 border-red-500/25 text-red-400'
                  : selected === semifinalistsQuota
                  ? 'bg-[#f5a623]/15 border-[#f5a623]/25 text-[#f5a623]'
                  : 'bg-[#8b5cf6]/15 border-[#8b5cf6]/25 text-[#8b5cf6]'
              }`}>
                {selected} / {semifinalistsQuota} sélectionné{selected !== 1 ? 's' : ''}
              </span>
            </div>
            {favorableApproved > 0 && (
              <button
                onClick={() => handleBulkPromote(category)}
                disabled={loadingId !== null}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850] hover:bg-[#7ec850]/25 transition-colors disabled:opacity-50"
              >
                {loadingId === `bulk-${category}` ? '...' : `Valider ${favorableApproved} favorable${favorableApproved > 1 ? 's' : ''}`}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-2 py-2 text-left">Candidat</th>
                  <th className="px-3 py-2 text-center" style={{ color: DC.oui.color }}>Oui</th>
                  <th className="px-3 py-2 text-center" style={{ color: DC['peut-etre'].color }}>~</th>
                  <th className="px-3 py-2 text-center" style={{ color: DC.non.color }}>Non</th>
                  <th className="px-3 py-2 text-center w-20">Votes</th>
                  <th className="px-3 py-2 text-center">Verdict</th>
                  <th className="px-3 py-2 text-center">Likes</th>
                  <th className="px-3 py-2 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, idx) => {
                  const c = r.candidate
                  const isSelected = c.status === 'semifinalist'
                  const isExpanded = expandedCandidate === c.id

                  return (
                    <Fragment key={c.id}>
                      <tr
                        className={`border-b border-[#2a2545]/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#8b5cf6]/[0.07]' : 'hover:bg-white/[0.02]'
                        }`}
                        onClick={() => setExpandedCandidate(isExpanded ? null : c.id)}
                      >
                        {/* Rank */}
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-[#f5a623]/20 text-[#f5a623]' :
                            idx === 1 ? 'bg-white/10 text-white/60' :
                            idx === 2 ? 'bg-orange-900/20 text-orange-400/60' :
                            'text-white/20'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>

                        {/* Photo + Name */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 ${
                              isSelected ? 'border-[#8b5cf6]' : 'border-transparent'
                            }`}>
                              {c.photo_url ? (
                                <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#1a1533] flex items-center justify-center text-white/10 text-sm">🎤</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${isSelected ? 'text-[#8b5cf6]' : 'text-white/80'}`}>
                                {displayName(c)}
                              </p>
                              <p className="text-white/20 text-[10px] truncate">{c.song_title} — {c.song_artist}</p>
                            </div>
                          </div>
                        </td>

                        {/* Oui */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-xs font-bold" style={{ color: DC.oui.color }}>{r.oui}</span>
                        </td>

                        {/* Peut-être */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-xs" style={{ color: DC['peut-etre'].color }}>{r.peutEtre}</span>
                        </td>

                        {/* Non */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-xs" style={{ color: DC.non.color }}>{r.non}</span>
                        </td>

                        {/* Vote bar */}
                        <td className="px-3 py-3">
                          {r.total > 0 ? (
                            <div className="flex rounded-full overflow-hidden h-2.5 w-16 mx-auto">
                              {r.oui > 0 && <div style={{ width: `${(r.oui / r.total) * 100}%`, backgroundColor: DC.oui.color }} />}
                              {r.peutEtre > 0 && <div style={{ width: `${(r.peutEtre / r.total) * 100}%`, backgroundColor: DC['peut-etre'].color }} />}
                              {r.non > 0 && <div style={{ width: `${(r.non / r.total) * 100}%`, backgroundColor: DC.non.color }} />}
                            </div>
                          ) : (
                            <span className="text-white/10 text-xs block text-center">—</span>
                          )}
                        </td>

                        {/* Verdict */}
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.verdict === 'favorable'
                              ? 'bg-[#7ec850]/15 text-[#7ec850] border border-[#7ec850]/25'
                              : r.verdict === 'defavorable'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                                : 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/25'
                          }`}>
                            {r.verdict === 'favorable' ? 'Favorable' : r.verdict === 'defavorable' ? 'Défavorable' : 'En balance'}
                          </span>
                        </td>

                        {/* Likes */}
                        <td className="px-3 py-3 text-center">
                          <span className="text-white/30 text-xs">❤️ {c.likes_count || 0}</span>
                        </td>

                        {/* Action */}
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {isSelected ? (
                            <button
                              onClick={() => handleDemote(c.id)}
                              disabled={loadingId !== null}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              {loadingId === c.id ? '...' : 'Retirer'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePromote(c.id)}
                              disabled={loadingId !== null}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/25 transition-colors disabled:opacity-50"
                            >
                              {loadingId === c.id ? '...' : 'Demi-finaliste'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded jury detail */}
                      {isExpanded && (
                        <tr className="border-b border-[#2a2545]/50">
                          <td colSpan={9} className="px-5 py-3 bg-white/[0.01]">
                            <div className="flex flex-wrap gap-2">
                              {r.scores.map((s) => {
                                const juror = jurors.find((j) => j.id === s.juror_id)
                                const decision = (s.scores as Record<string, string> | null)?.decision as Decision | undefined
                                const cfg = decision ? DC[decision] : null
                                return (
                                  <div
                                    key={s.id}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs"
                                  >
                                    <span className="text-white/40">
                                      {juror ? `${juror.first_name || ''} ${juror.last_name || ''}`.trim() || 'Juré' : 'Juré'}
                                    </span>
                                    {cfg && (
                                      <span className="font-bold" style={{ color: cfg.color }}>
                                        {cfg.emoji} {cfg.label}
                                      </span>
                                    )}
                                    {s.comment && (
                                      <span className="text-white/20 italic truncate max-w-[200px]">&quot;{s.comment}&quot;</span>
                                    )}
                                  </div>
                                )
                              })}
                              {r.scores.length === 0 && (
                                <span className="text-white/20 text-xs">Aucun vote pour ce candidat</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Summary — pie charts + likes */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2545]">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">Récapitulatif jury & popularité</h2>
        </div>
        <div className={`grid gap-4 p-4`} style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
          {categoryData.map(({ category, rankings }) => {
            const allVotes = rankings.flatMap((r) => {
              const decisions: Decision[] = []
              for (const s of r.scores) {
                const d = (s.scores as Record<string, string> | null)?.decision as Decision | undefined
                if (d) decisions.push(d)
              }
              return decisions
            })
            const oui = allVotes.filter((d) => d === 'oui').length
            const pe = allVotes.filter((d) => d === 'peut-etre').length
            const non = allVotes.filter((d) => d === 'non').length
            const totalVotesInCat = allVotes.length

            // Pie chart angles
            const ouiPct = totalVotesInCat > 0 ? (oui / totalVotesInCat) * 100 : 0
            const pePct = totalVotesInCat > 0 ? (pe / totalVotesInCat) * 100 : 0

            // Likes stats
            const likes = rankings.map((r) => r.candidate.likes_count || 0)
            const totalLikes = likes.reduce((a, b) => a + b, 0)
            const avgLikes = rankings.length > 0 ? Math.round(totalLikes / rankings.length) : 0
            const maxLikes = Math.max(0, ...likes)
            const topLiked = rankings.length > 0
              ? [...rankings].sort((a, b) => (b.candidate.likes_count || 0) - (a.candidate.likes_count || 0))[0]
              : null

            return (
              <div key={category} className="p-4 rounded-xl bg-white/[0.02] border border-[#2a2545]/50 space-y-4">
                <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-center">{category}</h3>

                {/* Pie chart */}
                <div className="flex flex-col items-center gap-3">
                  {totalVotesInCat > 0 ? (
                    <div
                      className="w-20 h-20 rounded-full relative"
                      style={{
                        background: `conic-gradient(#7ec850 0% ${ouiPct}%, #f59e0b ${ouiPct}% ${ouiPct + pePct}%, #ef4444 ${ouiPct + pePct}% 100%)`,
                      }}
                    >
                      <div className="absolute inset-2.5 rounded-full bg-[#161228] flex items-center justify-center">
                        <span className="text-white/50 text-[10px] font-bold">{totalVotesInCat}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-white/10 text-[10px]">Aucun</span>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#7ec850]" />
                      <span className="text-white/40">{oui}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      <span className="text-white/40">{pe}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                      <span className="text-white/40">{non}</span>
                    </span>
                  </div>
                </div>

                {/* Likes analysis */}
                <div className="space-y-2 pt-2 border-t border-[#2a2545]/50">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Total likes</span>
                    <span className="text-[#e91e8c] font-bold">❤️ {totalLikes}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/30">Moyenne</span>
                    <span className="text-white/50 font-bold">{avgLikes}</span>
                  </div>
                  {topLiked && maxLikes > 0 && (
                    <div className="flex items-center justify-between text-[10px] gap-1">
                      <span className="text-white/30 shrink-0">Top</span>
                      <span className="text-[#e91e8c]/70 font-medium truncate text-right">
                        {displayName(topLiked.candidate)} ({maxLikes})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ Send result report ═══ */}
      {sendResult && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">
              Rapport d&apos;envoi
            </h2>
            {sendResult.isSimulation && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold">
                Mode simulation
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
              <p className="text-[#7ec850] font-bold text-xl">{sendResult.selectionSent}</p>
              <p className="text-white/40 text-xs">Emails de sélection</p>
            </div>
            <div className="p-3 rounded-xl bg-[#e91e8c]/10 border border-[#e91e8c]/30 text-center">
              <p className="text-[#e91e8c] font-bold text-xl">{sendResult.rejectionSent}</p>
              <p className="text-white/40 text-xs">Emails d&apos;encouragement</p>
            </div>
          </div>

          {sendResult.failures.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs space-y-1">
              <p className="font-bold">Échecs :</p>
              {sendResult.failures.map((f, i) => (
                <p key={i}>{f}</p>
              ))}
            </div>
          )}

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {sendResult.report.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/[0.02]">
                <span className="text-white/40 truncate flex-1">{r.name}</span>
                <span className="text-white/20 truncate max-w-[180px]">{r.email}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  r.type === 'selection'
                    ? 'bg-[#7ec850]/10 text-[#7ec850]'
                    : 'bg-[#e91e8c]/10 text-[#e91e8c]'
                }`}>
                  {r.type === 'selection' ? 'Sélection' : 'Encouragement'}
                </span>
                <span className={`text-[10px] shrink-0 ${
                  r.status === 'sent' ? 'text-[#7ec850]'
                    : r.status === 'simulated' ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {r.status === 'sent' ? 'Envoyé' : r.status === 'simulated' ? 'Simulé' : 'Échec'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Email preview modal ═══ */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
                Aperçu des emails de sélection
              </h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
                <p className="text-[#7ec850] font-bold text-xl">{totalSelected}</p>
                <p className="text-white/40 text-xs">Emails de sélection (+ lien MP3)</p>
              </div>
              <div className="p-3 rounded-xl bg-[#e91e8c]/10 border border-[#e91e8c]/30 text-center">
                <p className="text-[#e91e8c] font-bold text-xl">{nonSelectedCount}</p>
                <p className="text-white/40 text-xs">Emails d&apos;encouragement</p>
              </div>
            </div>

            {/* Preview tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewTab('selection')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewTab === 'selection'
                    ? 'bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                Email sélection
              </button>
              <button
                onClick={() => setPreviewTab('rejection')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewTab === 'rejection'
                    ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/30 text-[#e91e8c]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                Email non-retenu
              </button>
            </div>

            <div className="border border-[#2a2545] rounded-xl overflow-hidden">
              {emailPreviews ? (
                <iframe
                  srcDoc={previewTab === 'selection' ? emailPreviews.selectionHtml : emailPreviews.rejectionHtml}
                  className="w-full h-96 bg-white/5"
                  sandbox=""
                />
              ) : previewError ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3">
                  <p className="text-red-400 text-sm">{previewError}</p>
                  <button
                    onClick={handleOpenEmailModal}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-white/30 text-sm animate-pulse">Chargement de l&apos;aperçu...</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-sm bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendEmails}
                disabled={isSending}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-[#7ec850] to-[#5ba636] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSending ? 'Envoi en cours...' : `Confirmer et envoyer ${totalSelected + nonSelectedCount} emails`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- sub-components ---------- */

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
      <span className="text-lg">{icon}</span>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-xl" style={{ color }}>{value}</p>
      <p className="text-white/30 text-[10px]">{label}</p>
    </div>
  )
}
