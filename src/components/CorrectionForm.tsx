'use client'

import { useState } from 'react'
import { submitCorrection } from '@/app/corriger/actions'

const INPUT =
  'w-full bg-[#1a1232]/80 border border-[#2e2555] rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-sm sm:text-base text-[#f0eaf7] placeholder:text-[#6b5d85] focus:outline-none focus:border-[#e91e8c] focus:ring-1 focus:ring-[#e91e8c]/30 transition-colors'

const LABEL = 'block text-sm font-medium text-[#a899c2] mb-1.5'

const FIELD_LABELS: Record<string, string> = {
  song_title: 'Titre de la chanson',
  song_artist: 'Artiste original',
  video: 'Vidéo',
  photo: 'Photo',
}

/** Compress a photo client-side to max 1200px and JPEG ~85% quality */
async function compressPhoto(file: File, maxDim = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('Impossible de lire la photo'))
    img.src = URL.createObjectURL(file)
  })
}

/* ─── File Upload (mobile-friendly tap zone) ─── */
function FileZone({
  label,
  accept,
  file,
  onChange,
  maxSizeMb,
  hint,
  preview,
}: {
  label: string
  accept: string
  file: File | null
  onChange: (f: File | null) => void
  maxSizeMb: number
  hint?: string
  preview?: string
}) {
  const [sizeError, setSizeError] = useState('')

  function pick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return
      if (f.size > maxSizeMb * 1024 * 1024) {
        setSizeError(`Fichier trop lourd (max ${maxSizeMb} Mo)`)
        return
      }
      setSizeError('')
      onChange(f)
    }
    input.click()
  }

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <button
        type="button"
        onClick={pick}
        className={`w-full rounded-xl p-5 text-center transition-colors active:scale-[0.98] ${
          file
            ? 'border-2 border-[#7ec850]/40 bg-[#7ec850]/10 backdrop-blur-sm'
            : 'border-2 border-dashed border-[#6b5d85]/60 bg-[#1a1232]/80 backdrop-blur-sm hover:border-[#e91e8c]/50 active:border-[#e91e8c]'
        }`}
      >
        {preview && file ? (
          <div className="flex flex-col items-center gap-2">
            <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[#7ec850]/40" />
            <p className="text-sm text-[#7ec850] truncate max-w-full">{file.name}</p>
            <p className="text-xs text-[#6b5d85]">Appuyez pour changer</p>
          </div>
        ) : file ? (
          <div>
            <p className="text-sm text-[#7ec850] truncate">{file.name}</p>
            <p className="text-xs text-[#6b5d85] mt-1">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2 opacity-50">{accept.includes('image') ? '📷' : '🎬'}</p>
            <p className="text-white/60 text-sm">
              Appuyez pour <span className="text-[#e91e8c] font-medium">choisir un fichier</span>
            </p>
            {hint && <p className="text-white/40 text-xs mt-1">{hint}</p>}
            <p className="text-white/40 text-xs mt-1">Max {maxSizeMb} Mo</p>
          </div>
        )}
      </button>
      {sizeError && <p className="text-red-400 text-xs mt-1.5">{sizeError}</p>}
    </div>
  )
}

export default function CorrectionForm({
  token,
  candidateName,
  email,
  songTitle,
  songArtist,
  photoUrl,
  videoUrl,
  correctionFields,
  sessionId,
  candidateSlug,
  maxVideoSizeMb,
}: {
  token: string
  candidateName: string
  email: string
  songTitle: string
  songArtist: string
  photoUrl: string
  videoUrl: string
  correctionFields: string[]
  sessionId: string
  candidateSlug: string
  maxVideoSizeMb: number
}) {
  const [newSongTitle, setNewSongTitle] = useState(songTitle)
  const [newSongArtist, setNewSongArtist] = useState(songArtist)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState('')

  const canEditSongTitle = correctionFields.includes('song_title')
  const canEditSongArtist = correctionFields.includes('song_artist')
  const canEditVideo = correctionFields.includes('video')
  const canEditPhoto = correctionFields.includes('photo')

  function handlePhotoChange(f: File | null) {
    setPhotoFile(f)
    if (f) {
      setPhotoPreview(URL.createObjectURL(f))
    } else {
      setPhotoPreview(null)
    }
  }

  async function uploadFile(file: File, path: string): Promise<string> {
    // Get signed URL
    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, bucket: 'candidates' }),
    })
    const urlData = await urlRes.json()
    if (!urlRes.ok) throw new Error(urlData.error || 'Erreur URL signée')

    // Upload file directly to Storage
    const uploadRes = await fetch(urlData.signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })

    if (!uploadRes.ok) {
      if (uploadRes.status === 413) throw new Error('Fichier trop volumineux pour le serveur')
      throw new Error('Erreur upload')
    }

    return urlData.publicUrl
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    setProgress('')

    try {
      const updates: {
        song_title?: string
        song_artist?: string
        video_url?: string
        photo_url?: string
      } = {}

      // Text fields
      if (canEditSongTitle && newSongTitle.trim() !== songTitle) {
        updates.song_title = newSongTitle.trim()
      }
      if (canEditSongArtist && newSongArtist.trim() !== songArtist) {
        updates.song_artist = newSongArtist.trim()
      }

      // Upload video
      if (canEditVideo && videoFile) {
        setProgress('Upload de la vidéo en cours...')
        const ext = videoFile.name.split('.').pop() || 'mp4'
        const path = `${sessionId}/${candidateSlug}/video-correction-${Date.now()}.${ext}`
        updates.video_url = await uploadFile(videoFile, path)
      }

      // Upload photo
      if (canEditPhoto && photoFile) {
        setProgress('Upload de la photo en cours...')
        const compressed = await compressPhoto(photoFile)
        const path = `${sessionId}/${candidateSlug}/photo-correction-${Date.now()}.jpg`
        updates.photo_url = await uploadFile(compressed, path)
      }

      // Check that at least one field was modified
      if (Object.keys(updates).length === 0) {
        setError('Aucune modification détectée. Modifiez au moins un champ.')
        setSubmitting(false)
        setProgress('')
        return
      }

      setProgress('Sauvegarde...')
      const result = await submitCorrection(token, updates)

      if (result.error) {
        setError(result.error)
        setSubmitting(false)
        setProgress('')
        return
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    }

    setSubmitting(false)
    setProgress('')
  }

  if (done) {
    return (
      <div className="text-center space-y-4 py-12">
        <div className="text-6xl">✅</div>
        <h2 className="font-bold text-xl">Correction envoyée !</h2>
        <p className="text-white/50 text-sm">
          Votre correction a été transmise. L&apos;organisateur sera notifié et vérifiera vos modifications.
        </p>
        <p className="text-white/30 text-xs mt-4">
          Vous pouvez réutiliser ce lien si vous avez besoin de corriger à nouveau.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1232]/60 border border-[#2e2555] rounded-xl p-4">
        <h2 className="font-bold text-lg mb-1">Corriger ma candidature</h2>
        <p className="text-white/40 text-sm">
          L&apos;organisateur vous demande de corriger les champs suivants :
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {correctionFields.map((f) => (
            <span key={f} className="px-2.5 py-1 rounded-full bg-[#e91e8c]/10 border border-[#e91e8c]/30 text-[#e91e8c] text-xs font-medium">
              {FIELD_LABELS[f] || f}
            </span>
          ))}
        </div>
      </div>

      {/* Read-only identity */}
      <div className="space-y-3 opacity-60">
        <div>
          <label className={LABEL}>Nom</label>
          <p className="text-white text-sm bg-[#1a1232]/40 border border-[#2e2555]/50 rounded-xl px-4 py-3">{candidateName}</p>
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <p className="text-white text-sm bg-[#1a1232]/40 border border-[#2e2555]/50 rounded-xl px-4 py-3">{email}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        {canEditSongTitle && (
          <div>
            <label className={LABEL}>Titre de la chanson <span className="text-[#e91e8c]">*</span></label>
            <input
              type="text"
              value={newSongTitle}
              onChange={(e) => setNewSongTitle(e.target.value)}
              className={INPUT}
              placeholder="Ex: Le dernier jour du disco"
            />
            {songTitle && (
              <p className="text-white/30 text-xs mt-1">Valeur actuelle : {songTitle}</p>
            )}
          </div>
        )}

        {canEditSongArtist && (
          <div>
            <label className={LABEL}>Artiste original <span className="text-[#e91e8c]">*</span></label>
            <input
              type="text"
              value={newSongArtist}
              onChange={(e) => setNewSongArtist(e.target.value)}
              className={INPUT}
              placeholder="Ex: Juliette Armanet"
            />
            {songArtist && (
              <p className="text-white/30 text-xs mt-1">Valeur actuelle : {songArtist}</p>
            )}
          </div>
        )}

        {canEditVideo && (
          <div>
            <FileZone
              label="Nouvelle vidéo"
              accept="video/*"
              file={videoFile}
              onChange={setVideoFile}
              maxSizeMb={maxVideoSizeMb}
              hint={`Formats : MP4, MOV, WebM — Max ${maxVideoSizeMb} Mo`}
            />
            {videoUrl && (
              <p className="text-white/30 text-xs mt-1.5">
                Une vidéo est déjà enregistrée. Le nouveau fichier remplacera l&apos;ancien.
              </p>
            )}
          </div>
        )}

        {canEditPhoto && (
          <div>
            <FileZone
              label="Nouvelle photo"
              accept="image/*"
              file={photoFile}
              onChange={handlePhotoChange}
              maxSizeMb={10}
              preview={photoPreview || undefined}
              hint="Formats : JPG, PNG — sera compressée automatiquement"
            />
            {photoUrl && (
              <p className="text-white/30 text-xs mt-1.5">
                Une photo est déjà enregistrée. La nouvelle photo remplacera l&apos;ancienne.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {progress && (
        <div className="bg-[#e91e8c]/10 border border-[#e91e8c]/30 rounded-xl px-4 py-3 text-[#e91e8c] text-sm flex items-center gap-2">
          <span className="animate-spin">⏳</span> {progress}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#e91e8c] to-[#7e3af2] hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {submitting ? 'Envoi en cours...' : 'Envoyer la correction'}
      </button>

      <p className="text-white/20 text-xs text-center">
        Vous pouvez réutiliser ce lien tant que votre candidature n&apos;a pas été validée.
      </p>
    </div>
  )
}
