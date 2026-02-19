'use client'

import { useState, useTransition } from 'react'
import {
  toggleEditionPhoto,
  bulkToggleEditionPhotos,
  deleteEditionPhoto,
  addEditionVideo,
  toggleEditionVideo,
  deleteEditionVideo,
} from '@/app/admin/editions/actions'

interface Session {
  id: string
  name: string
  year: number
  status: string
}

interface Photo {
  id: string
  session_id: string
  photo_url: string
  caption: string | null
  tag_event: string | null
  published: boolean
}

interface Video {
  id: string
  session_id: string
  youtube_url: string
  title: string
  description: string | null
  published: boolean
}

interface Props {
  sessions: Session[]
  photos: Photo[]
  videos: Video[]
}

export default function EditionsAdmin({ sessions, photos, videos }: Props) {
  const archivedSessions = sessions.filter((s) => s.status === 'archived')
  const [activeYear, setActiveYear] = useState<number>(archivedSessions[0]?.year || 2025)
  const [isPending, startTransition] = useTransition()
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDesc, setVideoDesc] = useState('')

  const activeSession = archivedSessions.find((s) => s.year === activeYear)
  const sessionPhotos = photos.filter((p) => p.session_id === activeSession?.id)
  const sessionVideos = videos.filter((v) => v.session_id === activeSession?.id)

  const publishedCount = sessionPhotos.filter((p) => p.published).length
  const unpublishedCount = sessionPhotos.filter((p) => !p.published).length

  function handleTogglePhoto(id: string, published: boolean) {
    startTransition(async () => { await toggleEditionPhoto(id, published) })
  }

  function handleDeletePhoto(id: string) {
    if (!confirm('Supprimer cette photo ?')) return
    startTransition(async () => { await deleteEditionPhoto(id) })
  }

  function handlePublishAll() {
    const ids = sessionPhotos.filter((p) => !p.published).map((p) => p.id)
    if (ids.length === 0) return
    startTransition(async () => { await bulkToggleEditionPhotos(ids, true) })
  }

  function handleUnpublishAll() {
    const ids = sessionPhotos.filter((p) => p.published).map((p) => p.id)
    if (ids.length === 0) return
    startTransition(async () => { await bulkToggleEditionPhotos(ids, false) })
  }

  function handleAddVideo(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSession || !videoUrl || !videoTitle) return
    startTransition(async () => {
      await addEditionVideo(activeSession.id, videoUrl, videoTitle, videoDesc)
      setVideoUrl('')
      setVideoTitle('')
      setVideoDesc('')
      setShowVideoForm(false)
    })
  }

  function handleToggleVideo(id: string, published: boolean) {
    startTransition(async () => { await toggleEditionVideo(id, published) })
  }

  function handleDeleteVideo(id: string) {
    if (!confirm('Supprimer cette video ?')) return
    startTransition(async () => { await deleteEditionVideo(id) })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Galerie des Editions</h1>

      {/* Year tabs */}
      <div className="flex gap-2 mb-8">
        {archivedSessions.map((s) => (
          <button
            key={s.year}
            onClick={() => setActiveYear(s.year)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeYear === s.year
                ? 'bg-[#e91e8c] text-white'
                : 'bg-white/10 text-white/50 hover:text-white'
            }`}
          >
            {s.year}
          </button>
        ))}
      </div>

      {activeSession && (
        <>
          {/* ── VIDEOS ── */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Videos YouTube — {activeYear}
              </h2>
              <button
                onClick={() => setShowVideoForm(!showVideoForm)}
                className="px-4 py-2 bg-[#e91e8c] text-white rounded-lg text-sm font-medium hover:bg-[#d11a7a]"
              >
                + Ajouter une video
              </button>
            </div>

            {showVideoForm && (
              <form onSubmit={handleAddVideo} className="bg-[#161228] border border-white/10 rounded-xl p-4 mb-4 space-y-3">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="URL YouTube (ex: https://www.youtube.com/watch?v=...)"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  required
                />
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Titre de la video"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  required
                />
                <input
                  type="text"
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  placeholder="Description (optionnel)"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVideoForm(false)}
                    className="px-4 py-2 bg-white/10 text-white/60 rounded-lg text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {sessionVideos.length > 0 ? (
              <div className="space-y-2">
                {sessionVideos.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center gap-4 bg-[#161228] border rounded-xl p-4 ${
                      v.published ? 'border-green-500/30' : 'border-white/10 opacity-60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{v.title}</p>
                      <p className="text-white/30 text-xs truncate">{v.youtube_url}</p>
                      {v.description && <p className="text-white/40 text-xs mt-1">{v.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleVideo(v.id, !v.published)}
                        disabled={isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          v.published
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-white/10 text-white/40 hover:text-white'
                        }`}
                      >
                        {v.published ? 'Publie' : 'Non publie'}
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(v.id)}
                        disabled={isPending}
                        className="px-2 py-1.5 text-red-400/60 hover:text-red-400 text-xs"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/20 text-sm">Aucune video pour cette edition</p>
            )}
          </div>

          {/* ── PHOTOS ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Photos — {activeYear}
                <span className="text-white/30 text-sm font-normal ml-3">
                  {publishedCount} publiees / {unpublishedCount} non publiees
                </span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePublishAll}
                  disabled={isPending || unpublishedCount === 0}
                  className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/30 disabled:opacity-30"
                >
                  Tout publier ({unpublishedCount})
                </button>
                <button
                  onClick={handleUnpublishAll}
                  disabled={isPending || publishedCount === 0}
                  className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 disabled:opacity-30"
                >
                  Tout depublier ({publishedCount})
                </button>
              </div>
            </div>

            {sessionPhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {sessionPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative group rounded-xl overflow-hidden ${
                      photo.published ? '' : 'opacity-40'
                    }`}
                  >
                    <div className="aspect-square">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || ''}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Published indicator */}
                    {photo.published && (
                      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500 shadow" />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => handleTogglePhoto(photo.id, !photo.published)}
                        disabled={isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          photo.published
                            ? 'bg-orange-600/80 text-white'
                            : 'bg-green-600/80 text-white'
                        }`}
                      >
                        {photo.published ? 'Depublier' : 'Publier'}
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg text-xs bg-red-600/80 text-white"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#161228]/40 rounded-2xl border border-white/5">
                <p className="text-white/20 text-sm">
                  Aucune photo pour cette edition.
                </p>
                <p className="text-white/10 text-xs mt-2">
                  Utilise le script import-photos-2025.js pour importer des photos
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
