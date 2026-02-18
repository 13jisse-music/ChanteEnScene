'use client'

import { useState } from 'react'
import {
  createCampaign,
  deleteCampaign,
  sendTestCampaign,
  sendCampaign,
} from '@/app/admin/newsletter/actions'

type Campaign = {
  id: string
  subject: string
  body: string
  image_url: string | null
  status: string
  target: string
  total_recipients: number
  total_sent: number
  total_errors: number
  created_at: string
  sent_at: string | null
}

type SubscriberCounts = {
  total: number
  voluntary: number
  legacy: number
}

type Target = 'all' | 'voluntary' | 'legacy'

const TARGET_LABELS: Record<Target, string> = {
  all: 'Tous les abonnes',
  voluntary: 'Abonnes volontaires',
  legacy: 'Anciens participants',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-white/10', text: 'text-white/60', label: 'Brouillon' },
  sending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Envoi...' },
  sent: { bg: 'bg-[#7ec850]/20', text: 'text-[#7ec850]', label: 'Envoye' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Echec' },
}

export default function NewsletterAdmin({
  sessionId,
  campaigns: initialCampaigns,
  counts,
}: {
  sessionId: string
  campaigns: Campaign[]
  counts: SubscriberCounts
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [target, setTarget] = useState<Target>('all')
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null)

  const recipientCount = target === 'all' ? counts.total : target === 'voluntary' ? counts.voluntary : counts.legacy

  async function handleCreate() {
    if (!subject.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Sujet et contenu requis' })
      return
    }
    setLoading('create')
    setMessage(null)

    const result = await createCampaign(sessionId, subject, body, imageUrl, target)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Brouillon cree' })
      setSubject('')
      setBody('')
      setImageUrl('')
      window.location.reload()
    }
    setLoading('')
  }

  async function handleSendTest(campaignId: string) {
    setLoading(`test-${campaignId}`)
    setMessage(null)

    const result = await sendTestCampaign(campaignId)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Email test envoye ! Verifiez votre boite.' })
    }
    setLoading('')
  }

  async function handleSend(campaignId: string) {
    setLoading(`send-${campaignId}`)
    setMessage(null)
    setConfirmSendId(null)

    const result = await sendCampaign(campaignId)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: `Envoye a ${result.sent} destinataires (${result.errors} erreur${(result.errors ?? 0) > 1 ? 's' : ''})` })
      window.location.reload()
    }
    setLoading('')
  }

  async function handleDelete(campaignId: string) {
    setLoading(`del-${campaignId}`)
    const result = await deleteCampaign(campaignId)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
    }
    setLoading('')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Newsletter</h1>
        <p className="text-white/40 text-sm mt-1">
          {counts.total} abonne{counts.total > 1 ? 's' : ''} actif{counts.total > 1 ? 's' : ''} ({counts.voluntary} volontaires, {counts.legacy} anciens participants)
        </p>
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

      {/* Compose */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Composer une newsletter</h2>

        <div>
          <label className="text-white/50 text-xs block mb-1">Sujet</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Les inscriptions sont ouvertes !"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-white/50 text-xs block mb-1">Contenu (texte brut, les sauts de ligne seront conserves)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Le contenu de votre newsletter..."
            className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none resize-y"
          />
        </div>

        <div>
          <label className="text-white/50 text-xs block mb-1">URL image (optionnel)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://chantenscene.fr/campaign-retour.png"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
          />
          {imageUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-[#2a2545] max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Preview" className="w-full" />
            </div>
          )}
        </div>

        <div>
          <label className="text-white/50 text-xs block mb-1">Audience</label>
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
          <p className="text-white/30 text-xs mt-2">
            {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
          </p>
        </div>

        {/* Preview */}
        {showPreview && subject && body && (
          <div className="border border-[#e91e8c]/30 rounded-xl p-4 bg-[#0d0b1a]">
            <p className="text-white/40 text-xs mb-3 uppercase tracking-wider">Apercu</p>
            <div className="text-center mb-4">
              <span className="text-lg font-bold">
                <span className="text-white">Chant</span><span className="text-[#7ec850]">En</span><span className="text-[#e91e8c]">Scene</span>
              </span>
            </div>
            {imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="w-full" />
              </div>
            )}
            <div className="bg-[#161228] rounded-xl p-4">
              <h3 className="text-[#e91e8c] font-bold text-center mb-3">{subject}</h3>
              {body.split(/\n\n+/).map((p, i) => (
                <p key={i} className="text-white/70 text-sm mb-2 whitespace-pre-line">{p}</p>
              ))}
            </div>
            <p className="text-white/20 text-xs text-center mt-3">
              + lien de desinscription en bas
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={!subject || !body}
            className="px-5 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            {showPreview ? 'Masquer apercu' : 'Previsualiser'}
          </button>
          <button
            onClick={handleCreate}
            disabled={loading === 'create' || !subject.trim() || !body.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading === 'create' ? 'Creation...' : 'Creer le brouillon'}
          </button>
        </div>
      </div>

      {/* Campaign history */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Historique</h2>
        {campaigns.length === 0 ? (
          <p className="text-white/30 text-sm">Aucune campagne</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const style = STATUS_STYLES[c.status] || STATUS_STYLES.draft
              return (
                <div
                  key={c.id}
                  className="bg-[#161228] border border-[#2a2545] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium text-sm truncate">{c.subject}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-white/30 text-xs">
                        {TARGET_LABELS[c.target as Target] || c.target}
                        {c.sent_at && ` — Envoye le ${new Date(c.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                        {c.status === 'sent' && ` — ${c.total_sent}/${c.total_recipients} envoyes`}
                        {c.total_errors > 0 && ` (${c.total_errors} erreur${c.total_errors > 1 ? 's' : ''})`}
                      </p>
                    </div>

                    {/* Actions */}
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
                              <button
                                onClick={() => setConfirmSendId(null)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs"
                              >
                                Non
                              </button>
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
                            {loading === `del-${c.id}` ? '...' : 'Supprimer'}
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
