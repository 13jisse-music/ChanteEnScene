'use client'

import { useState, useEffect } from 'react'
import { usePushSubscription } from '@/hooks/usePushSubscription'

type Decision = 'oui' | 'peut-etre' | 'non'

interface ExistingScore {
  candidate_id: string
  scores: Record<string, string | number>
  comment: string | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string
  song_artist: string
}

interface Props {
  jurorName: string
  jurorId: string
  sessionId: string
  candidates: Candidate[]
  existingScores: ExistingScore[]
  deadline: string | null // ISO date
  onStartVoting: () => void
}

const DECISION_CONFIG: Record<Decision, { emoji: string; color: string; label: string }> = {
  oui: { emoji: '👍', color: '#7ec850', label: 'Oui' },
  'peut-etre': { emoji: '🤔', color: '#f59e0b', label: 'Peut-être' },
  non: { emoji: '👎', color: '#ef4444', label: 'Non' },
}

export default function JuryDashboard({ jurorName, jurorId, sessionId, candidates, existingScores, deadline, onStartVoting }: Props) {
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)

  // Auto re-subscribe push with jury role (silent, no prompt unless needed)
  const { isSubscribed: pushSubscribed, subscribe: subscribePush, isSupported: pushSupported } = usePushSubscription({
    sessionId,
    role: 'jury',
    jurorId,
    autoSubscribe: true, // If permission already granted, silently re-subscribe as jury role
  })

  // Vote counts
  const voted = new Set(existingScores.map((s) => s.candidate_id))
  const votedCount = voted.size
  const totalCount = candidates.length
  const remainingCount = totalCount - votedCount
  const progress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0

  let ouiCount = 0, peutEtreCount = 0, nonCount = 0
  for (const s of existingScores) {
    const d = s.scores?.decision as Decision | undefined
    if (d === 'oui') ouiCount++
    else if (d === 'peut-etre') peutEtreCount++
    else if (d === 'non') nonCount++
  }

  // Deadline
  const deadlineDate = deadline ? new Date(deadline) : null
  const now = new Date()
  const isExpired = deadlineDate ? now > deadlineDate : false
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  // PWA install prompt
  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show banner if not already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Check if already standalone (PWA installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false)
    } else {
      // Show banner anyway after a short delay (for iOS or browsers without beforeinstallprompt)
      const timer = setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowInstallBanner(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstall() {
    if (deferredPrompt && 'prompt' in deferredPrompt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (deferredPrompt as any).prompt()
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#1a1533] to-[#0d0b1a] overflow-auto">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-lg">
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Scène</span>
          </h1>
          <p className="text-white/40 text-sm">Bonjour {jurorName} !</p>
        </div>

        {/* PWA Install or Push Notifications Banner */}
        {showInstallBanner && !pushSubscribed && (
          <div className="bg-gradient-to-r from-[#e91e8c]/10 to-[#7ec850]/10 border border-[#e91e8c]/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">📲</span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {deferredPrompt ? "Installez l'appli" : 'Activez les notifications'}
                </p>
                <p className="text-xs text-white/50">
                  Recevez une notification dès qu&apos;un nouveau candidat est à évaluer !
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {deferredPrompt ? (
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#e91e8c] text-white hover:bg-[#d4177d] active:scale-[0.98] transition-all"
                >
                  Installer
                </button>
              ) : pushSupported ? (
                <button
                  onClick={async () => {
                    const ok = await subscribePush()
                    if (ok) setShowInstallBanner(false)
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#e91e8c] text-white hover:bg-[#d4177d] active:scale-[0.98] transition-all"
                >
                  Activer les notifications
                </button>
              ) : (
                <div className="flex-1 space-y-1.5">
                  <p className="text-[10px] text-white/40">
                    Appuyez sur le bouton de partage de votre navigateur, puis &quot;Ajouter à l&apos;écran d&apos;accueil&quot;
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowInstallBanner(false)}
                className="px-4 py-2.5 rounded-xl text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
        )}

        {/* Push confirmed badge */}
        {pushSubscribed && (
          <div className="bg-[#7ec850]/10 border border-[#7ec850]/20 rounded-xl p-3 flex items-center gap-2">
            <span className="text-sm">🔔</span>
            <p className="text-xs text-[#7ec850]">Notifications activées — vous serez prévenu(e) des nouveaux candidats</p>
          </div>
        )}

        {/* Deadline warning */}
        {deadlineDate && !isExpired && daysLeft !== null && daysLeft <= 3 && (
          <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/25 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <p className="text-sm text-[#f59e0b]">
              {daysLeft === 0
                ? "Dernier jour pour voter !"
                : `Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour voter`}
            </p>
          </div>
        )}

        {isExpired && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <p className="text-sm text-red-400">La période de vote est terminée. Merci pour votre participation !</p>
          </div>
        )}

        {/* Progress card */}
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-xs uppercase tracking-wider">Ma progression</p>
            <p className="text-sm font-bold text-white">
              {votedCount}/{totalCount}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-[#2a2545] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {totalCount === 0 ? (
            <p className="text-center text-white/30 text-sm py-4">
              Aucun candidat à évaluer pour le moment.
              <br />
              <span className="text-xs text-white/20">Vous recevrez une notification quand les candidatures seront ouvertes au vote !</span>
            </p>
          ) : remainingCount > 0 ? (
            <p className="text-sm text-white/50 text-center">
              {remainingCount} candidat{remainingCount > 1 ? 's' : ''} en attente de votre vote
            </p>
          ) : (
            <p className="text-sm text-[#7ec850] text-center font-medium">
              Vous avez voté pour tous les candidats !
            </p>
          )}
        </div>

        {/* Vote summary (only if has votes) */}
        {votedCount > 0 && (
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider">Mes votes</p>

            {/* Colored bar */}
            <div className="h-3 rounded-full overflow-hidden flex">
              {ouiCount > 0 && (
                <div
                  style={{ width: `${(ouiCount / votedCount) * 100}%`, background: '#7ec850' }}
                  className="transition-all"
                />
              )}
              {peutEtreCount > 0 && (
                <div
                  style={{ width: `${(peutEtreCount / votedCount) * 100}%`, background: '#f59e0b' }}
                  className="transition-all"
                />
              )}
              {nonCount > 0 && (
                <div
                  style={{ width: `${(nonCount / votedCount) * 100}%`, background: '#ef4444' }}
                  className="transition-all"
                />
              )}
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#7ec850]/10 rounded-xl p-3">
                <p className="text-xl font-bold text-[#7ec850]">{ouiCount}</p>
                <p className="text-[10px] text-white/40 mt-0.5">👍 Oui</p>
              </div>
              <div className="bg-[#f59e0b]/10 rounded-xl p-3">
                <p className="text-xl font-bold text-[#f59e0b]">{peutEtreCount}</p>
                <p className="text-[10px] text-white/40 mt-0.5">🤔 Peut-être</p>
              </div>
              <div className="bg-[#ef4444]/10 rounded-xl p-3">
                <p className="text-xl font-bold text-[#ef4444]">{nonCount}</p>
                <p className="text-[10px] text-white/40 mt-0.5">👎 Non</p>
              </div>
            </div>

            {/* Favorites mini list */}
            {ouiCount > 0 && (
              <div className="space-y-2">
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Mes coups de coeur</p>
                {candidates
                  .filter((c) => {
                    const s = existingScores.find((sc) => sc.candidate_id === c.id)
                    return s?.scores?.decision === 'oui'
                  })
                  .slice(0, 5)
                  .map((c) => {
                    const name = c.stage_name || `${c.first_name} ${c.last_name}`
                    return (
                      <div key={c.id} className="flex items-center gap-2.5 bg-[#7ec850]/5 rounded-lg p-2">
                        <div className="w-8 h-8 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                          {c.photo_url ? (
                            <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">🎤</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{name}</p>
                          <p className="text-[10px] text-white/30 truncate">{c.song_title}</p>
                        </div>
                      </div>
                    )
                  })}
                {ouiCount > 5 && (
                  <p className="text-[10px] text-white/20 text-center">
                    et {ouiCount - 5} autre{ouiCount - 5 > 1 ? 's' : ''}...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vote CTA */}
        {totalCount > 0 && !isExpired && (
          <button
            onClick={onStartVoting}
            className="w-full py-4 rounded-2xl text-sm font-bold bg-[#e91e8c] text-white hover:bg-[#d4177d] active:scale-[0.98] transition-all shadow-lg shadow-[#e91e8c]/20"
          >
            {remainingCount > 0
              ? `Voter (${remainingCount} candidat${remainingCount > 1 ? 's' : ''} restant${remainingCount > 1 ? 's' : ''})`
              : 'Revoir mes votes'}
          </button>
        )}

        {/* Deadline info */}
        {deadlineDate && !isExpired && daysLeft !== null && daysLeft > 3 && (
          <p className="text-center text-white/20 text-xs">
            Date limite : {deadlineDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        )}

        {/* Branding */}
        <p className="text-center text-white/10 text-[10px] pt-4">
          <span className="text-white/15">Chant</span>
          <span className="text-[#7ec850]/20">En</span>
          <span className="text-[#e91e8c]/20">Scène</span>
          {' · '}Espace Jury
        </p>
      </div>
    </div>
  )
}
