'use client'

import { useState } from 'react'

interface Photo {
  id: string
  photo_url: string
  caption: string | null
  tag_type: string
  tag_event: string | null
  candidate_name?: string | null
}

interface Props {
  photos: Photo[]
  sessionName: string
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'Toutes' },
  { key: 'rehearsal', label: 'Répétitions' },
  { key: 'semifinal', label: 'Demi-finale' },
  { key: 'final', label: 'Finale' },
  { key: 'backstage', label: 'Backstage' },
]

export default function PhotoGallery({ photos, sessionName }: Props) {
  const [filter, setFilter] = useState('all')
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const filtered = filter === 'all'
    ? photos
    : photos.filter((p) => p.tag_event === filter)

  function openLightbox(idx: number) {
    setLightboxIdx(idx)
  }

  function closeLightbox() {
    setLightboxIdx(null)
  }

  function prev() {
    if (lightboxIdx === null) return
    setLightboxIdx(lightboxIdx > 0 ? lightboxIdx - 1 : filtered.length - 1)
  }

  function next() {
    if (lightboxIdx === null) return
    setLightboxIdx(lightboxIdx < filtered.length - 1 ? lightboxIdx + 1 : 0)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl md:text-3xl text-white mb-2"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Galerie <span className="text-gradient-gold">photos</span>
        </h1>
        <p className="text-white/50 text-sm">{sessionName} — {photos.length} photo{photos.length > 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex justify-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/40'
                : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(idx)}
            className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
          >
            <img
              src={photo.photo_url}
              alt={photo.caption || ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {photo.caption && (
                <p className="absolute bottom-3 left-3 right-3 text-white text-xs truncate">
                  {photo.caption}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-white/30 text-sm py-12">
          Aucune photo dans cette catégorie.
        </p>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && filtered[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-10"
          >
            x
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl z-10"
          >
            &lt;
          </button>

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={filtered[lightboxIdx].photo_url}
              alt={filtered[lightboxIdx].caption || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {(filtered[lightboxIdx].caption || filtered[lightboxIdx].candidate_name) && (
              <div className="mt-3 text-center">
                {filtered[lightboxIdx].caption && (
                  <p className="text-white text-sm">{filtered[lightboxIdx].caption}</p>
                )}
                {filtered[lightboxIdx].candidate_name && (
                  <p className="text-white/50 text-xs mt-1">{filtered[lightboxIdx].candidate_name}</p>
                )}
              </div>
            )}
            <p className="text-white/30 text-xs mt-2">{lightboxIdx + 1} / {filtered.length}</p>
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl z-10"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  )
}
