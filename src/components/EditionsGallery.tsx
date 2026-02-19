'use client'

import { useState, useRef, useCallback, useEffect } from 'react'


interface Photo {
  id: string
  photo_url: string
  caption: string | null
  tag_event: string | null
  candidate_name: string | null
}

interface Video {
  id: string
  youtube_url: string
  title: string
  description: string | null
  thumbnail_url: string | null
}

interface Edition {
  id: string
  name: string
  slug: string
  city: string
  year: number
  status: string
  is_active: boolean
  photos: Photo[]
  videos: Video[]
}

interface Props {
  editions: Edition[]
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function YearBanner({ year, name, city, isOpen, onToggle, photoCount }: { year: number; name: string; city: string; isOpen: boolean; onToggle: () => void; photoCount: number }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 sm:gap-4 text-left group"
    >
      <div className="bg-gradient-to-r from-[#e91e8c] to-[#f5a623] px-3 py-1.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-[#e91e8c]/20 shrink-0">
        <span className="font-[family-name:var(--font-montserrat)] font-black text-lg sm:text-2xl md:text-3xl text-white">
          {year}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-white text-sm sm:text-base md:text-lg truncate">{name}</h2>
        <p className="text-white/40 text-[11px] sm:text-sm truncate">
          {city} — Julien aka <a
            href="https://www.instagram.com/playy_mo/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-[#e91e8c] transition-colors"
          >Playymo</a> &#128247;&#10084;&#65039;
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {photoCount > 0 && (
          <span className="text-white/30 text-[10px] sm:text-xs hidden sm:block">{photoCount} photos</span>
        )}
        <span className={`text-white/40 text-sm sm:text-lg transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </div>
    </button>
  )
}

function VideoSection({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">
        Videos
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video) => {
          const ytId = extractYoutubeId(video.youtube_url)
          if (!ytId) return null
          return (
            <div key={video.id} className="rounded-2xl overflow-hidden bg-[#161228]/80 border border-white/10">
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <div className="px-4 py-3">
                <p className="text-white font-medium text-sm">{video.title}</p>
                {video.description && (
                  <p className="text-white/40 text-xs mt-1">{video.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PhotoGrid({ photos, onOpenLightbox }: { photos: Photo[]; onOpenLightbox: (photos: Photo[], startIdx: number) => void }) {
  const [showAll, setShowAll] = useState(false)
  const INITIAL_COUNT = 18

  if (photos.length === 0) return null

  const visible = showAll ? photos : photos.slice(0, INITIAL_COUNT)
  const hasMore = photos.length > INITIAL_COUNT

  return (
    <div>
      <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">
        Photos ({photos.length})
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {visible.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => onOpenLightbox(photos, idx)}
            className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
          >
            <img
              src={photo.photo_url}
              alt={photo.caption || ''}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {(photo.caption || photo.candidate_name) && (
                <p className="absolute bottom-3 left-3 right-3 text-white text-xs truncate">
                  {photo.caption || photo.candidate_name}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {hasMore && !showAll && (
        <div className="text-center mt-6">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/20 text-sm font-medium transition-all"
          >
            Voir les {photos.length - INITIAL_COUNT} autres photos
          </button>
        </div>
      )}
    </div>
  )
}

function Lightbox({ photos, startIdx, onClose }: { photos: Photo[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  const [offsetY, setOffsetY] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const swiping = useRef(false)

  const prev = useCallback(() => setIdx(i => i > 0 ? i - 1 : photos.length - 1), [photos.length])
  const next = useCallback(() => setIdx(i => i < photos.length - 1 ? i + 1 : 0), [photos.length])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() }
    swiping.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current) return
    const t = e.touches[0]
    const dy = t.clientY - touchStart.current.y
    const dx = t.clientX - touchStart.current.x

    // If mostly vertical movement (up or down), show drag-to-close feedback
    if (Math.abs(dy) > Math.abs(dx)) {
      swiping.current = true
      setOffsetY(dy)
      setOpacity(Math.max(0.3, 1 - Math.abs(dy) / 400))
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    const dt = Date.now() - touchStart.current.time

    // Swipe up or down to close (drag > 120px or fast flick)
    const absDy = Math.abs(dy)
    if (absDy > 120 || (absDy > 50 && dt < 300 && Math.abs(dy) > Math.abs(dx))) {
      onClose()
      return
    }

    // Horizontal swipe for prev/next
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev()
      else next()
    }

    // Reset
    setOffsetY(0)
    setOpacity(1)
    touchStart.current = null
    swiping.current = false
  }

  const photo = photos[idx]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{ backgroundColor: `rgba(0,0,0,${opacity})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar with close + counter */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <p className="text-white/40 text-sm">{idx + 1} / {photos.length}</p>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg"
        >
          &times;
        </button>
      </div>

      {/* Photo area */}
      <div
        className="flex-1 flex items-center justify-center px-4 min-h-0 relative"
        style={{
          transform: `translateY(${offsetY}px)`,
          opacity,
          transition: swiping.current ? 'none' : 'transform 0.2s, opacity 0.2s',
        }}
      >
        {/* Desktop prev/next buttons */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white text-lg z-10 hidden md:flex"
        >
          &lt;
        </button>

        <img
          src={photo.photo_url}
          alt={photo.caption || ''}
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
        />

        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white text-lg z-10 hidden md:flex"
        >
          &gt;
        </button>
      </div>

      {/* Bottom caption */}
      <div className="shrink-0 px-4 py-3 text-center">
        {(photo.caption || photo.candidate_name) && (
          <p className="text-white/60 text-xs">
            {photo.caption || photo.candidate_name}
          </p>
        )}
        <p className="text-white/20 text-[10px] mt-1">Swiper pour naviguer</p>
      </div>
    </div>
  )
}

export default function EditionsGallery({ editions }: Props) {
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; startIdx: number } | null>(null)
  // First edition with content is open by default
  const firstWithContent = editions.find(e => e.photos.length > 0 || e.videos.length > 0)
  const [openYears, setOpenYears] = useState<Set<number>>(
    new Set(firstWithContent ? [firstWithContent.year] : [])
  )

  function toggleYear(year: number) {
    setOpenYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  function openLightbox(photos: Photo[], startIdx: number) {
    setLightbox({ photos, startIdx })
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-12">
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-3"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Les <span className="text-[#e91e8c]">Editions</span>
        </h1>
        <p className="text-white/50 text-sm">
          Revivez chaque edition de ChanteEnScene en photos et videos
        </p>
      </div>

      {/* Editions list */}
      <div className="space-y-6">
        {editions.map((edition) => {
          const hasContent = edition.photos.length > 0 || edition.videos.length > 0
          const isOpen = openYears.has(edition.year)

          return (
            <div
              key={edition.id}
              className="bg-[#161228]/40 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="p-4 md:p-5">
                <YearBanner
                  year={edition.year}
                  name={edition.name}
                  city={edition.city}
                  isOpen={isOpen}
                  onToggle={() => toggleYear(edition.year)}
                  photoCount={edition.photos.length}
                />
              </div>

              {isOpen && (
                <div className="px-4 md:px-5 pb-5">
                  {hasContent ? (
                    <div className="space-y-6 pt-2 border-t border-white/5">
                      <div className="pt-4">
                        <VideoSection videos={edition.videos} />
                        <PhotoGrid photos={edition.photos} onOpenLightbox={openLightbox} />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-white/20 text-sm text-center py-6">
                        Pas de contenu disponible pour cette edition
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          startIdx={lightbox.startIdx}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
