'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  promoteToFinalist,
  removeFromFinalist,
  getFinaleEmailPreviews,
  sendFinaleNotifications,
  resetFinaleNotifications,
  reopenSemifinal,
} from '@/app/admin/demi-finale/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
}

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
}

interface JuryScore {
  id: string
  candidate_id: string
  juror_id: string
  total_score: number
  scores: Record<string, number | string> | null
  comment: string | null
}

interface Props {
  session: { id: string; name: string; slug: string }
  eventId: string
  allSemifinalists: Candidate[]
  finalists: Candidate[]
  jurors: Juror[]
  juryScores: JuryScore[]
  finalistsPerCategory: number
  notificationsSentAt: string | null
  categories: string[]
}

export default function FinalisteSelection({
  session,
  eventId,
  allSemifinalists,
  finalists,
  jurors,
  juryScores,
  finalistsPerCategory,
  notificationsSentAt,
  categories,
}: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailPreviews, setEmailPreviews] = useState<{ finaleHtml: string; rejectionHtml: string } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'finale' | 'rejection'>('finale')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    finalistsSent: number
    rejectionSent: number
    failures: string[]
    report: { email: string; name: string; type: 'finale' | 'non-selection'; status: 'sent' | 'simulated' | 'failed'; detail?: string }[]
    isSimulation: boolean
    sentAt: string
  } | null>(null)

  // Combine semifinalists + finalists for ranking
  const allCandidates = [
    ...allSemifinalists.map(c => ({ ...c, isFinalist: false })),
    ...finalists.map(c => ({ ...c, isFinalist: true })),
  ]

  // Get scores for a candidate
  const getScoresForCandidate = (candidateId: string) =>
    juryScores.filter((s) => s.candidate_id === candidateId)

  const getAvgStars = (candidateId: string) => {
    const scores = getScoresForCandidate(candidateId)
    if (scores.length === 0) return 0
    return scores.reduce((a, s) => a + s.total_score, 0) / scores.length
  }

  // Rankings per category sorted by avg stars
  const rankingsByCategory = new Map<string, (typeof allCandidates[0] & { avgStars: number; scoreCount: number })[]>()
  for (const cat of categories) {
    const catCandidates = allCandidates
      .filter((c) => c.category === cat)
      .map((c) => ({
        ...c,
        avgStars: getAvgStars(c.id),
        scoreCount: getScoresForCandidate(c.id).length,
      }))
      .sort((a, b) => b.avgStars - a.avgStars)
    rankingsByCategory.set(cat, catCandidates)
  }

  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  const finalistCount = finalists.length
  const finalistsByCategory = new Map<string, number>()
  for (const cat of categories) {
    finalistsByCategory.set(cat, finalists.filter(f => f.category === cat).length)
  }

  async function handlePromote(candidateId: string) {
    setLoadingId(candidateId)
    await promoteToFinalist(candidateId)
    setLoadingId(null)
    router.refresh()
  }

  async function handleDemote(candidateId: string) {
    setLoadingId(candidateId)
    await removeFromFinalist(candidateId)
    setLoadingId(null)
    router.refresh()
  }

  const nonSelectedCount = allSemifinalists.length

  async function handleOpenEmailModal() {
    setShowEmailModal(true)
    setSendResult(null)
    setPreviewTab('finale')
    setEmailPreviews(null)
    setPreviewError(null)
    try {
      const result = await getFinaleEmailPreviews(session.id)
      if ('error' in result) {
        setPreviewError(result.error as string)
        return
      }
      setEmailPreviews(result as { finaleHtml: string; rejectionHtml: string })
    } catch (err) {
      setPreviewError(`Erreur de chargement: ${err}`)
    }
  }

  async function handleSend() {
    setIsSending(true)
    const result = await sendFinaleNotifications(session.id)
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

  async function handleResetNotifications() {
    if (!confirm('Reinitialiser le verrouillage des notifications ?\n\nCela permettra de modifier les finalistes et de renvoyer les emails.')) return
    const result = await resetFinaleNotifications(session.id)
    if ('error' in result) {
      alert(result.error)
      return
    }
    setSendResult(null)
    router.refresh()
  }

  async function handleReopenSemifinal() {
    if (!confirm('Rouvrir la demi-finale ?\n\nL\'evenement repassera en mode pause. Vous pourrez reprendre la regie.')) return
    const result = await reopenSemifinal(eventId)
    if ('error' in result) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  const renderStars = (avg: number) => (
    <span className="text-sm tracking-wide">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(avg) ? 'text-[#f5a623]' : 'text-white/15'}>
          ★
        </span>
      ))}
      <span className="text-white/40 text-xs ml-1">{avg.toFixed(1)}</span>
    </span>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            Selection des finalistes
          </h2>
          <p className="text-white/40 text-sm">Demi-finale terminee — choisissez les finalistes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReopenSemifinal}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            Rouvrir la demi-finale
          </button>
          <div className="px-3 py-2 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/25 text-[#f5a623] text-sm font-bold">
            {finalistCount} finaliste{finalistCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Per-category quota */}
      <div className="grid grid-cols-3 gap-3">
        {categories.map((cat) => {
          const count = finalistsByCategory.get(cat) || 0
          const isComplete = count >= finalistsPerCategory
          return (
            <div key={cat} className={`p-3 rounded-xl border ${
              isComplete ? 'border-[#7ec850]/30 bg-[#7ec850]/5' : 'border-[#2a2545]'
            }`}>
              <p className="text-xs text-white/40">{cat}</p>
              <p className={`font-bold text-lg ${isComplete ? 'text-[#7ec850]' : 'text-white'}`}>
                {count}/{finalistsPerCategory}
              </p>
            </div>
          )
        })}
      </div>

      {/* ═══ Section 1: Votes du jury ═══ */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2545]">
          <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
            Votes du jury par categorie
          </h3>
          <p className="text-white/30 text-xs mt-1">
            Cliquez sur une categorie pour voir le detail des votes
          </p>
        </div>

        {categories.map((cat) => {
          const catRankings = rankingsByCategory.get(cat) || []
          const isExpanded = expandedCategory === cat
          const catFinalistCount = finalistsByCategory.get(cat) || 0

          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-[#2a2545] hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-white">{cat}</span>
                  <span className="text-xs text-white/30">{catRankings.length} candidat{catRankings.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    catFinalistCount >= finalistsPerCategory
                      ? 'bg-[#7ec850]/15 text-[#7ec850]'
                      : 'bg-white/5 text-white/30'
                  }`}>
                    {catFinalistCount}/{finalistsPerCategory} finalistes
                  </span>
                  <span className="text-white/30 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded: rankings + jury detail */}
              {isExpanded && (
                <div className="divide-y divide-[#1e1a35]">
                  {catRankings.map((c, index) => {
                    const candidateScores = getScoresForCandidate(c.id)
                    const isLoading = loadingId === c.id
                    const locked = !!notificationsSentAt

                    return (
                      <div
                        key={c.id}
                        className={`px-4 py-3 ${c.isFinalist ? 'bg-[#f5a623]/[0.04]' : ''} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {/* Candidate row */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white/30 w-5 text-center">{index + 1}</span>
                          <div className="w-9 h-9 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                            {c.photo_url ? (
                              <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-white truncate">{displayName(c)}</p>
                              {c.isFinalist && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5a623]/15 text-[#f5a623] shrink-0">
                                  Finaliste
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">{renderStars(c.avgStars)}</div>
                          <span className="text-[10px] text-white/20 shrink-0">{c.scoreCount}/{jurors.length}</span>

                          {/* Promote / Demote button */}
                          {!locked && (
                            c.isFinalist ? (
                              <button
                                onClick={() => handleDemote(c.id)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                              >
                                Retirer
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePromote(c.id)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#f5a623]/10 border border-[#f5a623]/25 text-[#f5a623] hover:bg-[#f5a623]/20 transition-colors shrink-0"
                              >
                                Finaliste
                              </button>
                            )
                          )}
                        </div>

                        {/* Jury detail */}
                        {candidateScores.length > 0 && (
                          <div className="mt-2 ml-8 flex flex-wrap gap-1.5">
                            {jurors.map((j) => {
                              const score = candidateScores.find(s => s.juror_id === j.id)
                              const jurorName = `${j.first_name || ''} ${j.last_name || ''}`.trim() || '?'
                              const starValue = score ? ((score.scores?.stars as number) || score.total_score) : 0

                              return (
                                <div
                                  key={j.id}
                                  className={`text-[11px] px-2 py-1 rounded-lg border ${
                                    score
                                      ? 'bg-[#f5a623]/5 border-[#f5a623]/15 text-white/60'
                                      : 'bg-white/[0.02] border-white/5 text-white/20'
                                  }`}
                                >
                                  <span className="text-white/40">{jurorName}:</span>{' '}
                                  {score ? (
                                    <span className="text-[#f5a623]">
                                      {[1, 2, 3, 4, 5].map((i) => (
                                        <span key={i} className={i <= starValue ? '' : 'opacity-20'}>★</span>
                                      ))}
                                    </span>
                                  ) : (
                                    <span>—</span>
                                  )}
                                  {score?.comment && (
                                    <p className="text-[10px] text-white/25 mt-0.5 italic truncate max-w-[200px]">
                                      &laquo; {score.comment} &raquo;
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {catRankings.length === 0 && (
                    <p className="px-4 py-6 text-center text-white/20 text-sm">Aucun candidat dans cette categorie.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ═══ Section 2: Liste des finalistes + email ═══ */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
        <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
          Destinataires de l&apos;email de qualification finale
        </h3>

        {finalistCount === 0 ? (
          <p className="text-white/30 text-sm">
            Aucun finaliste selectionne. Utilisez les boutons &laquo; Finaliste &raquo; ci-dessus pour promouvoir des candidats.
          </p>
        ) : (
          <div className="divide-y divide-[#2a2545] bg-[#1a1533] rounded-xl overflow-hidden">
            {finalists.map((c) => {
              const avg = getAvgStars(c.id)
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#161228] overflow-hidden shrink-0">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{displayName(c)}</p>
                    <p className="text-[10px] text-white/20">{c.category}</p>
                  </div>
                  <div className="shrink-0">{renderStars(avg)}</div>
                  <span className="text-[10px] text-[#f5a623] shrink-0">Finaliste</span>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-white/30">
          <strong className="text-white/50">{finalistCount}</strong> email(s) de qualification finale +{' '}
          <strong className="text-white/50">{nonSelectedCount}</strong> email(s) d&apos;encouragement aux non-retenus.
          <br />
          L&apos;email finaliste indiquera de choisir leurs morceaux pour les musiciens et qu&apos;une repetition sera organisee.
          L&apos;email non-retenu felicitera pour le parcours et assurera une notification automatique pour la prochaine saison.
        </p>

        {/* Notification status */}
        {notificationsSentAt && (
          <div className="rounded-xl p-4 border bg-[#7ec850]/10 border-[#7ec850]/30 flex items-center justify-between gap-4">
            <p className="text-sm text-[#7ec850]">
              Notifications envoyees le {new Date(notificationsSentAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
            <button
              onClick={handleResetNotifications}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors shrink-0"
            >
              Reinitialiser
            </button>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleOpenEmailModal}
          disabled={!!notificationsSentAt || isSending || finalistCount === 0}
          className={`w-full px-6 py-3 rounded-xl font-medium text-sm transition-colors ${
            notificationsSentAt
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : finalistCount === 0
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#f5a623] to-[#e8941e] text-white hover:opacity-90'
          }`}
        >
          {notificationsSentAt
            ? 'Notifications deja envoyees'
            : finalistCount === 0
              ? 'Selectionnez des finalistes d\'abord'
              : `Apercu et envoi — ${finalistCount + nonSelectedCount} email${(finalistCount + nonSelectedCount) !== 1 ? 's' : ''}`
          }
        </button>
      </div>

      {/* ═══ Send result report ═══ */}
      {sendResult && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
          <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
            Rapport d&apos;envoi
          </h3>

          {sendResult.isSimulation && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 font-medium text-sm">Mode simulation</p>
              <p className="text-amber-400/70 text-xs mt-1">
                RESEND_API_KEY n&apos;est pas configuree. Les emails n&apos;ont pas ete reellement envoyes.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-center">
              <p className="text-[#f5a623] font-bold text-xl">{sendResult.finalistsSent}</p>
              <p className="text-white/40 text-xs">Finale {sendResult.isSimulation ? '(simules)' : 'envoyes'}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
              <p className="text-[#7ec850] font-bold text-xl">{sendResult.rejectionSent}</p>
              <p className="text-white/40 text-xs">Encouragement {sendResult.isSimulation ? '(simules)' : 'envoyes'}</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${
              sendResult.failures.length > 0
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-white/5 border border-white/10'
            }`}>
              <p className={`font-bold text-xl ${sendResult.failures.length > 0 ? 'text-red-400' : 'text-white/30'}`}>
                {sendResult.failures.length}
              </p>
              <p className="text-white/40 text-xs">Echec(s)</p>
            </div>
          </div>

          <div className="divide-y divide-[#2a2545] bg-[#1a1533] rounded-xl overflow-hidden">
            {sendResult.report.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  r.status === 'sent' ? 'bg-[#7ec850]/20 text-[#7ec850]'
                    : r.status === 'simulated' ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {r.status === 'sent' ? '✓' : r.status === 'simulated' ? '~' : '✕'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{r.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{r.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  r.type === 'finale'
                    ? 'bg-[#f5a623]/10 text-[#f5a623]'
                    : 'bg-[#7ec850]/10 text-[#7ec850]'
                }`}>
                  {r.type === 'finale' ? 'Finaliste' : 'Encouragement'}
                </span>
                <span className={`text-[10px] shrink-0 ${
                  r.status === 'sent' ? 'text-[#7ec850]'
                    : r.status === 'simulated' ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {r.status === 'sent' ? 'Envoye' : r.status === 'simulated' ? 'Simule' : 'Echec'}
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
                Apercu de l&apos;email de qualification finale
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
              <div className="p-3 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-center">
                <p className="text-[#f5a623] font-bold text-xl">{finalistCount}</p>
                <p className="text-white/40 text-xs">Emails de qualification</p>
              </div>
              <div className="p-3 rounded-xl bg-[#7ec850]/10 border border-[#7ec850]/30 text-center">
                <p className="text-[#7ec850] font-bold text-xl">{nonSelectedCount}</p>
                <p className="text-white/40 text-xs">Emails d&apos;encouragement</p>
              </div>
            </div>

            {/* Preview tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewTab('finale')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewTab === 'finale'
                    ? 'bg-[#f5a623]/15 border border-[#f5a623]/30 text-[#f5a623]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                Email finaliste
              </button>
              <button
                onClick={() => setPreviewTab('rejection')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewTab === 'rejection'
                    ? 'bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850]'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                Email non-retenu
              </button>
            </div>

            <div className="border border-[#2a2545] rounded-xl overflow-hidden">
              {emailPreviews ? (
                <iframe
                  srcDoc={previewTab === 'finale' ? emailPreviews.finaleHtml : emailPreviews.rejectionHtml}
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
                    Reessayer
                  </button>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-white/30 text-sm animate-pulse">Chargement de l&apos;apercu...</p>
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
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-[#f5a623] to-[#e8941e] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSending ? 'Envoi en cours...' : `Confirmer et envoyer ${finalistCount + nonSelectedCount} emails`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
