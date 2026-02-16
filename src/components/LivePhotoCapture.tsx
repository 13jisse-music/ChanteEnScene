'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'

interface Props {
  sessionId: string
  liveEventId: string
  currentCandidateId: string | null
  currentCandidateName: string | null
}

const MAX_PHOTOS = 5
const COOLDOWN_MS = 30_000 // 30 seconds between photos
const MAX_SIZE = 1200 // max dimension in px

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round(height * (MAX_SIZE / width))
          width = MAX_SIZE
        } else {
          width = Math.round(width * (MAX_SIZE / height))
          height = MAX_SIZE
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        0.8
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}

export default function LivePhotoCapture({ sessionId, liveEventId, currentCandidateId, currentCandidateName }: Props) {
  const [photoCount, setPhotoCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [lastUploadAt, setLastUploadAt] = useState(0)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const fpRef = useRef<string | null>(null)

  // Load saved info from localStorage + count existing photos
  useEffect(() => {
    const saved = localStorage.getItem('crowd_photo_info')
    if (saved) {
      try {
        const { name: n, email: e } = JSON.parse(saved)
        if (n) setName(n)
        if (e) setEmail(e)
      } catch { /* ignore */ }
    }

    async function loadCount() {
      const fp = await getFingerprint()
      fpRef.current = fp
      const supabase = createClient()
      const { count } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('fingerprint', fp)
        .eq('live_event_id', liveEventId)
      setPhotoCount(count || 0)
    }
    loadCount()
  }, [liveEventId])

  const remaining = MAX_PHOTOS - photoCount
  const cooldownActive = Date.now() - lastUploadAt < COOLDOWN_MS

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input for next use
    if (fileRef.current) fileRef.current.value = ''

    // Validate
    if (remaining <= 0) {
      setError('Limite atteinte (5 photos max)')
      return
    }
    if (cooldownActive) {
      setError('Attendez quelques secondes...')
      return
    }
    if (!email.trim()) {
      setError('Email requis pour soumettre')
      setExpanded(true)
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const fp = fpRef.current || await getFingerprint()
      const supabase = createClient()

      // Compress image
      const blob = await compressImage(file)

      // Upload to storage
      const fileName = `crowd_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const path = `photos/${sessionId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, blob, { contentType: 'image/jpeg' })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)

      // Insert into photos table
      const { error: insertError } = await supabase.from('photos').insert({
        session_id: sessionId,
        photo_url: urlData.publicUrl,
        caption: currentCandidateName ? `Photo prise pendant la performance de ${currentCandidateName}` : null,
        tag_type: 'event',
        tag_event: 'final',
        tag_candidate_id: currentCandidateId || null,
        published: false,
        source: 'crowd',
        submitted_by_name: name.trim() || null,
        submitted_by_email: email.trim(),
        fingerprint: fp,
        live_event_id: liveEventId,
      })

      if (insertError) throw new Error(insertError.message)

      // Save info for next time
      localStorage.setItem('crowd_photo_info', JSON.stringify({ name: name.trim(), email: email.trim() }))

      setPhotoCount((c) => c + 1)
      setLastUploadAt(Date.now())
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    } finally {
      setUploading(false)
    }
  }, [sessionId, liveEventId, currentCandidateId, currentCandidateName, email, name, remaining, cooldownActive])

  if (remaining <= 0 && !success) {
    return (
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-3 text-center">
        <p className="text-white/30 text-xs">Merci pour vos 5 photos !</p>
      </div>
    )
  }

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e91e8c]/10 flex items-center justify-center shrink-0">
            <span className="text-lg">📸</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Mode Reporter</p>
            <p className="text-[10px] text-white/30">
              Photographiez la soirée — {remaining} photo{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <span className="text-white/20 text-xs">{expanded ? '▴' : '▾'}</span>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#2a2545]">
          <p className="text-white/40 text-xs pt-3 leading-relaxed">
            Immortalisez les meilleurs moments de la soirée ! Vos plus belles photos seront publiées
            dans la galerie officielle avec votre nom.
          </p>

          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0d0b1a] border border-[#2a2545] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c]"
            />
            <input
              type="email"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#0d0b1a] border border-[#2a2545] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c]"
              required
            />
          </div>

          {/* Capture button */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          <button
            onClick={() => {
              if (!email.trim()) {
                setError('Renseignez votre email pour participer')
                return
              }
              fileRef.current?.click()
            }}
            disabled={uploading || cooldownActive || remaining <= 0}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : cooldownActive ? (
              'Patientez...'
            ) : (
              <>📷 Prendre une photo</>
            )}
          </button>

          {/* Feedback */}
          {success && (
            <div className="bg-[#7ec850]/10 border border-[#7ec850]/25 rounded-lg p-2 text-center">
              <p className="text-[#7ec850] text-xs font-medium">Photo envoyee ! Merci 🎉</p>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-2 text-center">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Remaining counter */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < photoCount ? 'bg-[#e91e8c]' : 'bg-[#2a2545]'}`}
                />
              ))}
            </div>
            <p className="text-white/20 text-[10px]">{photoCount}/{MAX_PHOTOS}</p>
          </div>
        </div>
      )}
    </div>
  )
}
