'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  toggleSponsorPublished,
} from '@/app/admin/sponsors/actions'

interface Sponsor {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  tier: string
  position: number
  published: boolean
  created_at: string
}

interface Props {
  sessionId: string
  sponsors: Sponsor[]
}

const TIERS = [
  { value: 'gold', label: 'Or', color: '#f5a623', bg: 'bg-[#f5a623]/15 border-[#f5a623]/30 text-[#f5a623]' },
  { value: 'silver', label: 'Argent', color: '#94a3b8', bg: 'bg-white/10 border-white/20 text-white/70' },
  { value: 'bronze', label: 'Bronze', color: '#cd7f32', bg: 'bg-[#cd7f32]/15 border-[#cd7f32]/30 text-[#cd7f32]' },
  { value: 'partner', label: 'Partenaire', color: '#e91e8c', bg: 'bg-[#e91e8c]/10 border-[#e91e8c]/30 text-[#e91e8c]' },
]

function tierBadge(tier: string) {
  const t = TIERS.find((x) => x.value === tier) || TIERS[3]
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${t.bg}`}>
      {t.label}
    </span>
  )
}

export default function SponsorAdmin({ sessionId, sponsors: initialSponsors }: Props) {
  const [sponsors, setSponsors] = useState(initialSponsors)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTier, setNewTier] = useState('partner')
  const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTier, setEditTier] = useState('partner')
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(
    file: File,
    setUrl: (url: string) => void
  ) {
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    const path = `sponsors/${sessionId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setError(`Erreur upload: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
    setUrl(publicUrl)
    setUploading(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    setError(null)

    const result = await createSponsor(
      sessionId,
      newName.trim(),
      newLogoUrl,
      newWebsite.trim() || null,
      newDescription.trim() || null,
      newTier
    )

    if (result.error) {
      setError(result.error)
    } else {
      setNewName('')
      setNewWebsite('')
      setNewDescription('')
      setNewTier('partner')
      setNewLogoUrl(null)
      setShowCreate(false)
      window.location.reload()
    }
    setSaving(false)
  }

  function startEdit(s: Sponsor) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditWebsite(s.website_url || '')
    setEditDescription(s.description || '')
    setEditTier(s.tier)
    setEditLogoUrl(s.logo_url)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    setError(null)

    const result = await updateSponsor(
      id,
      editName.trim(),
      editLogoUrl,
      editWebsite.trim() || null,
      editDescription.trim() || null,
      editTier
    )

    if (result.error) {
      setError(result.error)
    } else {
      setEditingId(null)
      window.location.reload()
    }
    setSaving(false)
  }

  async function handleTogglePublished(id: string, published: boolean) {
    const result = await toggleSponsorPublished(id, published)
    if (result.error) {
      setError(result.error)
    } else {
      setSponsors((prev) => prev.map((s) => s.id === id ? { ...s, published } : s))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce sponsor ?')) return
    const result = await deleteSponsor(id)
    if (result.error) {
      setError(result.error)
    } else {
      setSponsors((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            Sponsors & Partenaires
          </h1>
          <p className="text-white/40 text-sm">
            {sponsors.length} sponsor{sponsors.length > 1 ? 's' : ''}
            {' · '}
            <span className="text-[#7ec850]">
              {sponsors.filter((s) => s.published).length} publié{sponsors.filter((s) => s.published).length > 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
        >
          {showCreate ? 'Annuler' : '+ Nouveau sponsor'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white/70 uppercase tracking-wider">
            Nouveau sponsor
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Nom *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du sponsor"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Site web</label>
              <input
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Courte description du partenaire..."
              rows={2}
              className={inputClass + ' resize-none'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Niveau</label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className={inputClass}
              >
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Logo</label>
              <div className="flex items-center gap-3">
                {newLogoUrl && (
                  <img src={newLogoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1" />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleLogoUpload(file, setNewLogoUrl)
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Upload...' : newLogoUrl ? 'Changer' : 'Choisir un fichier'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer le sponsor'}
            </button>
          </div>
        </div>
      )}

      {/* Sponsors list */}
      {sponsors.length === 0 && !showCreate && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-white/30 text-sm">Aucun sponsor pour le moment.</p>
          <p className="text-white/20 text-xs mt-1">Cliquez sur &quot;+ Nouveau sponsor&quot; pour commencer.</p>
        </div>
      )}

      <div className="space-y-3">
        {sponsors.map((sponsor) => (
          <div
            key={sponsor.id}
            className="bg-[#161228] border border-[#2a2545] rounded-xl overflow-hidden"
          >
            {editingId === sponsor.id ? (
              /* Edit mode */
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Nom *</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Site web</label>
                    <input
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className={inputClass + ' resize-none'}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Niveau</label>
                    <select
                      value={editTier}
                      onChange={(e) => setEditTier(e.target.value)}
                      className={inputClass}
                    >
                      {TIERS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Logo</label>
                    <div className="flex items-center gap-3">
                      {editLogoUrl && (
                        <img src={editLogoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1" />
                      )}
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleLogoUpload(file, setEditLogoUrl)
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => editFileRef.current?.click()}
                        disabled={uploading}
                        className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {uploading ? 'Upload...' : editLogoUrl ? 'Changer' : 'Choisir un fichier'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/40 bg-white/5 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleSaveEdit(sponsor.id)}
                    disabled={saving || !editName.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#e91e8c] hover:bg-[#c4157a] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="flex items-center gap-4 p-4">
                {/* Logo */}
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {sponsor.logo_url ? (
                    <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <span className="text-2xl">🏢</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-sm text-white truncate">{sponsor.name}</h3>
                    {tierBadge(sponsor.tier)}
                  </div>
                  {sponsor.description && (
                    <p className="text-white/40 text-xs truncate">{sponsor.description}</p>
                  )}
                  {sponsor.website_url && (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#e91e8c]/60 text-xs hover:text-[#e91e8c] transition-colors"
                    >
                      {sponsor.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublished(sponsor.id, !sponsor.published)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${
                      sponsor.published
                        ? 'bg-[#7ec850]/10 border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20'
                        : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {sponsor.published ? 'Publié ✓' : 'Publier'}
                  </button>
                  <button
                    onClick={() => startEdit(sponsor)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(sponsor.id)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-red-400/50 bg-red-500/5 border border-red-500/10 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
