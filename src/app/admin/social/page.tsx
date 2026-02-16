'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  name: string
  slug: string
}

export default function SocialAdminPage() {
  // Sessions
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState('')

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

  // Cron
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

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
          ? `OK (${data.facebook.id})`
          : data.facebook?.error || 'non publié'
        const igStatus = data.instagram?.id
          ? `OK (${data.instagram.id})`
          : data.instagram?.error || 'pas d\'image fournie'
        setSocialResult(`Facebook: ${fbStatus}\nInstagram: ${igStatus}`)
        setMessage('')
        setImageUrl('')
        setLink('')
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

  // ─── Test Cron ────────────────────────────────────────
  async function handleTestCron() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/cron/social-post')
      const data = await res.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch {
      setTestResult('Erreur réseau')
    } finally {
      setTesting(false)
    }
  }

  const inputClass =
    'w-full bg-[#0d0b1a] border border-[#2a2545] rounded-xl p-3 text-white placeholder:text-white/20 focus:border-[#e91e8c] focus:outline-none'

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Communication</h1>
      <p className="text-white/50 mb-8">
        Envoyez des notifications push et publiez sur Facebook / Instagram.
      </p>

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
              placeholder="https://chanteenscene.fr/saison-2025/candidats"
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

      {/* ── Publication FB + IG ── */}
      <div className="bg-[#1a1232] rounded-2xl p-6 mb-8 border border-[#2a2545]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">📣</span> Publication Facebook / Instagram
        </h2>
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
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
              placeholder="https://..."
            />
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
              placeholder="https://chanteenscene.fr/..."
            />
          </div>

          <button
            type="submit"
            disabled={publishing || !message.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {publishing ? 'Publication en cours...' : 'Publier sur FB + IG'}
          </button>

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

      {/* ── Cron automatique ── */}
      <div className="bg-[#1a1232] rounded-2xl p-6 border border-[#2a2545]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">🤖</span> Posts automatiques (cron)
        </h2>
        <p className="text-white/50 text-sm mb-4">
          Le cron s&apos;exécute chaque jour à 9h. Il génère des posts selon l&apos;état du
          concours (countdown, nouveaux candidats, rappel de vote...).
        </p>

        <button
          onClick={handleTestCron}
          disabled={testing}
          className="bg-[#2a2545] hover:bg-[#3a3565] disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {testing ? 'Exécution...' : 'Tester le cron maintenant'}
        </button>

        {testResult && (
          <pre className="mt-3 p-3 rounded-xl bg-[#0d0b1a] border border-[#2a2545] text-xs text-white/60 overflow-auto max-h-60 whitespace-pre-wrap">
            {testResult}
          </pre>
        )}
      </div>
    </div>
  )
}
