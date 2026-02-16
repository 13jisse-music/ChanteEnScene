'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import { useRealtimeLiveVotes } from '@/hooks/useRealtimeLiveVotes'
import { useWinnerReveal } from '@/hooks/useWinnerReveal'
import WinnerReveal from '@/components/WinnerReveal'
import WinnerCountdown from '@/components/WinnerCountdown'
import ShareButtons from '@/components/ShareButtons'
import EmailSubscribeForm from '@/components/EmailSubscribeForm'
import PushNotificationManager from '@/components/PushNotificationManager'
import LivePhotoCapture from '@/components/LivePhotoCapture'

interface LiveEvent {
  id: string
  event_type: string
  status: string
  current_candidate_id: string | null
  current_category: string | null
  is_voting_open: boolean
  winner_candidate_id?: string | null
  winner_revealed_at?: string | null
}

interface LineupCandidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string
  song_artist: string
  accent_color: string
  bio: string | null
}

interface LineupItem {
  id: string
  candidate_id: string
  position: number
  status: string
  candidates: LineupCandidate
}

interface Props {
  liveEvent: LiveEvent
  lineup: LineupItem[]
  sessionId: string
  slug: string
  sessionName: string
}

const EVENT_LABELS: Record<string, string> = { semifinal: 'Demi-finale', final: 'Grande Finale' }

export default function LiveView({ liveEvent: initialEvent, lineup, sessionId, slug, sessionName }: Props) {
  const event = useRealtimeEvent(initialEvent)
  const { getVotesFor } = useRealtimeLiveVotes(initialEvent.id)
  const { winner, phase, completeCountdown, dismiss } = useWinnerReveal(event)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [votingFor, setVotingFor] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState(`/${slug}/live`)

  const currentItem = lineup.find((l) => l.candidate_id === event.current_candidate_id)

  // Finalists in the current category — used for the countdown coin animation
  const countdownFinalists = useMemo(() => {
    const cat = event.current_category
    const items = cat ? lineup.filter((l) => l.candidates.category === cat) : lineup
    return items.map((l) => ({
      id: l.candidate_id,
      name: l.candidates.stage_name || `${l.candidates.first_name} ${l.candidates.last_name}`,
      photo: l.candidates.photo_url,
    }))
  }, [lineup, event.current_category])

  // Find next candidate
  const currentIdx = lineup.findIndex((l) => l.candidate_id === event.current_candidate_id)
  const nextItem = lineup.find((l, i) => i > currentIdx && l.status === 'pending')

  // Set share URL on client to avoid hydration mismatch
  useEffect(() => {
    setShareUrl(window.location.href)
  }, [])
  const currentName = currentItem
    ? currentItem.candidates.stage_name || `${currentItem.candidates.first_name} ${currentItem.candidates.last_name}`
    : sessionName

  // Check existing live votes
  useEffect(() => {
    async function check() {
      try {
        const fp = await getFingerprint()
        const supabase = createClient()
        const { data } = await supabase
          .from('live_votes')
          .select('candidate_id')
          .eq('live_event_id', event.id)
          .eq('fingerprint', fp)
        if (data) setVotedIds(new Set(data.map((v) => v.candidate_id)))
      } catch {
        // ignore
      }
    }
    check()
  }, [event.id])

  async function handleVote(candidateId: string) {
    if (votedIds.has(candidateId) || votingFor) return
    setVotingFor(candidateId)
    try {
      const fp = await getFingerprint()
      const supabase = createClient()
      const { error } = await supabase.from('live_votes').insert({
        live_event_id: event.id,
        candidate_id: candidateId,
        fingerprint: fp,
      })
      if (!error) {
        setVotedIds((prev) => new Set([...prev, candidateId]))
      }
    } catch {
      // ignore
    } finally {
      setVotingFor(null)
    }
  }

  const hasVoted = currentItem ? votedIds.has(currentItem.candidate_id) : false
  const voteCount = currentItem ? getVotesFor(currentItem.candidate_id) : 0

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Winner countdown overlay — 3D spinning coin with finalist photos */}
      {phase === 'countdown' && (
        <WinnerCountdown
          finalists={countdownFinalists}
          winnerId={event.winner_candidate_id || null}
          onComplete={completeCountdown}
        />
      )}

      {/* Winner reveal overlay (after countdown) */}
      {phase === 'revealed' && winner && (
        <WinnerReveal
          candidateName={winner.name}
          candidatePhoto={winner.photo}
          category={winner.category}
          onDismiss={dismiss}
        />
      )}

      {/* Status banner */}
      <div className="text-center">
        {event.status === 'live' ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-bold">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            {EVENT_LABELS[event.event_type]} — EN DIRECT
          </div>
        ) : event.status === 'pending' ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] text-sm font-bold">
            <span className="w-2.5 h-2.5 bg-[#e91e8c] rounded-full animate-pulse" />
            {EVENT_LABELS[event.event_type]} — Commence bientôt
          </div>
        ) : event.status === 'paused' ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-sm">
            ⏸ {EVENT_LABELS[event.event_type]} — En pause
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] text-sm font-bold">
            🎉 {EVENT_LABELS[event.event_type]} — Terminée
          </div>
        )}
      </div>

      {/* Current performer */}
      {currentItem ? (
        <div className="bg-[#1a1232] border-2 border-[#e91e8c]/30 rounded-2xl p-6 text-center shadow-lg space-y-4">
          {/* Large photo */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-[#e91e8c]/30 shadow-xl shadow-[#e91e8c]/10">
            {currentItem.candidates.photo_url ? (
              <img
                src={currentItem.candidates.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#161228] flex items-center justify-center text-5xl text-white/20">🎤</div>
            )}
          </div>

          {/* Name */}
          <h2 className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-white">
            {currentItem.candidates.stage_name ||
              `${currentItem.candidates.first_name} ${currentItem.candidates.last_name}`}
          </h2>

          {/* Category badge */}
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#e91e8c]/15 text-[#e91e8c] border border-[#e91e8c]/25">
            {currentItem.candidates.category}
          </span>

          {/* Song */}
          <p className="text-white/50 text-sm">
            🎵 {currentItem.candidates.song_title} — {currentItem.candidates.song_artist}
          </p>

          {/* Bio */}
          {currentItem.candidates.bio && (
            <p className="text-white/40 text-sm leading-relaxed line-clamp-3 max-w-sm mx-auto">
              {currentItem.candidates.bio}
            </p>
          )}

          {/* Actions: vote + reporter */}
          {event.is_voting_open ? (
            <div className="space-y-3">
              {!hasVoted ? (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <button
                    onClick={() => handleVote(currentItem.candidate_id)}
                    disabled={votingFor !== null}
                    className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 active:scale-[0.98] transition-all"
                  >
                    {votingFor ? '...' : '🤍 Je soutiens !'}
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById('live-photo-capture')
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="w-full py-3 rounded-xl text-sm font-medium border border-[#2a2545] text-white/50 hover:bg-white/5 transition-all md:hidden"
                  >
                    📸 ou passez en mode reporter
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="py-4 rounded-2xl bg-[#7ec850]/15 text-[#7ec850] border border-[#7ec850]/30 text-center font-bold text-lg">
                    ❤️ Merci pour votre soutien !
                  </div>
                  <button
                    onClick={() => {
                      const el = document.getElementById('live-photo-capture')
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="w-full py-3.5 rounded-xl text-sm font-bold border-2 border-[#e91e8c]/40 text-[#e91e8c] hover:bg-[#e91e8c]/10 transition-all md:hidden"
                  >
                    📸 Passez en mode reporter !
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#f5a623]/10 border border-[#f5a623]/25 rounded-xl p-4">
                <p className="text-[#f5a623] text-sm font-medium">Performance en cours...</p>
                <p className="text-white/30 text-xs mt-1">Le vote s&apos;ouvrira après la prestation</p>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('live-photo-capture')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full py-3.5 rounded-xl text-sm font-bold border-2 border-[#e91e8c]/40 text-[#e91e8c] hover:bg-[#e91e8c]/10 transition-all md:hidden"
              >
                📸 Prenez des photos de la prestation !
              </button>
            </div>
          )}
        </div>
      ) : (
        /* No performer on stage */
        <div className="bg-[#1a1232] border border-[#2e2555] rounded-2xl p-10 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#e91e8c]/10 flex items-center justify-center">
            <span className="text-4xl animate-pulse">🎤</span>
          </div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
            {event.status === 'pending'
              ? 'La soirée va bientôt commencer !'
              : 'En attente du prochain artiste...'}
          </h2>
          <p className="text-white/30 text-sm">
            {event.status === 'pending'
              ? 'Restez connecté, la page se mettra à jour automatiquement.'
              : "L'artiste apparaîtra ici dès qu'il montera sur scène."}
          </p>
        </div>
      )}

      {/* Crowd photo capture — mobile only, visible whenever candidate is on stage */}
      {currentItem && event.status === 'live' && (
        <div id="live-photo-capture" className="md:hidden">
          <LivePhotoCapture
            sessionId={sessionId}
            liveEventId={event.id}
            currentCandidateId={currentItem.candidate_id}
            currentCandidateName={
              currentItem.candidates.stage_name ||
              `${currentItem.candidates.first_name} ${currentItem.candidates.last_name}`
            }
          />
        </div>
      )}

      {/* Next up */}
      {nextItem && currentItem && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1a1232] overflow-hidden shrink-0">
            {nextItem.candidates.photo_url ? (
              <img src={nextItem.candidates.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">🎤</div>
            )}
          </div>
          <p className="text-white/40 text-sm">
            À suivre : <span className="text-white/60 font-medium">
              {nextItem.candidates.stage_name || `${nextItem.candidates.first_name} ${nextItem.candidates.last_name}`}
            </span>
          </p>
        </div>
      )}

      {/* Share buttons */}
      {currentItem && (
        <div className="space-y-2">
          <p className="text-white/30 text-xs text-center uppercase tracking-wider">Partagez</p>
          <ShareButtons candidateName={currentName} shareUrl={shareUrl} />
        </div>
      )}

      {/* Email subscribe */}
      <EmailSubscribeForm sessionId={sessionId} />

      {/* Push notification prompt */}
      <PushNotificationManager sessionId={sessionId} />
    </div>
  )
}
