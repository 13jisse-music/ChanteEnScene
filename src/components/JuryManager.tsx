'use client'

import { useState, useEffect } from 'react'
import { addJuror, toggleJuror, deleteJuror, sendJuryInvitation, setJuryVotingDeadline, sendJuryReminder } from '@/app/admin/jury/actions'
import JuryQRCode from './JuryQRCode'

interface Juror {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  qr_token: string
  is_active: boolean
  created_at: string
  onboarding_done?: boolean
  last_login_at?: string | null
  login_count?: number
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  status: string
}

interface Score {
  id: string
  juror_id: string
  candidate_id: string
  event_type: string
  total_score: number
}

interface Session {
  id: string
  name: string
  config: {
    jury_criteria: { name: string; max_score: number }[]
    jury_voting_deadline?: string
  }
}

interface Props {
  session: Session | null
  jurors: Juror[]
  candidates: Candidate[]
  scores: Score[]
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  online: { label: 'En ligne', color: '#3b82f6' },
  semifinal: { label: 'Demi-finale', color: '#f59e0b' },
  final: { label: 'Finale', color: '#e91e8c' },
}

export default function JuryManager({ session, jurors, candidates, scores }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('online')
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [remindingAll, setRemindingAll] = useState(false)
  const [deadlineValue, setDeadlineValue] = useState(session?.config?.jury_voting_deadline?.split('T')[0] || '')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [appUrl, setAppUrl] = useState(process.env.NEXT_PUBLIC_APP_URL || '')

  useEffect(() => {
    if (!appUrl) {
      setAppUrl(window.location.origin)
    }
  }, [appUrl])

  if (!session) return <p className="text-white/30">Aucune session active.</p>

  async function handleAdd() {
    if (!firstName.trim() || !lastName.trim()) return
    setLoading(true)
    const result = await addJuror(session!.id, firstName.trim(), lastName.trim(), role, email.trim(), appUrl)
    if (result.error) {
      alert(`Erreur : ${result.error}`)
    } else if (result.emailSent) {
      alert('Juré ajouté et invitation envoyée par email !')
    } else if (email.trim()) {
      alert('Juré ajouté mais l\'email n\'a pas pu être envoyé.')
    }
    setFirstName('')
    setLastName('')
    setEmail('')
    setShowAdd(false)
    setLoading(false)
  }

  async function handleToggle(jurorId: string, isActive: boolean) {
    setLoadingId(jurorId)
    await toggleJuror(jurorId, !isActive)
    setLoadingId(null)
  }

  async function handleDelete(jurorId: string, name: string) {
    if (!confirm(`Supprimer le juré ${name} ?`)) return
    setLoadingId(jurorId)
    await deleteJuror(jurorId)
    setLoadingId(null)
  }

  async function handleSendInvitation(jurorId: string) {
    setSendingId(jurorId)
    const result = await sendJuryInvitation(jurorId, appUrl)
    if (result.error) {
      alert(`Erreur : ${result.error}`)
    } else {
      alert('Invitation envoyée !')
    }
    setSendingId(null)
  }

  function getJurorScoreCount(jurorId: string) {
    return scores.filter((s) => s.juror_id === jurorId).length
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['online', 'semifinal', 'final'] as const).map((r) => {
          const rl = ROLE_LABELS[r]
          const count = jurors.filter((j) => j.role === r && j.is_active).length
          return (
            <div key={r} className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{rl.label}</p>
              <p className="font-[family-name:var(--font-montserrat)] font-bold text-2xl" style={{ color: rl.color }}>
                {count}
              </p>
              <p className="text-white/20 text-xs mt-1">juré(s) actif(s)</p>
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <div className="flex justify-between items-center">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white">
          Liste des jurés
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
        >
          + Ajouter un juré
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              className="bg-[#1a1533] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c]"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              className="bg-[#1a1533] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-[#1a1533] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#1a1533] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
            >
              <option value="online">En ligne</option>
              <option value="semifinal">Demi-finale</option>
              <option value="final">Finale</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Jurors list */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
        {jurors.length > 0 ? (
          <div className="divide-y divide-[#2a2545]">
            {jurors.map((j) => {
              const rl = ROLE_LABELS[j.role] || { label: j.role, color: '#666' }
              const name = `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Sans nom'
              const scoreCount = getJurorScoreCount(j.id)
              const juryUrl = `${appUrl}/jury/${j.qr_token}`
              const isLoading = loadingId === j.id

              return (
                <div
                  key={j.id}
                  className={`p-4 ${isLoading ? 'opacity-50 pointer-events-none' : ''} ${!j.is_active ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{name}</p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${rl.color}15`, color: rl.color }}
                        >
                          {rl.label}
                        </span>
                      </div>
                      {j.email && (
                        <p className="text-xs text-white/30 mt-0.5">{j.email}</p>
                      )}
                      <p className="text-xs text-white/20 mt-0.5">
                        {scoreCount} note(s) donnée(s)
                      </p>
                    </div>

                    {/* Link */}
                    <div className="hidden md:block">
                      <input
                        readOnly
                        value={juryUrl}
                        className="bg-[#1a1533] border border-[#2a2545] rounded-lg px-3 py-1.5 text-xs text-white/40 w-72 focus:outline-none"
                        onClick={(e) => {
                          (e.target as HTMLInputElement).select()
                          navigator.clipboard.writeText(juryUrl)
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => window.open(juryUrl, '_blank')}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6]/70 hover:text-[#3b82f6] transition-colors"
                      title="Ouvrir la page jury"
                    >
                      🔗 Ouvrir
                    </button>
                    {j.email && (
                      <button
                        onClick={() => handleSendInvitation(j.id)}
                        disabled={sendingId === j.id}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#7ec850]/10 border border-[#7ec850]/20 text-[#7ec850]/70 hover:text-[#7ec850] transition-colors disabled:opacity-50"
                        title="Renvoyer l'invitation par email"
                      >
                        {sendingId === j.id ? '⏳' : '✉️ Relancer'}
                      </button>
                    )}
                    <JuryQRCode url={juryUrl} jurorName={name} role={rl.label} />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(juryUrl)
                        alert('Lien copié !')
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
                      title="Copier le lien"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleToggle(j.id, j.is_active)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {j.is_active ? '🔒 Désactiver' : '🔓 Activer'}
                    </button>
                    <button
                      onClick={() => handleDelete(j.id, name)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-500/5 border border-red-500/15 text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-white/30 text-sm">
            Aucun juré pour le moment.
          </p>
        )}
      </div>

      {/* Deadline & Reminders */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-4">
        <p className="text-white/40 text-xs uppercase tracking-wider">Jury en ligne — Configuration</p>

        {/* Deadline */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-white/30 mb-1 block">Date limite de vote</label>
            <input
              type="date"
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
              className="w-full bg-[#1a1533] border border-[#2a2545] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
            />
          </div>
          <button
            onClick={async () => {
              setSavingDeadline(true)
              const dl = deadlineValue ? `${deadlineValue}T23:59:59` : null
              await setJuryVotingDeadline(session!.id, dl)
              setSavingDeadline(false)
            }}
            disabled={savingDeadline}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[#3b82f6]/10 border border-[#3b82f6]/25 text-[#3b82f6] hover:bg-[#3b82f6]/20 transition-colors disabled:opacity-50"
          >
            {savingDeadline ? 'Enregistrement...' : deadlineValue ? 'Enregistrer' : 'Supprimer la deadline'}
          </button>
        </div>

        {/* Reminder */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2a2545]">
          <button
            onClick={async () => {
              setRemindingAll(true)
              const result = await sendJuryReminder(session!.id)
              if (result.error) {
                alert(`Erreur : ${result.error}`)
              } else {
                alert(`Rappel envoyé à ${result.sent}/${result.total} juré(s)`)
              }
              setRemindingAll(false)
            }}
            disabled={remindingAll}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[#f59e0b]/10 border border-[#f59e0b]/25 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-50"
          >
            {remindingAll ? 'Envoi...' : '📩 Rappel à tous les jurés en ligne'}
          </button>
        </div>
      </div>

      {/* Online juror engagement stats */}
      {jurors.some((j) => j.role === 'online' && j.last_login_at) && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Activité des jurés en ligne</p>
          <div className="space-y-2">
            {jurors
              .filter((j) => j.role === 'online' && j.is_active)
              .map((j) => {
                const name = `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Sans nom'
                const scoreCount = getJurorScoreCount(j.id)
                const totalCandidates = candidates.filter(
                  (c) => ['approved', 'semifinalist', 'finalist'].includes(c.status)
                ).length

                return (
                  <div key={j.id} className="flex items-center gap-3 bg-[#1a1533]/50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/30 mt-0.5">
                        {j.last_login_at && (
                          <span>Dernière visite : {new Date(j.last_login_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {j.login_count !== undefined && j.login_count > 0 && (
                          <span>{j.login_count} visite{j.login_count > 1 ? 's' : ''}</span>
                        )}
                        {j.onboarding_done && (
                          <span className="text-[#7ec850]">Onboarding OK</span>
                        )}
                        {j.last_login_at === null && !j.onboarding_done && (
                          <span className="text-[#f59e0b]">Jamais connecté</span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold" style={{ color: scoreCount >= totalCandidates ? '#7ec850' : scoreCount > 0 ? '#f59e0b' : '#ef4444' }}>
                        {scoreCount}/{totalCandidates}
                      </p>
                      <p className="text-[10px] text-white/20">votes</p>
                    </div>

                    {/* Remind button */}
                    {j.email && scoreCount < totalCandidates && (
                      <button
                        onClick={async () => {
                          setRemindingId(j.id)
                          const result = await sendJuryReminder(session!.id, j.id)
                          if (result.error) {
                            alert(`Erreur : ${result.error}`)
                          } else {
                            alert('Rappel envoyé !')
                          }
                          setRemindingId(null)
                        }}
                        disabled={remindingId === j.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {remindingId === j.id ? '...' : '📩'}
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Criteria reminder */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Critères de notation</p>
        <div className="flex flex-wrap gap-2">
          {(session.config.jury_criteria || []).map((c: { name: string; max_score: number }) => (
            <span
              key={c.name}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50"
            >
              {c.name} (/{c.max_score})
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
