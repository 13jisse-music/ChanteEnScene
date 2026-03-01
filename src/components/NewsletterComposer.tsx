'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  createCampaignWithSections,
  deleteCampaign,
  sendTestCampaign,
  sendCampaign,
} from '@/app/admin/newsletter/actions'

// ─── Types ───

type Section = {
  label: string
  title: string
  body: string
  imageUrl: string | null
  imagePrompt: string
  color: string
  ctaText: string | null
  ctaUrl: string | null
}

type Campaign = {
  id: string
  subject: string
  body: string
  image_url: string | null
  sections: Section[] | null
  tone: string | null
  themes: string[] | null
  status: string
  target: string
  total_recipients: number
  total_sent: number
  total_errors: number
  created_at: string
  sent_at: string | null
}

type SubscriberCounts = { total: number; voluntary: number; legacy: number }
type Target = 'all' | 'voluntary' | 'legacy'

// ─── Constants ───

const TONES: { id: string; label: string; emoji: string }[] = [
  { id: 'decale', label: 'Décalé / Humour', emoji: '😄' },
  { id: 'pro', label: 'Professionnel', emoji: '💼' },
  { id: 'chaleureux', label: 'Chaleureux', emoji: '🤗' },
  { id: 'urgence', label: 'Urgence', emoji: '🚨' },
  { id: 'inspirant', label: 'Inspirant', emoji: '✨' },
]

const HEADER_EMOJIS = [
  '🎤', '🎵', '🎶', '🎸', '🎹', '🎺', '🥁', '🎷',
  '🎼', '🎧', '🔥', '⭐', '✨', '💫', '🌟', '❤️',
  '💜', '💛', '🩷', '🧡', '💙', '🤩', '😍', '🥳',
  '🎉', '🎊', '🏆', '👑', '🎬', '📣', '📢', '💪',
  '👏', '🙌', '🤘', '✌️', '🎯', '💎', '🌹', '🦋',
  '☀️', '🌈', '🍾', '🥂', '📸', '🎭', '💃', '🕺',
]

const TARGET_LABELS: Record<Target, string> = {
  all: 'Tous les abonnés',
  voluntary: 'Abonnés volontaires',
  legacy: 'Anciens participants',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-white/10', text: 'text-white/60', label: 'Brouillon' },
  generating: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Génération...' },
  sending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Envoi...' },
  sent: { bg: 'bg-[#7ec850]/20', text: 'text-[#7ec850]', label: 'Envoyé' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Échec' },
}

type Step = 'themes' | 'compose' | 'edit' | 'preview'

// ─── Component ───

export default function NewsletterComposer({
  sessionId,
  campaigns: initialCampaigns,
  counts,
  sessionContext,
}: {
  sessionId: string
  campaigns: Campaign[]
  counts: SubscriberCounts
  sessionContext?: string
}) {
  // State: step
  const [step, setStep] = useState<Step>('themes')

  // State: theme selection
  const [suggestedThemes, setSuggestedThemes] = useState<{ title: string; description: string }[]>([])
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [customTheme, setCustomTheme] = useState('')
  const [tone, setTone] = useState('decale')

  // State: composition
  const [subject, setSubject] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [headerImageUrl, setHeaderImageUrl] = useState('')
  const [target, setTarget] = useState<Target>('all')

  // State: UI
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null)
  const [quotaRetryIn, setQuotaRetryIn] = useState(0)
  const [showOpenAIConfirm, setShowOpenAIConfirm] = useState<'suggest' | 'compose' | null>(null)

  // State: header composer (magazine style)
  const [headerPhoto, setHeaderPhoto] = useState<string | null>(null)
  const [headerLine1, setHeaderLine1] = useState('')
  const [headerLine2, setHeaderLine2] = useState('')
  const [headerEmoji, setHeaderEmoji] = useState('')
  const [headerBanner, setHeaderBanner] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const pendingDalleRef = useRef<number | null>(null)

  const recipientCount = target === 'all' ? counts.total : target === 'voluntary' ? counts.voluntary : counts.legacy

  // Auto-compose header image when composer inputs change
  useEffect(() => {
    if (!headerPhoto) return
    const img = new Image()
    img.onload = () => {
      const result = composeHeaderImage(img, headerLine1, headerLine2, headerEmoji, headerBanner)
      setHeaderImageUrl(result)
    }
    img.src = headerPhoto
  }, [headerPhoto, headerLine1, headerLine2, headerEmoji, headerBanner])

  // ─── Handlers ───

  const handleSuggestThemes = useCallback(async (useOpenAI = false) => {
    setLoading('suggest')
    setMessage(null)
    setShowOpenAIConfirm(null)
    try {
      const res = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          context: sessionContext,
          siteInfo: { url: 'https://chantenscene.fr', name: 'ChanteEnScène' },
          useOpenAI,
        }),
      })
      const data = await res.json()
      if (data.themes) {
        setSuggestedThemes(data.themes)
        if (data.provider) setMessage({ type: 'success', text: `Généré via ${data.provider}` })
      } else if (data.error === 'quota_exhausted') {
        setQuotaRetryIn(data.retryIn || 60)
        setShowOpenAIConfirm('suggest')
        // Start countdown
        const start = data.retryIn || 60
        let remaining = start
        const timer = setInterval(() => {
          remaining--
          setQuotaRetryIn(remaining)
          if (remaining <= 0) clearInterval(timer)
        }, 1000)
      } else {
        const msg = data.error === 'quota_exhausted' ? 'Quota IA épuisé, réessayez plus tard' : (data.error || 'Erreur')
        setMessage({ type: 'error', text: msg })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' })
    }
    setLoading('')
  }, [sessionContext])

  const handleToggleTheme = (title: string) => {
    setSelectedThemes((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  const handleAddCustomTheme = () => {
    if (customTheme.trim()) {
      setSelectedThemes((prev) => [...prev, customTheme.trim()])
      setCustomTheme('')
    }
  }

  const handleCompose = useCallback(async (useOpenAI = false) => {
    if (selectedThemes.length === 0) {
      setMessage({ type: 'error', text: 'Sélectionne au moins un thème' })
      return
    }
    setLoading('compose')
    setMessage(null)
    setShowOpenAIConfirm(null)
    try {
      const res = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compose',
          themes: selectedThemes,
          tone,
          context: sessionContext,
          siteInfo: { url: 'https://chantenscene.fr', name: 'ChanteEnScène' },
          useOpenAI,
        }),
      })
      const data = await res.json()
      if (data.sections) {
        setSubject(data.subject || '')
        setSections(data.sections)
        setStep('edit')
        if (data.provider) setMessage({ type: 'success', text: `Généré via ${data.provider}` })
      } else if (data.error === 'quota_exhausted') {
        setQuotaRetryIn(data.retryIn || 60)
        setShowOpenAIConfirm('compose')
        const start = data.retryIn || 60
        let remaining = start
        const timer = setInterval(() => {
          remaining--
          setQuotaRetryIn(remaining)
          if (remaining <= 0) clearInterval(timer)
        }, 1000)
      } else {
        const msg = data.error === 'quota_exhausted' ? 'Quota IA épuisé, réessayez plus tard' : (data.error || 'Erreur de génération')
        setMessage({ type: 'error', text: msg })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' })
    }
    setLoading('')
  }, [selectedThemes, tone, sessionContext])

  const handleGenerateImage = useCallback(async (index: number, provider: 'gemini' | 'dalle' = 'gemini') => {
    const section = sections[index]
    if (!section.imagePrompt) return

    setLoading(`img-${index}`)
    setMessage(null)
    try {
      const res = await fetch('/api/newsletter/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: section.imagePrompt, provider }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        // Resize base64 images to 600px wide for consistent newsletter layout
        const finalUrl = data.imageUrl.startsWith('data:')
          ? await resizeImageToWidth(data.imageUrl, 600)
          : data.imageUrl
        setSections((prev) => {
          const next = [...prev]
          next[index] = { ...next[index], imageUrl: finalUrl }
          return next
        })
        setMessage({ type: 'success', text: `Image générée via ${data.provider === 'dalle' ? 'DALL-E (~0.04$)' : 'Gemini (gratuit)'}` })
      } else if (data.error === 'quota_exhausted' || res.status === 429) {
        // Gemini quota exhausted — auto-fallback to DALL-E if available
        if (data.hasDalle && provider !== 'dalle') {
          setMessage({ type: 'success', text: 'Quota Gemini épuisé — bascule auto vers DALL-E...' })
          setLoading('')
          // Auto-retry with DALL-E
          return handleGenerateImage(index, 'dalle')
        }
        setMessage({
          type: 'error',
          text: `Quota Gemini Image épuisé (réessayer dans ${data.retryIn || 60}s). Aucun fallback DALL-E disponible.`,
        })
      } else {
        // Translate raw error codes to user-friendly messages
        const errorMap: Record<string, string> = {
          'quota_exhausted': 'Quota IA épuisé, réessayez plus tard',
          'Erreur DALL-E': 'Erreur lors de la génération DALL-E',
        }
        const friendlyMsg = errorMap[data.error] || data.error || 'Impossible de générer l\'image'
        setMessage({ type: 'error', text: friendlyMsg })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' })
    }
    setLoading('')
  }, [sections])

  const handleImageUpload = (index: number, file: File, raw = false) => {
    const section = sections[index]
    const reader = new FileReader()
    reader.onload = () => {
      if (raw) {
        // Import brut : juste resize pour l'email (600px max), pas d'overlay
        const img = new Image()
        img.onload = () => {
          const processed = processImageForNewsletter(img, '', '', '', tone)
          setSections((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], imageUrl: processed }
            return next
          })
        }
        img.src = reader.result as string
      } else {
        // Import avec overlay titre
        const img = new Image()
        img.onload = () => {
          const processed = processImageForNewsletter(img, section.title, section.label, section.color, tone)
          setSections((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], imageUrl: processed }
            return next
          })
        }
        img.src = reader.result as string
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSectionEdit = (index: number, field: keyof Section, value: string | null) => {
    setSections((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveSection = (index: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return next
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      setMessage({ type: 'error', text: 'Sujet requis' })
      return
    }
    setLoading('save')
    setMessage(null)

    const bodyFallback = sections.map((s) => `${s.label}\n${s.title}\n\n${s.body}`).join('\n\n---\n\n')

    const result = await createCampaignWithSections(
      sessionId,
      subject,
      bodyFallback,
      headerImageUrl || null,
      target,
      sections,
      tone,
      selectedThemes
    )

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Brouillon sauvegardé !' })
      setStep('themes')
      setSubject('')
      setSections([])
      setSelectedThemes([])
      setSuggestedThemes([])
      setHeaderImageUrl('')
      setHeaderPhoto(null)
      setHeaderLine1('')
      setHeaderLine2('')
      setHeaderEmoji('')
      setHeaderBanner('')
      window.location.reload()
    }
    setLoading('')
  }

  const handleSendTest = async (campaignId: string) => {
    setLoading(`test-${campaignId}`)
    setMessage(null)
    const result = await sendTestCampaign(campaignId)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Email test envoyé ! Vérifiez votre boîte.' })
    }
    setLoading('')
  }

  const handleSend = async (campaignId: string) => {
    setLoading(`send-${campaignId}`)
    setMessage(null)
    setConfirmSendId(null)
    const result = await sendCampaign(campaignId)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: `Envoyé à ${result.sent} destinataires (${result.errors} erreur${(result.errors ?? 0) > 1 ? 's' : ''})` })
      window.location.reload()
    }
    setLoading('')
  }

  const handleDelete = async (campaignId: string) => {
    setLoading(`del-${campaignId}`)
    const result = await deleteCampaign(campaignId)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
    }
    setLoading('')
  }

  // ─── Render ───

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">📧</span>
          <div>
            <h1 className="text-2xl font-bold text-white">MailForge</h1>
            <p className="text-white/40 text-sm">
              {counts.total} abonné{counts.total > 1 ? 's' : ''} ({counts.voluntary} volontaires, {counts.legacy} anciens)
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${
          message.type === 'success'
            ? 'bg-[#7ec850]/10 border border-[#7ec850]/30 text-[#7ec850]'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Quota exhausted banner */}
      {showOpenAIConfirm && (
        <div className="bg-[#161228] border border-[#f59e0b]/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">⏳</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#f59e0b]">Quota Gemini épuisé</p>
              <p className="text-xs text-white/40">
                Les modèles gratuits sont temporairement indisponibles.
              </p>
            </div>
          </div>

          {/* Countdown progress bar */}
          {quotaRetryIn > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-[#2a2545] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f59e0b] to-[#7ec850] rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(0, 100 - (quotaRetryIn / 60) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/30 text-center">
                Réessai automatique dans <span className="text-[#f59e0b] font-mono font-bold">{quotaRetryIn}s</span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {/* Retry Gemini button (enabled when countdown reaches 0) */}
            <button
              onClick={() => {
                setShowOpenAIConfirm(null)
                if (showOpenAIConfirm === 'suggest') handleSuggestThemes()
                else handleCompose()
              }}
              disabled={quotaRetryIn > 0 || !!loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-30
                border-[#7ec850]/30 text-[#7ec850] hover:bg-[#7ec850]/10"
            >
              {quotaRetryIn > 0 ? `Gemini dans ${quotaRetryIn}s` : 'Réessayer Gemini (gratuit)'}
            </button>

            {/* OpenAI fallback button */}
            <button
              onClick={() => {
                setShowOpenAIConfirm(null)
                if (showOpenAIConfirm === 'suggest') handleSuggestThemes(true)
                else handleCompose(true)
              }}
              disabled={!!loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all disabled:opacity-50"
            >
              Utiliser OpenAI (~0.01$)
            </button>
          </div>

          <button
            onClick={() => setShowOpenAIConfirm(null)}
            className="w-full text-center text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Step indicator */}
      {step !== 'themes' && (
        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => setStep('themes')} className="text-white/30 hover:text-white/60">Thèmes</button>
          <span className="text-white/20">→</span>
          <button onClick={() => step === 'preview' ? setStep('edit') : undefined}
            className={step === 'edit' || step === 'preview' ? 'text-[#e91e8c]' : 'text-white/30'}>
            Édition
          </button>
          {step === 'preview' && (
            <>
              <span className="text-white/20">→</span>
              <span className="text-[#e91e8c]">Aperçu</span>
            </>
          )}
        </div>
      )}

      {/* ═══ STEP 1: Themes ═══ */}
      {step === 'themes' && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Composer une newsletter</h2>

          {/* Tone picker */}
          <div>
            <label className="text-white/50 text-xs block mb-2">Ton éditorial</label>
            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                    tone === t.id
                      ? 'bg-[#e91e8c] text-white font-semibold'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggest themes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs">Thèmes</label>
              <button
                onClick={() => handleSuggestThemes()}
                disabled={loading === 'suggest'}
                className="text-xs text-[#e91e8c] hover:text-[#e91e8c]/80 disabled:opacity-50"
              >
                {loading === 'suggest' ? 'Réflexion...' : '✨ Suggestions IA'}
              </button>
            </div>

            {/* Suggested themes */}
            {suggestedThemes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {suggestedThemes.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => handleToggleTheme(t.title)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      selectedThemes.includes(t.title)
                        ? 'border-[#e91e8c] bg-[#e91e8c]/10'
                        : 'border-[#2a2545] bg-white/[0.02] hover:bg-white/5'
                    }`}
                  >
                    <p className={`text-sm font-medium ${selectedThemes.includes(t.title) ? 'text-[#e91e8c]' : 'text-white'}`}>
                      {t.title}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Custom theme input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTheme()}
                placeholder="Ajouter un thème personnalisé..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
              <button
                onClick={handleAddCustomTheme}
                disabled={!customTheme.trim()}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-white/40 text-sm hover:bg-white/10 disabled:opacity-30"
              >
                +
              </button>
            </div>

            {/* Selected themes */}
            {selectedThemes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedThemes.map((t) => (
                  <span key={t} className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#e91e8c]/10 border border-[#e91e8c]/30 text-xs text-[#e91e8c]">
                    {t}
                    <button onClick={() => setSelectedThemes((prev) => prev.filter((x) => x !== t))} className="text-[#e91e8c]/50 hover:text-[#e91e8c] ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Audience */}
          <div>
            <label className="text-white/50 text-xs block mb-2">Audience</label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'voluntary', 'legacy'] as Target[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                    target === t
                      ? 'bg-[#e91e8c] text-white font-semibold'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {TARGET_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-2">{recipientCount} destinataire{recipientCount > 1 ? 's' : ''}</p>
          </div>

          {/* Generate button */}
          <button
            onClick={() => handleCompose()}
            disabled={loading === 'compose' || selectedThemes.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white font-bold disabled:opacity-50"
          >
            {loading === 'compose' ? '✨ Génération en cours...' : `✨ Générer la newsletter (${selectedThemes.length} thème${selectedThemes.length > 1 ? 's' : ''})`}
          </button>
        </div>
      )}

      {/* ═══ STEP 2: Edit sections ═══ */}
      {step === 'edit' && (
        <div className="space-y-4">
          {/* Subject */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
            <label className="text-white/50 text-xs block mb-1">Sujet de l&apos;email</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none"
            />
          </div>

          {/* Header image — magazine-style composer */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-white/50 text-xs">En-tête magazine</label>
              {(headerImageUrl || headerPhoto) && (
                <button
                  onClick={() => {
                    setHeaderImageUrl('')
                    setHeaderPhoto(null)
                    setHeaderLine1('')
                    setHeaderLine2('')
                    setHeaderEmoji('')
                    setHeaderBanner('')
                  }}
                  className="text-xs text-red-400/50 hover:text-red-400"
                >
                  Supprimer
                </button>
              )}
            </div>

            {/* Upload buttons — shown when no header yet */}
            {!headerPhoto && !headerImageUrl && (
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-4 rounded-xl border border-dashed border-[#2a2545] text-xs text-white/40 hover:border-[#e91e8c]/30 hover:text-white/60 cursor-pointer transition-colors">
                  Composer (photo + texte)
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = () => setHeaderPhoto(reader.result as string)
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-4 rounded-xl border border-dashed border-[#2a2545] text-xs text-white/40 hover:border-[#7ec850]/30 hover:text-white/60 cursor-pointer transition-colors">
                  Image toute faite
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = () => {
                          const img = new Image()
                          img.onload = () => {
                            const MAX_W = 600
                            const ratio = Math.min(MAX_W / img.width, 1)
                            const w = Math.round(img.width * ratio)
                            const h = Math.round(img.height * ratio)
                            const canvas = document.createElement('canvas')
                            canvas.width = w
                            canvas.height = h
                            const ctx = canvas.getContext('2d')!
                            ctx.drawImage(img, 0, 0, w, h)
                            setHeaderImageUrl(canvas.toDataURL('image/jpeg', 0.92))
                          }
                          img.src = reader.result as string
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* Composer fields — visible when photo uploaded */}
            {headerPhoto && (
              <div className="space-y-2">
                <label className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 cursor-pointer transition-colors">
                  Changer la photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = () => setHeaderPhoto(reader.result as string)
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={headerLine1}
                  onChange={(e) => setHeaderLine1(e.target.value)}
                  placeholder="Ligne noire (ex: c'est l'appel)"
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-sm text-white font-bold focus:border-[#e91e8c]/50 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={headerLine2}
                    onChange={(e) => setHeaderLine2(e.target.value)}
                    placeholder="Ligne rose (ex: du micro)"
                    className="flex-1 px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-sm font-bold focus:border-[#e91e8c]/50 focus:outline-none"
                    style={{ color: '#e91e8c' }}
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-14 h-10 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xl text-center hover:border-[#e91e8c]/50 transition-colors"
                      title="Choisir un emoji"
                    >
                      {headerEmoji || '😀'}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute right-0 top-12 z-50 bg-[#1a1533] border border-[#2a2545] rounded-xl p-3 shadow-xl w-72">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-400">Choisis un emoji</span>
                          {headerEmoji && (
                            <button onClick={() => { setHeaderEmoji(''); setShowEmojiPicker(false) }} className="text-xs text-red-400 hover:text-red-300">Retirer</button>
                          )}
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                          {HEADER_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => { setHeaderEmoji(em); setShowEmojiPicker(false) }}
                              className={`text-2xl w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2545] transition-colors ${headerEmoji === em ? 'bg-[#e91e8c]/30 ring-1 ring-[#e91e8c]' : ''}`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={headerBanner}
                  onChange={(e) => setHeaderBanner(e.target.value)}
                  placeholder="Bandeau bas (ex: les inscriptions sont ouvertes)"
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
            )}

            {/* Live preview */}
            {headerImageUrl && (
              <div className="rounded-xl overflow-hidden border border-[#2a2545]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headerImageUrl} alt="En-tête" className="w-full" />
              </div>
            )}
          </div>

          {/* Sections */}
          {sections.map((section, i) => (
            <div key={i} className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4 space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                  <span className="text-xs text-white/40">Section {i + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMoveSection(i, -1)} disabled={i === 0} className="p-1 text-white/20 hover:text-white/50 disabled:opacity-20">↑</button>
                  <button onClick={() => handleMoveSection(i, 1)} disabled={i === sections.length - 1} className="p-1 text-white/20 hover:text-white/50 disabled:opacity-20">↓</button>
                  <button onClick={() => handleRemoveSection(i)} className="p-1 text-red-400/50 hover:text-red-400 ml-2">✕</button>
                </div>
              </div>

              {/* Label & Color */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => handleSectionEdit(i, 'label', e.target.value)}
                  placeholder="LABEL"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white uppercase tracking-wider focus:border-[#e91e8c]/50 focus:outline-none"
                />
                <input
                  type="color"
                  value={section.color}
                  onChange={(e) => handleSectionEdit(i, 'color', e.target.value)}
                  className="w-10 h-9 rounded-lg border border-[#2a2545] cursor-pointer bg-transparent"
                />
              </div>

              {/* Title */}
              <input
                type="text"
                value={section.title}
                onChange={(e) => handleSectionEdit(i, 'title', e.target.value)}
                placeholder="Titre de la section"
                className="w-full px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-sm text-white font-medium focus:border-[#e91e8c]/50 focus:outline-none"
              />

              {/* Body */}
              <textarea
                value={section.body}
                onChange={(e) => handleSectionEdit(i, 'body', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-sm text-white/80 focus:border-[#e91e8c]/50 focus:outline-none resize-y"
              />

              {/* Image */}
              <div className="space-y-2">
                {section.imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#2a2545]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={section.imageUrl} alt="" className="w-full max-h-48 object-cover" />
                    <button
                      onClick={() => handleSectionEdit(i, 'imageUrl', null)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#2a2545] text-xs text-white/30 hover:border-[#e91e8c]/30 hover:text-white/50 cursor-pointer transition-colors" title="La photo sera optimisée avec le titre superposé">
                      📎 + titre
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(i, file)
                        }}
                      />
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#2a2545] text-xs text-white/30 hover:border-[#7ec850]/30 hover:text-white/50 cursor-pointer transition-colors" title="Photo déjà titrée ou créative — juste resize pour l'email">
                      📎 Brute
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(i, file, true)
                        }}
                      />
                    </label>
                    <button
                      onClick={() => {
                        // Si Gemini quota épuisé pour cette section, passer à DALL-E
                        const useDalle = pendingDalleRef.current === i
                        if (useDalle) pendingDalleRef.current = null
                        handleGenerateImage(i, useDalle ? 'dalle' : 'gemini')
                      }}
                      disabled={!section.imagePrompt || loading === `img-${i}`}
                      className={`px-3 py-2.5 rounded-lg border text-xs transition-colors disabled:opacity-30 ${
                        pendingDalleRef.current === i
                          ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                      }`}
                    >
                      {loading === `img-${i}` ? '⏳' : '🎨'} {pendingDalleRef.current === i ? 'DALL-E' : 'IA'}
                    </button>
                  </div>
                )}
                {section.imagePrompt && !section.imageUrl && (
                  <p className="text-[10px] text-white/20 italic">Prompt : {section.imagePrompt}</p>
                )}
              </div>

              {/* CTA */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={section.ctaText || ''}
                  onChange={(e) => handleSectionEdit(i, 'ctaText', e.target.value || null)}
                  placeholder="Texte du bouton (optionnel)"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white focus:border-[#e91e8c]/50 focus:outline-none"
                />
                <input
                  type="url"
                  value={section.ctaUrl || ''}
                  onChange={(e) => handleSectionEdit(i, 'ctaUrl', e.target.value || null)}
                  placeholder="URL du bouton"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Build a lightweight preview
                setPreviewHtml(buildPreviewHtml(subject, headerImageUrl, sections))
                setStep('preview')
              }}
              className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10 transition-colors"
            >
              👁 Prévisualiser
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={loading === 'save' || !subject.trim()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white font-bold disabled:opacity-50"
            >
              {loading === 'save' ? 'Sauvegarde...' : '💾 Sauvegarder le brouillon'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Preview ═══ */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-1 overflow-hidden">
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              className="max-h-[600px] overflow-y-auto"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('edit')}
              className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10"
            >
              ← Retour à l&apos;édition
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={loading === 'save'}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white font-bold disabled:opacity-50"
            >
              {loading === 'save' ? 'Sauvegarde...' : '💾 Sauvegarder le brouillon'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Campaign viewing modal ═══ */}
      {viewingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewingCampaign(null)}>
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">{viewingCampaign.subject}</h3>
              <button onClick={() => setViewingCampaign(null)} className="text-white/30 hover:text-white/60 text-lg">✕</button>
            </div>
            {viewingCampaign.sections && viewingCampaign.sections.length > 0 ? (
              <div className="space-y-4">
                {viewingCampaign.sections.map((s: Section, i: number) => (
                  <div key={i} className="border-l-2 pl-4" style={{ borderColor: s.color || '#e91e8c' }}>
                    {s.label && <p className="text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</p>}
                    {s.title && <p className="text-white font-medium mt-1">{s.title}</p>}
                    <p className="text-white/60 text-sm mt-1 whitespace-pre-line">{s.body}</p>
                    {s.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.imageUrl} alt="" className="w-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-sm whitespace-pre-line">{viewingCampaign.body}</p>
            )}
            {viewingCampaign.tone && (
              <p className="text-white/20 text-xs mt-4">Ton : {TONES.find((t) => t.id === viewingCampaign.tone)?.label || viewingCampaign.tone}</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ Historique ═══ */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Historique</h2>
        {campaigns.length === 0 ? (
          <p className="text-white/30 text-sm">Aucune campagne</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const style = STATUS_STYLES[c.status] || STATUS_STYLES.draft
              return (
                <div key={c.id} className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => setViewingCampaign(c)}
                          className="text-white font-medium text-sm truncate hover:text-[#e91e8c] transition-colors text-left"
                        >
                          {c.subject}
                        </button>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {c.tone && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-400">
                            {TONES.find((t) => t.id === c.tone)?.emoji}
                          </span>
                        )}
                      </div>
                      <p className="text-white/30 text-xs">
                        {TARGET_LABELS[c.target as Target] || c.target}
                        {c.sent_at && ` — Envoyé le ${new Date(c.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                        {c.status === 'sent' && ` — ${c.total_sent}/${c.total_recipients} envoyés`}
                        {c.total_errors > 0 && ` (${c.total_errors} erreur${c.total_errors > 1 ? 's' : ''})`}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {c.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSendTest(c.id)}
                            disabled={loading === `test-${c.id}`}
                            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 disabled:opacity-50"
                          >
                            {loading === `test-${c.id}` ? '...' : 'Test'}
                          </button>
                          {confirmSendId === c.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSend(c.id)}
                                disabled={loading === `send-${c.id}`}
                                className="px-3 py-1.5 rounded-lg bg-[#7ec850] text-black text-xs font-bold disabled:opacity-50"
                              >
                                {loading === `send-${c.id}` ? 'Envoi...' : 'Confirmer'}
                              </button>
                              <button onClick={() => setConfirmSendId(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs">Non</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmSendId(c.id)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-xs font-semibold"
                            >
                              Envoyer
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={loading === `del-${c.id}`}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {loading === `del-${c.id}` ? '...' : '🗑'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Image processing for newsletter (client-side Canvas) ───

const TONE_STYLES: Record<string, { fontStyle: string; shadowColor: string; labelBg: string }> = {
  decale: { fontStyle: 'bold italic', shadowColor: 'rgba(233,30,140,0.6)', labelBg: 'rgba(233,30,140,0.8)' },
  pro: { fontStyle: 'bold', shadowColor: 'rgba(0,0,0,0.7)', labelBg: 'rgba(30,30,50,0.85)' },
  chaleureux: { fontStyle: 'bold', shadowColor: 'rgba(201,168,76,0.5)', labelBg: 'rgba(201,168,76,0.8)' },
  urgence: { fontStyle: 'bold', shadowColor: 'rgba(239,68,68,0.6)', labelBg: 'rgba(239,68,68,0.8)' },
  inspirant: { fontStyle: 'italic', shadowColor: 'rgba(126,200,80,0.4)', labelBg: 'rgba(126,200,80,0.7)' },
}

function processImageForNewsletter(
  img: HTMLImageElement,
  title: string,
  label: string,
  sectionColor: string,
  tone: string
): string {
  const MAX_WIDTH = 600
  const QUALITY = 0.85

  // Calculate dimensions (max 600px wide, keep aspect ratio)
  const ratio = Math.min(MAX_WIDTH / img.width, 1)
  const w = Math.round(img.width * ratio)
  const h = Math.round(img.height * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Draw original image (resized)
  ctx.drawImage(img, 0, 0, w, h)

  // Skip overlay if no title
  if (!title?.trim()) {
    return canvas.toDataURL('image/jpeg', QUALITY)
  }

  const style = TONE_STYLES[tone] || TONE_STYLES.decale

  // Dark gradient overlay on bottom 45% of image
  const gradientHeight = h * 0.45
  const gradient = ctx.createLinearGradient(0, h - gradientHeight, 0, h)
  gradient.addColorStop(0, 'rgba(13,11,26,0)')
  gradient.addColorStop(0.4, 'rgba(13,11,26,0.5)')
  gradient.addColorStop(1, 'rgba(13,11,26,0.9)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, h - gradientHeight, w, gradientHeight)

  // Label badge (top-left of gradient area)
  if (label?.trim()) {
    ctx.font = `bold ${Math.max(11, w * 0.02)}px Arial, sans-serif`
    const labelMetrics = ctx.measureText(label.toUpperCase())
    const labelPadX = 10
    const labelPadY = 5
    const labelW = labelMetrics.width + labelPadX * 2
    const labelH = 20
    const labelX = 20
    const labelY = h - gradientHeight * 0.75

    // Badge background
    ctx.fillStyle = style.labelBg
    ctx.beginPath()
    ctx.roundRect(labelX, labelY, labelW, labelH, 4)
    ctx.fill()

    // Badge text
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(10, w * 0.018)}px Arial, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillText(label.toUpperCase(), labelX + labelPadX, labelY + labelH / 2)
  }

  // Title text
  const fontSize = Math.min(Math.max(18, w * 0.04), 32)
  ctx.font = `${style.fontStyle} ${fontSize}px Arial, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'bottom'
  ctx.shadowColor = style.shadowColor
  ctx.shadowBlur = 12
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  // Word-wrap title
  const maxTextWidth = w - 40
  const words = title.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(test).width > maxTextWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = test
    }
  }
  if (currentLine) lines.push(currentLine)

  // Draw lines from bottom up
  const lineHeight = fontSize * 1.3
  const startY = h - 16
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], 20, startY - (lines.length - 1 - i) * lineHeight)
  }

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Thin accent line at bottom
  ctx.fillStyle = sectionColor || '#e91e8c'
  ctx.fillRect(0, h - 3, w, 3)

  return canvas.toDataURL('image/jpeg', QUALITY)
}

// ─── Header composer (magazine editorial style — 600×500) ───

function composeHeaderImage(
  photo: HTMLImageElement,
  line1: string,
  line2: string,
  emoji: string,
  banner: string
): string {
  const W = 600, H = 500
  const QUALITY = 0.92
  const MARGIN = 20

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // ── Measure text sizes first to compute layout ──
  const FONT_FAMILY = 'Impact, "Arial Black", "Arial Narrow", sans-serif'

  // Line 1 — bold black (slightly smaller)
  let fs1 = 56
  if (line1.trim()) {
    ctx.font = `${fs1}px ${FONT_FAMILY}`
    while (ctx.measureText(line1).width > W - MARGIN * 2 && fs1 > 24) {
      fs1 -= 2
      ctx.font = `${fs1}px ${FONT_FAMILY}`
    }
  }

  // Line 2 — bold pink (bigger)
  let fs2 = 86
  const emojiSpace = emoji.trim() ? 110 : 0
  if (line2.trim()) {
    ctx.font = `italic ${fs2}px ${FONT_FAMILY}`
    while (ctx.measureText(line2).width > W - MARGIN * 2 - emojiSpace && fs2 > 30) {
      fs2 -= 2
      ctx.font = `italic ${fs2}px ${FONT_FAMILY}`
    }
  }

  // Compute vertical layout: both lines tight, centered on white/photo boundary
  const gap = 2 // tiny gap between lines
  const totalTextH = (line1.trim() ? fs1 : 0) + gap + (line2.trim() ? fs2 : 0)
  // Place text block so line2 straddles the photo boundary
  // Photo boundary = where line2 is roughly 40% on white, 60% on photo
  const PHOTO_START = Math.max(140, Math.round(totalTextH * 0.72) + 16)
  const line1Y = PHOTO_START - totalTextH + fs2 * 0.35
  const line2Y = line1Y + (line1.trim() ? fs1 + gap : 0)

  // 1. White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // 2. Photo — center-crop to fill bottom area
  const photoH = H - PHOTO_START
  const dstAspect = W / photoH
  const srcAspect = photo.width / photo.height
  let sx = 0, sy = 0, sw = photo.width, sh = photo.height
  if (srcAspect > dstAspect) {
    sw = Math.round(photo.height * dstAspect)
    sx = Math.round((photo.width - sw) / 2)
  } else {
    sh = Math.round(photo.width / dstAspect)
    sy = Math.round((photo.height - sh) / 2)
  }
  ctx.drawImage(photo, sx, sy, sw, sh, 0, PHOTO_START, W, photoH)

  // 3. Line 1 — black, Impact style
  if (line1.trim()) {
    ctx.font = `${fs1}px ${FONT_FAMILY}`
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'top'
    ctx.fillText(line1, MARGIN, line1Y)
  }

  // 4. Line 2 — pink italic, overlapping onto photo
  if (line2.trim()) {
    ctx.font = `italic ${fs2}px ${FONT_FAMILY}`
    ctx.textBaseline = 'top'
    // White stroke for readability over photo
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 6
    ctx.lineJoin = 'round'
    ctx.strokeText(line2, MARGIN, line2Y)
    ctx.fillStyle = '#e91e8c'
    ctx.fillText(line2, MARGIN, line2Y)

    // Emoji — big, next to line 2, slightly above
    if (emoji.trim()) {
      const textW = ctx.measureText(line2).width
      const emojiFontSize = Math.round(fs2 * 1.15)
      ctx.font = `${emojiFontSize}px serif`
      ctx.strokeStyle = 'transparent'
      ctx.lineWidth = 0
      ctx.fillText(emoji, MARGIN + textW + 8, line2Y - 12)
    }
  }

  // 5. Bottom banner — pink highlight with white text
  if (banner.trim()) {
    const bannerH = 46
    const bannerY = H - bannerH - 14
    let fontSize = 30
    ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`
    // Auto-shrink banner text
    while (ctx.measureText(banner).width + 36 > W - 24 && fontSize > 16) {
      fontSize -= 2
      ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`
    }
    const textW = ctx.measureText(banner).width
    const bannerW = textW + 36
    const bannerX = 12

    // Pink pill background
    ctx.fillStyle = '#e91e8c'
    ctx.beginPath()
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6)
    ctx.fill()

    // White text
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(banner, bannerX + 18, bannerY + bannerH / 2 + 1)
  }

  return canvas.toDataURL('image/jpeg', QUALITY)
}

// ─── Resize a base64 image to max width (for consistent 600px newsletter images) ───

function resizeImageToWidth(dataUrl: string, maxWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= maxWidth) { resolve(dataUrl); return }
      const ratio = maxWidth / img.width
      const w = maxWidth
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

// ─── Preview HTML builder (client-side approximation) ───

function blendWithBg(hex: string, alpha: number): string {
  const bgR = 13, bgG = 11, bgB = 26
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const blendR = Math.round(bgR * (1 - alpha) + r * alpha)
  const blendG = Math.round(bgG * (1 - alpha) + g * alpha)
  const blendB = Math.round(bgB * (1 - alpha) + b * alpha)
  return `#${blendR.toString(16).padStart(2, '0')}${blendG.toString(16).padStart(2, '0')}${blendB.toString(16).padStart(2, '0')}`
}

function buildPreviewHtml(subject: string, headerImageUrl: string, sections: Section[]): string {
  const sectionsHtml = sections.map((s, i) => {
    const sColor = s.color || '#e91e8c'
    const sectionBg = blendWithBg(sColor, 0.18)
    const borderColor = blendWithBg(sColor, 0.25)

    const img = s.imageUrl
      ? `<div style="margin-bottom:0;border-radius:16px 16px 0 0;overflow:hidden;"><img src="${s.imageUrl}" alt="" width="600" style="width:100%;max-width:600px;display:block;" /></div>`
      : ''

    const cta = s.ctaText && s.ctaUrl
      ? `<div style="text-align:center;margin:20px 0 0 0;"><a href="${s.ctaUrl}" style="display:inline-block;padding:14px 32px;background:${sColor};color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;letter-spacing:0.5px;">${s.ctaText}</a></div>`
      : ''

    const label = s.label ? `<p style="color:${sColor};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">${s.label}</p>` : ''
    const title = s.title ? `<h2 style="color:#ffffff;font-size:20px;font-weight:bold;margin:0 0 16px 0;line-height:1.3;">${s.title}</h2>` : ''
    const body = s.body.split(/\n\n+/).map((p) => `<p style="color:#1a1533;font-size:14px;line-height:1.7;margin:0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')

    const topRadius = s.imageUrl ? '0' : '16px'
    const spacing = i > 0 ? '<div style="height:24px;"></div>' : ''

    return `${spacing}${img}<div style="background:${sectionBg};border:1px solid ${borderColor};border-radius:${topRadius} ${topRadius} 16px 16px;padding:24px 24px 28px 24px;">${label}${title}<div style="background:#f0eff2;border-radius:12px;padding:20px;">${body}</div>${cta}</div>`
  }).join('')

  const headerImg = headerImageUrl
    ? `<div style="text-align:center;margin-bottom:32px;"><img src="${headerImageUrl}" alt="" width="600" style="width:100%;max-width:600px;border-radius:16px;" /></div>`
    : ''

  return `
    <div style="background:#0d0b1a;padding:40px 24px;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:32px;">
          <span style="font-size:22px;font-weight:bold;"><span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span></span>
          <p style="color:#ffffff40;font-size:11px;margin:4px 0 0 0;letter-spacing:1px;">LA NEWSLETTER</p>
        </div>
        ${headerImg}
        <div style="padding:0;">
          ${sectionsHtml}
        </div>
        <div style="text-align:center;margin-top:32px;">
          <p style="color:#ffffff33;font-size:11px;">Se désinscrire</p>
        </div>
      </div>
    </div>`
}
