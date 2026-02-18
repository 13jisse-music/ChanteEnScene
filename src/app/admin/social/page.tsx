'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  name: string
  slug: string
}

interface PreviewPost {
  type: string
  label: string
  message: string
  link?: string
  suggested_image_prompt?: string
}

interface CalendarEntry {
  date: string
  type: string
  label: string
  daysUntil: number
}

export default function SocialAdminPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState('')

  // Preview + Calendrier
  const [previews, setPreviews] = useState<PreviewPost[]>([])
  const [calendar, setCalendar] = useState<CalendarEntry[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<PreviewPost | null>(null)

  // Publication sociale
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [link, setLink] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [socialResult, setSocialResult] = useState<string | null>(null)

  // Push notification
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [pushUrl, setPushUrl] = useState('')
  const [pushRole, setPushRole] = useState<'all' | 'public' | 'jury'>('all')
  const [sending, setSending] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)

  // Copie prompt
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sessions')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setSessions(data)
          setSessionId(data[0].id)
        }
      })
  }, [])

  // Charger les previews au montage
  useEffect(() => {
    loadPreviews()
  }, [])

  async function loadPreviews() {
    setLoadingPreviews(true)
    try {
      const res = await fetch('/api/admin/social-preview')
      const data = await res.json()
      setPreviews(data.posts || [])
      setCalendar(data.calendar || [])
    } catch {
      setPreviews([])
      setCalendar([])
    } finally {
      setLoadingPreviews(false)
    }
  }

  function usePreview(post: PreviewPost) {
    setSelectedPreview(post)
    setMessage(post.message)
    setLink(post.link || '')
    setImageUrl('')
    setSocialResult(null)
    // Scroll vers le formulaire de publication
    document.getElementById('publish-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function copyPrompt(prompt: string, type: string) {
    await navigator.clipboard.writeText(prompt)
    setCopiedPrompt(type)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  // ─── Publication FB + IG ──────────────────────────────
  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setPublishing(true)
    setSocialResult(null)
    try {
      const res = await fetch('/api/admin/social-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          image_url: imageUrl.trim() || undefined,
          link: link.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setSocialResult(`Erreur : ${data.error}`)
      } else {
        const fbStatus = data.facebook?.id
          ? `OK`
          : data.facebook?.error || 'non publié'
        const igStatus = data.instagram?.id
          ? `OK`
          : data.instagram?.error || 'pas d\'image fournie'
        setSocialResult(`Facebook: ${fbStatus}\nInstagram: ${igStatus}`)
        setSelectedPreview(null)
      }
    } catch {
      setSocialResult('Erreur réseau')
    } finally {
      setPublishing(false)
    }
  }

  // ─── Push Notification ────────────────────────────────
  async function handlePush(e: React.FormEvent) {
    e.preventDefault()
    if (!pushTitle.trim() || !pushBody.trim() || !sessionId) return

    setSending(true)
    setPushResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          role: pushRole,
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
      } else {
        setPushResult(
          `Envoyé : ${data.sent} | Échoué : ${data.failed} | Expiré : ${data.expired}`
        )
        setPushTitle('')
        setPushBody('')
        setPushUrl('')
      }
    } catch {
      setPushResult('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'w-full bg-[#0d0b1a] border border-[#2a2545] rounded-xl p-3 text-white placeholder:text-white/20 focus:border-[#e91e8c] focus:outline-none'

  const TYPE_COLORS: Record<string, string> = {
    new_candidate_welcome: 'bg-green-500/20 text-green-300 border-green-500/30',
    new_candidates_welcome: 'bg-green-500/20 text-green-300 border-green-500/30',
    new_candidates_wave: 'bg-green-500/20 text-green-300 border-green-500/30',
    countdown_registration_close: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    countdown_semifinal: 'bg-red-500/20 text-red-300 border-red-500/30',
    countdown_final: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    voting_reminder: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    countdown_voting_close: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    weekly_promo: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-2">Communication</h1>
      <p className="text-white/50 mb-6 sm:mb-8">
        Prévisualisez, personnalisez et publiez sur Facebook, Instagram et en push.
      </p>

      {/* ── Prévisualisation des posts ── */}
      <div className="bg-[#1a1232] rounded-2xl p-6 mb-8 border border-[#2a2545]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">👁️</span> Posts suggérés
          </h2>
          <button
            onClick={loadPreviews}
            disabled={loadingPreviews}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            {loadingPreviews ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        <p className="text-white/40 text-sm mb-4">
          Voici les posts que le cron pourrait publier selon l&apos;état actuel du concours.
          Cliquez sur un post pour le personnaliser avant publication.
        </p>

        {loadingPreviews ? (
          <div className="text-white/30 text-sm py-8 text-center">Chargement des suggestions...</div>
        ) : previews.length === 0 ? (
          <div className="text-white/30 text-sm py-8 text-center">
            Aucun post suggéré pour le moment (pas de session active ou pas de candidats).
          </div>
        ) : (
          <div className="space-y-3">
            {previews.map((post) => (
              <div
                key={post.type}
                className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                  selectedPreview?.type === post.type
                    ? 'ring-2 ring-[#e91e8c] border-[#e91e8c]/50'
                    : 'border-[#2a2545] hover:border-[#3a3565]'
                }`}
                onClick={() => usePreview(post)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      TYPE_COLORS[post.type] || 'bg-white/10 text-white/50 border-white/20'
                    }`}
                  >
                    {post.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      usePreview(post)
                    }}
                    className="text-xs text-[#e91e8c] hover:text-[#ff3da5] whitespace-nowrap"
                  >
                    Utiliser ce post →
                  </button>
                </div>
                <p className="text-sm text-white/70 whitespace-pre-line line-clamp-3">
                  {post.message}
                </p>
                {post.suggested_image_prompt && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyPrompt(post.suggested_image_prompt!, post.type)
                    }}
                    className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                  >
                    <span>🎨</span>
                    {copiedPrompt === post.type
                      ? 'Prompt copié !'
                      : 'Copier le prompt image pour ChatGPT'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Calendrier des prochaines publications ── */}
      {calendar.length > 0 && (
        <div className="bg-[#1a1232]/60 rounded-2xl p-5 mb-8 border border-[#2a2545]/60">
          <h2 className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2">
            <span>📅</span> Prochaines publications automatiques
          </h2>
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {calendar.map((entry, i) => {
              const d = new Date(entry.date + 'T00:00:00')
              const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' })
              const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              return (
                <div key={`${entry.type}-${entry.date}-${i}`} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-white/[0.02]">
                  <span className="text-white/25 text-xs w-20 shrink-0">
                    <span className="capitalize">{dayName}</span> {dateStr}
                  </span>
                  <span className="text-white/15 text-xs w-16 shrink-0 text-right">
                    {entry.daysUntil === 1 ? 'demain' : `J-${entry.daysUntil}`}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                      TYPE_COLORS[entry.type] || 'bg-white/10 text-white/50 border-white/20'
                    }`}
                  >
                    {entry.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
            <p className="text-white/25 text-[10px] font-medium">Publications conditionnelles (non planifiables) :</p>
            <p className="text-white/15 text-[10px]">
              🎤 <span className="text-green-400/40">Bienvenue candidat</span> — publié automatiquement quand un candidat s&apos;inscrit (priorité max)
            </p>
            <p className="text-white/15 text-[10px]">
              🗳️ <span className="text-purple-400/40">Rappel de vote</span> — chaque jeudi (quand les votes sont ouverts)
            </p>
            <p className="text-white/15 text-[10px]">
              📢 <span className="text-blue-400/40">Promo hebdo</span> — chaque lundi (quand les inscriptions/compétition sont ouvertes)
            </p>
          </div>
          <p className="text-white/15 text-[10px] mt-2">
            Le cron publie 1 post/jour max. Si plusieurs posts sont prévus le même jour, le plus prioritaire est publié.
          </p>
        </div>
      )}

      {/* ── Publication FB + IG ── */}
      <div id="publish-section" className="bg-[#1a1232] rounded-2xl p-6 mb-8 border border-[#2a2545]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">📣</span> Publication Facebook / Instagram
          {selectedPreview && (
            <span className="text-xs text-[#e91e8c] font-normal ml-2">
              — {selectedPreview.label}
            </span>
          )}
        </h2>
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder="Votre message pour Facebook et Instagram..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">
              URL image (optionnel, requis pour Instagram)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className={inputClass}
              placeholder="Collez l'URL de l'image générée par ChatGPT..."
            />
            {imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[#2a2545] max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Aperçu" className="w-full h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
            <p className="text-xs text-white/30 mt-1">
              Astuce : Générez une image avec ChatGPT/DALL-E, uploadez-la sur imgur.com ou postimg.cc, puis collez le lien ici.
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">
              Lien (optionnel, pour Facebook)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={inputClass}
              placeholder="https://chantenscene.fr/..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={publishing || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {publishing ? 'Publication...' : 'Publier sur FB + IG'}
            </button>
            {selectedPreview && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPreview(null)
                  setMessage('')
                  setImageUrl('')
                  setLink('')
                  setSocialResult(null)
                }}
                className="text-white/40 hover:text-white/70 text-sm px-4"
              >
                Annuler
              </button>
            )}
          </div>

          {socialResult && (
            <div
              className={`mt-3 p-3 rounded-xl border text-sm whitespace-pre-wrap ${
                socialResult.startsWith('Erreur')
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : 'bg-green-500/10 border-green-500/20 text-green-300'
              }`}
            >
              {socialResult}
            </div>
          )}
        </form>
      </div>

      {/* ── Push Notifications ── */}
      <div className="bg-[#1a1232] rounded-2xl p-6 mb-8 border border-[#2a2545]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">🔔</span> Notification push
        </h2>
        <form onSubmit={handlePush} className="space-y-4">
          {sessions.length > 1 && (
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

          <div>
            <label className="block text-sm text-white/60 mb-1">Titre *</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className={inputClass}
              placeholder="ChanteEnScene"
              required
            />
          </div>

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

          <div>
            <label className="block text-sm text-white/60 mb-1">Destinataires</label>
            <div className="flex gap-3">
              {[
                { value: 'all', label: 'Tout le monde' },
                { value: 'public', label: 'Public' },
                { value: 'jury', label: 'Jury' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPushRole(opt.value as typeof pushRole)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    pushRole === opt.value
                      ? 'bg-[#e91e8c] text-white'
                      : 'bg-[#0d0b1a] border border-[#2a2545] text-white/50 hover:text-white/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !pushTitle.trim() || !pushBody.trim() || !sessionId}
            className="bg-[#e91e8c] hover:bg-[#d11a7d] disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {sending ? 'Envoi en cours...' : 'Envoyer la notification'}
          </button>

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
    </div>
  )
}
