'use client'

import { useState, useCallback } from 'react'
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

  const recipientCount = target === 'all' ? counts.total : target === 'voluntary' ? counts.voluntary : counts.legacy

  // ─── Handlers ───

  const handleSuggestThemes = useCallback(async () => {
    setLoading('suggest')
    setMessage(null)
    try {
      const res = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          context: sessionContext,
          siteInfo: { url: 'https://chantenscene.fr', name: 'ChanteEnScène' },
        }),
      })
      const data = await res.json()
      if (data.themes) {
        setSuggestedThemes(data.themes)
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur' })
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

  const handleCompose = useCallback(async () => {
    if (selectedThemes.length === 0) {
      setMessage({ type: 'error', text: 'Sélectionne au moins un thème' })
      return
    }
    setLoading('compose')
    setMessage(null)
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
        }),
      })
      const data = await res.json()
      if (data.sections) {
        setSubject(data.subject || '')
        setSections(data.sections)
        setStep('edit')
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur de génération' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' })
    }
    setLoading('')
  }, [selectedThemes, tone, sessionContext])

  const handleGenerateImage = useCallback(async (index: number) => {
    const section = sections[index]
    if (!section.imagePrompt) return

    setLoading(`img-${index}`)
    try {
      const res = await fetch('/api/newsletter/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: section.imagePrompt, provider: 'gemini' }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        setSections((prev) => {
          const next = [...prev]
          next[index] = { ...next[index], imageUrl: data.imageUrl }
          return next
        })
        setMessage({ type: 'success', text: `Image générée (${data.provider})` })
      } else {
        setMessage({ type: 'error', text: data.error || 'Impossible de générer l\'image' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' })
    }
    setLoading('')
  }, [sections])

  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setSections((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], imageUrl: reader.result as string }
        return next
      })
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
                onClick={handleSuggestThemes}
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
            onClick={handleCompose}
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

          {/* Header image */}
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
            <label className="text-white/50 text-xs block mb-1">Image d&apos;en-tête (optionnel)</label>
            <input
              type="url"
              value={headerImageUrl}
              onChange={(e) => setHeaderImageUrl(e.target.value)}
              placeholder="URL image ou glisser une image..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
            />
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
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#2a2545] text-xs text-white/30 hover:border-[#e91e8c]/30 hover:text-white/50 cursor-pointer transition-colors">
                      📎 Importer une image
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
                    <button
                      onClick={() => handleGenerateImage(i)}
                      disabled={!section.imagePrompt || loading === `img-${i}`}
                      className="px-3 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-400 hover:bg-purple-500/20 disabled:opacity-30 transition-colors"
                    >
                      {loading === `img-${i}` ? '⏳' : '🎨'} IA
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

// ─── Preview HTML builder (client-side approximation) ───

function buildPreviewHtml(subject: string, headerImageUrl: string, sections: Section[]): string {
  const sectionsHtml = sections.map((s, i) => {
    const img = s.imageUrl
      ? `<div style="margin-bottom:20px;border-radius:12px;overflow:hidden;"><img src="${s.imageUrl}" alt="" style="max-width:100%;display:block;" /></div>`
      : ''
    const cta = s.ctaText && s.ctaUrl
      ? `<div style="text-align:center;margin:20px 0 0 0;"><a href="${s.ctaUrl}" style="display:inline-block;padding:12px 28px;background:${s.color};color:#ffffff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:bold;">${s.ctaText}</a></div>`
      : ''
    const border = i > 0 ? '<div style="border-top:1px solid #2a2545;margin:32px 0;"></div>' : ''
    const label = s.label ? `<p style="color:${s.color};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">${s.label}</p>` : ''
    const title = s.title ? `<h2 style="color:#ffffff;font-size:18px;font-weight:bold;margin:0 0 16px 0;">${s.title}</h2>` : ''
    const body = s.body.split(/\n\n+/).map((p) => `<p style="color:#ffffffcc;font-size:14px;line-height:1.7;margin:0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')
    return `${border}${img}${label}${title}${body}${cta}`
  }).join('')

  const headerImg = headerImageUrl
    ? `<div style="text-align:center;margin-bottom:32px;"><img src="${headerImageUrl}" alt="" style="max-width:100%;border-radius:16px;" /></div>`
    : ''

  return `
    <div style="background:#0d0b1a;padding:40px 24px;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:32px;">
          <span style="font-size:22px;font-weight:bold;"><span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span></span>
          <p style="color:#ffffff40;font-size:11px;margin:4px 0 0 0;letter-spacing:1px;">LA NEWSLETTER</p>
        </div>
        ${headerImg}
        <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
          ${sectionsHtml}
        </div>
        <div style="text-align:center;margin-top:32px;">
          <p style="color:#ffffff33;font-size:11px;">Se désinscrire</p>
        </div>
      </div>
    </div>`
}
