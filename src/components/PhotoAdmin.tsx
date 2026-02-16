'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto, updatePhoto, deletePhoto, togglePhotoPublished, bulkTogglePublished } from '@/app/admin/photos/actions'

interface Photo {
  id: string
  photo_url: string
  caption: string | null
  tag_type: string
  tag_candidate_id: string | null
  tag_event: string | null
  published: boolean
  created_at: string
  source?: string | null
  submitted_by_name?: string | null
  submitted_by_email?: string | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
}

interface Props {
  sessionId: string
  photos: Photo[]
  candidates: Candidate[]
}

const EVENT_TAGS = [
  { value: '', label: 'Aucun' },
  { value: 'rehearsal', label: 'Répétition' },
  { value: 'semifinal', label: 'Demi-finale' },
  { value: 'final', label: 'Finale' },
  { value: 'backstage', label: 'Backstage' },
]

function applyWatermark(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const logo = new Image()
    let imgLoaded = false
    let logoLoaded = false

    function draw() {
      if (!imgLoaded || !logoLoaded) return
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      // Logo size: ~15% of the shortest side
      const logoSize = Math.min(img.width, img.height) * 0.15
      const ratio = logo.width / logo.height
      const lw = ratio >= 1 ? logoSize : logoSize * ratio
      const lh = ratio >= 1 ? logoSize / ratio : logoSize
      const margin = logoSize * 0.3

      ctx.globalAlpha = 0.35
      ctx.drawImage(logo, img.width - lw - margin, img.height - lh - margin, lw, lh)
      ctx.globalAlpha = 1.0

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
        'image/jpeg',
        0.92
      )
    }

    img.onload = () => { imgLoaded = true; draw() }
    logo.onload = () => { logoLoaded = true; draw() }
    img.onerror = () => reject(new Error('Image load failed'))
    logo.onerror = () => {
      // If logo fails to load, upload without watermark
      logoLoaded = true
      draw()
    }

    img.src = URL.createObjectURL(file)
    logo.src = '/images/logo.png'
  })
}

export default function PhotoAdmin({ sessionId, photos: initialPhotos, candidates }: Props) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  // Split admin vs crowd photos
  const adminPhotos = photos.filter((p) => p.source !== 'crowd')
  const crowdPhotos = photos.filter((p) => p.source === 'crowd')

  const filtered = filter === 'all'
    ? adminPhotos
    : adminPhotos.filter((p) => p.tag_type === filter || p.tag_event === filter)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)
    const supabase = createClient()
    let successCount = 0
    let lastError: string | null = null

    for (const file of Array.from(files)) {
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const path = `photos/${sessionId}/${fileName}`

      let blob: Blob
      try {
        blob = await applyWatermark(file)
      } catch {
        blob = file
      }

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, blob, { contentType: 'image/jpeg' })

      if (uploadError) {
        lastError = `Erreur upload ${file.name}: ${uploadError.message}`
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

      const result = await uploadPhoto(sessionId, publicUrl, '', 'general', null, null)
      if (result.error) {
        lastError = result.error
      } else {
        successCount++
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''

    if (lastError) {
      setError(lastError)
    }

    if (successCount > 0) {
      window.location.reload()
    }
  }

  async function handleTogglePublished(id: string, published: boolean) {
    const result = await togglePhotoPublished(id, published)
    if (result.error) {
      setError(result.error)
    } else {
      setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, published } : p))
    }
  }

  async function handleBulkPublish(publish: boolean) {
    const ids = filtered.map((p) => p.id)
    if (ids.length === 0) return
    const result = await bulkTogglePublished(ids, publish)
    if (result.error) {
      setError(result.error)
    } else {
      setPhotos((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, published: publish } : p))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette photo ?')) return
    const result = await deletePhoto(id)
    if (result.error) {
      setError(result.error)
    } else {
      setPhotos((prev) => prev.filter((p) => p.id !== id))
    }
  }

  async function handleSaveEdit(id: string, caption: string, tagType: string, tagCandidateId: string | null, tagEvent: string | null) {
    const result = await updatePhoto(id, caption, tagType, tagCandidateId, tagEvent)
    if (result.error) {
      setError(result.error)
    } else {
      setEditingId(null)
      window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">Galerie photos</h1>
          <p className="text-white/40 text-sm">
            {adminPhotos.length} photo{adminPhotos.length > 1 ? 's' : ''}
            {' · '}
            <span className="text-[#7ec850]">{adminPhotos.filter((p) => p.published).length} publiée{adminPhotos.filter((p) => p.published).length > 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
          >
            {uploading ? 'Upload en cours...' : '+ Ajouter des photos'}
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {filtered.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => handleBulkPublish(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
          >
            Publier toutes ({filtered.filter((p) => !p.published).length})
          </button>
          <button
            onClick={() => handleBulkPublish(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors"
          >
            Dépublier toutes ({filtered.filter((p) => p.published).length})
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'general', label: 'Général' },
          { key: 'candidate', label: 'Candidats' },
          { key: 'event', label: 'Événements' },
          { key: 'rehearsal', label: 'Répétitions' },
          { key: 'semifinal', label: 'Demi-finale' },
          { key: 'final', label: 'Finale' },
          { key: 'backstage', label: 'Backstage' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            candidates={candidates}
            isEditing={editingId === photo.id}
            onEdit={() => setEditingId(photo.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(caption, tagType, tagCandidateId, tagEvent) =>
              handleSaveEdit(photo.id, caption, tagType, tagCandidateId, tagEvent)
            }
            onDelete={() => handleDelete(photo.id)}
            onTogglePublished={() => handleTogglePublished(photo.id, !photo.published)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-12 text-center">
          <p className="text-white/30 text-sm">Aucune photo dans cette catégorie.</p>
        </div>
      )}

      {/* ─── CROWD REPORTER SECTION ─── */}
      <div className="mt-12 pt-8 border-t border-[#2a2545]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg flex items-center gap-2">
              Photos Reporter Live
            </h2>
            <p className="text-white/40 text-sm">
              {crowdPhotos.length} photo{crowdPhotos.length > 1 ? 's' : ''} soumise{crowdPhotos.length > 1 ? 's' : ''} par le public
              {' · '}
              <span className="text-[#7ec850]">{crowdPhotos.filter((p) => p.published).length} publiée{crowdPhotos.filter((p) => p.published).length > 1 ? 's' : ''}</span>
            </p>
          </div>
          {crowdPhotos.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const ids = crowdPhotos.map((p) => p.id)
                  bulkTogglePublished(ids, true).then((r) => {
                    if (!r.error) setPhotos((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, published: true } : p))
                  })
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
              >
                Tout publier ({crowdPhotos.filter((p) => !p.published).length})
              </button>
              <button
                onClick={() => {
                  const ids = crowdPhotos.map((p) => p.id)
                  bulkTogglePublished(ids, false).then((r) => {
                    if (!r.error) setPhotos((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, published: false } : p))
                  })
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors"
              >
                Tout depublier ({crowdPhotos.filter((p) => p.published).length})
              </button>
            </div>
          )}
        </div>

        {crowdPhotos.length === 0 ? (
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-12 text-center">
            <p className="text-white/30 text-sm">Aucune photo soumise par le public pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {crowdPhotos.map((photo) => (
              <CrowdPhotoCard
                key={photo.id}
                photo={photo}
                onDelete={() => handleDelete(photo.id)}
                onTogglePublished={() => handleTogglePublished(photo.id, !photo.published)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoCard({
  photo,
  candidates,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTogglePublished,
}: {
  photo: Photo
  candidates: Candidate[]
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (caption: string, tagType: string, tagCandidateId: string | null, tagEvent: string | null) => void
  onDelete: () => void
  onTogglePublished: () => void
}) {
  const [caption, setCaption] = useState(photo.caption || '')
  const [tagType, setTagType] = useState(photo.tag_type)
  const [tagCandidateId, setTagCandidateId] = useState(photo.tag_candidate_id || '')
  const [tagEvent, setTagEvent] = useState(photo.tag_event || '')

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl overflow-hidden">
      <div className="relative aspect-square">
        <img src={photo.photo_url} alt={photo.caption || ''} className={`w-full h-full object-cover ${!photo.published ? 'opacity-50' : ''}`} />
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-[#161228] ${photo.published ? 'bg-[#7ec850]' : 'bg-white/20'}`} title={photo.published ? 'Publiée' : 'Non publiée'} />
      </div>

      {isEditing ? (
        <div className="p-3 space-y-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Légende"
            className="w-full px-3 py-1.5 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white focus:border-[#e91e8c]/50 focus:outline-none"
          />
          <select
            value={tagType}
            onChange={(e) => setTagType(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white focus:outline-none"
          >
            <option value="general">Général</option>
            <option value="candidate">Candidat</option>
            <option value="event">Événement</option>
          </select>
          {tagType === 'candidate' && (
            <select
              value={tagCandidateId}
              onChange={(e) => setTagCandidateId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white focus:outline-none"
            >
              <option value="">Sélectionner...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.stage_name || `${c.first_name} ${c.last_name}`}
                </option>
              ))}
            </select>
          )}
          {tagType === 'event' && (
            <select
              value={tagEvent}
              onChange={(e) => setTagEvent(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#1a1533] border border-[#2a2545] text-xs text-white focus:outline-none"
            >
              {EVENT_TAGS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={onCancelEdit} className="px-2 py-1 rounded text-[10px] text-white/40 bg-white/5">
              Annuler
            </button>
            <button
              onClick={() => onSave(caption, tagType, tagCandidateId || null, tagEvent || null)}
              className="px-2 py-1 rounded text-[10px] font-bold bg-[#e91e8c]"
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 space-y-1.5">
          {photo.caption && (
            <p className="text-white/50 text-xs truncate">{photo.caption}</p>
          )}
          <button
            onClick={onTogglePublished}
            className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              photo.published
                ? 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20'
                : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {photo.published ? 'Publiée ✓' : 'Publier'}
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={onEdit}
              className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-white/50 bg-white/5 hover:bg-white/10 hover:text-white/70 transition-colors"
            >
              Modifier
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1.5 rounded-lg text-[10px] font-medium text-red-400/60 bg-red-500/5 hover:bg-red-500/15 hover:text-red-400 transition-colors"
            >
              Suppr.
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CrowdPhotoCard({
  photo,
  onDelete,
  onTogglePublished,
}: {
  photo: Photo
  onDelete: () => void
  onTogglePublished: () => void
}) {
  const date = new Date(photo.created_at)
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl overflow-hidden">
      <div className="relative aspect-square">
        <img src={photo.photo_url} alt={photo.caption || ''} className={`w-full h-full object-cover ${!photo.published ? 'opacity-50' : ''}`} />
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-[#161228] ${photo.published ? 'bg-[#7ec850]' : 'bg-white/20'}`} />
      </div>

      <div className="p-2 space-y-1.5">
        {/* Reporter info */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#e91e8c]">Reporter</span>
          <span className="text-[10px] text-white/60 truncate">
            {photo.submitted_by_name || 'Anonyme'}
          </span>
        </div>
        {photo.submitted_by_email && (
          <p className="text-[10px] text-white/30 truncate">{photo.submitted_by_email}</p>
        )}
        {photo.caption && (
          <p className="text-white/40 text-[10px] truncate">{photo.caption}</p>
        )}
        <p className="text-white/20 text-[10px]">{timeStr}</p>

        {/* Actions */}
        <button
          onClick={onTogglePublished}
          className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
            photo.published
              ? 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20'
              : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
          }`}
        >
          {photo.published ? 'Publiee ✓' : 'Publier'}
        </button>
        <button
          onClick={onDelete}
          className="w-full px-2 py-1.5 rounded-lg text-[10px] font-medium text-red-400/60 bg-red-500/5 hover:bg-red-500/15 hover:text-red-400 transition-colors"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
