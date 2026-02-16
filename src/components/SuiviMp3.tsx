'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { sendMp3Reminder, adminUploadMp3 } from '@/app/admin/jury-en-ligne/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string
  song_artist: string
  mp3_url: string | null
  email: string
  slug: string
  status: string
}

interface Props {
  session: { id: string; name: string; slug: string; config: Record<string, unknown> }
  candidates: Candidate[]
  notificationsSentAt: string | null
}

function displayName(c: { first_name: string; last_name: string; stage_name: string | null }) {
  return c.stage_name || `${c.first_name} ${c.last_name}`
}

export default function SuiviMp3({ session, candidates, notificationsSentAt }: Props) {
  const router = useRouter()
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null)
  const [reminderSending, setReminderSending] = useState<string | null>(null)
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set())
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const mp3Received = candidates.filter((c) => c.mp3_url).length
  const mp3Missing = candidates.filter((c) => !c.mp3_url)

  async function handleSendReminder(candidateId: string) {
    setReminderSending(candidateId)
    const result = await sendMp3Reminder(candidateId, session.id)
    setReminderSending(null)
    if ('error' in result && result.error) {
      alert(result.error)
    } else {
      setReminderSent((prev) => new Set(prev).add(candidateId))
    }
  }

  async function handleAdminUpload(candidateId: string, file: File) {
    setUploadingId(candidateId)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await adminUploadMp3(candidateId, fd)
    setUploadingId(null)
    if ('error' in result && result.error) {
      setUploadError(result.error as string)
    } else {
      setExpandedUpload(null)
      router.refresh()
    }
  }

  // Not ready yet
  if (!notificationsSentAt) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">
            Suivi des playbacks MP3
          </h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/30 text-sm">
            Les emails de sélection n&apos;ont pas encore été envoyés.
          </p>
          <p className="text-white/20 text-xs mt-2">
            Envoyez d&apos;abord les notifications depuis la Régie En Ligne.
          </p>
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">
            Suivi des playbacks MP3
          </h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-white/30 text-sm">Aucun demi-finaliste sélectionné.</p>
        </div>
      </div>
    )
  }

  // Group by category
  const categories = [...new Set(candidates.map((c) => c.category))].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-xl">
            Suivi des playbacks MP3
          </h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/30">
          ✉️ Emails envoyés le {new Date(notificationsSentAt).toLocaleDateString('fr-FR')}
        </span>
      </div>

      {/* Progress card */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">
            Progression
          </h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
            mp3Received === candidates.length
              ? 'bg-[#7ec850]/15 border-[#7ec850]/25 text-[#7ec850]'
              : 'bg-[#f5a623]/15 border-[#f5a623]/25 text-[#f5a623]'
          }`}>
            {mp3Received} / {candidates.length} reçu{mp3Received !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="w-full h-3 bg-[#2a2545] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all"
            style={{ width: `${candidates.length > 0 ? (mp3Received / candidates.length) * 100 : 0}%` }}
          />
        </div>
        {mp3Missing.length > 0 && (
          <p className="text-[#f5a623] text-xs mt-2">
            {mp3Missing.length} candidat{mp3Missing.length > 1 ? 's' : ''} sans MP3
          </p>
        )}
        {mp3Received === candidates.length && (
          <p className="text-[#7ec850] text-xs mt-2">
            Tous les playbacks ont été reçus !
          </p>
        )}
      </div>

      {/* Per-category tables */}
      {categories.map((cat) => {
        const catCandidates = candidates
          .filter((c) => c.category === cat)
          .sort((a, b) => {
            if (!a.mp3_url && b.mp3_url) return -1
            if (a.mp3_url && !b.mp3_url) return 1
            return a.last_name.localeCompare(b.last_name)
          })
        const catReceived = catCandidates.filter((c) => c.mp3_url).length

        return (
          <div key={cat} className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2545]">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base">{cat}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                catReceived === catCandidates.length
                  ? 'bg-[#7ec850]/15 border-[#7ec850]/25 text-[#7ec850]'
                  : 'bg-[#f5a623]/15 border-[#f5a623]/25 text-[#f5a623]'
              }`}>
                {catReceived} / {catCandidates.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-[10px] uppercase tracking-wider border-b border-[#2a2545]">
                    <th className="px-4 py-2 text-left">Candidat</th>
                    <th className="px-3 py-2 text-left">Chanson</th>
                    <th className="px-3 py-2 text-center">Statut</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catCandidates.map((c) => {
                    const hasMp3 = !!c.mp3_url
                    const isUploadExpanded = expandedUpload === c.id
                    const isReminderSent = reminderSent.has(c.id)

                    return (
                      <Fragment key={c.id}>
                        <tr className={`border-b border-[#2a2545]/50 ${!hasMp3 ? 'bg-red-500/[0.03]' : ''}`}>
                          {/* Candidate */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#1a1533]">
                                {c.photo_url ? (
                                  <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">🎤</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white/80 font-medium text-xs truncate">{displayName(c)}</p>
                                <p className="text-white/20 text-[10px] truncate">{c.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Song */}
                          <td className="px-3 py-3">
                            <p className="text-white/50 text-xs truncate">{c.song_title}</p>
                            <p className="text-white/20 text-[10px] truncate">{c.song_artist}</p>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 text-center">
                            {hasMp3 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7ec850]/15 text-[#7ec850] border border-[#7ec850]/25">
                                Reçu
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                                Manquant
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {hasMp3 ? (
                                <audio controls className="h-7 w-36">
                                  <source src={c.mp3_url!} type="audio/mpeg" />
                                </audio>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSendReminder(c.id)}
                                    disabled={reminderSending !== null || isReminderSent}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                      isReminderSent
                                        ? 'bg-[#7ec850]/15 border border-[#7ec850]/25 text-[#7ec850]'
                                        : 'bg-[#f5a623]/15 border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a623]/25'
                                    }`}
                                  >
                                    {reminderSending === c.id ? '...' : isReminderSent ? 'Envoyé' : 'Relancer'}
                                  </button>
                                  <button
                                    onClick={() => setExpandedUpload(isUploadExpanded ? null : c.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#e91e8c]/15 border border-[#e91e8c]/30 text-[#e91e8c] hover:bg-[#e91e8c]/25 transition-colors"
                                  >
                                    {isUploadExpanded ? 'Fermer' : 'Uploader'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded upload zone */}
                        {isUploadExpanded && (
                          <tr className="border-b border-[#2a2545]/50">
                            <td colSpan={4} className="px-5 py-4 bg-white/[0.01]">
                              <div className="max-w-md mx-auto flex items-center gap-3">
                                <input
                                  type="file"
                                  accept=".mp3,audio/mpeg"
                                  className="text-xs text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#e91e8c]/30 file:bg-[#e91e8c]/10 file:text-[#e91e8c] file:text-xs file:font-bold file:cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleAdminUpload(c.id, file)
                                  }}
                                  disabled={uploadingId === c.id}
                                />
                                {uploadingId === c.id && (
                                  <span className="text-white/40 text-xs animate-pulse">Upload en cours…</span>
                                )}
                                {uploadError && expandedUpload === c.id && (
                                  <span className="text-red-400 text-xs">{uploadError}</span>
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
        )
      })}
    </div>
  )
}
