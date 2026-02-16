'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveMp3Url } from '@/app/admin/resultats/actions'

interface Props {
  candidateId: string
  sessionId: string
  slug: string
  existingMp3Url: string | null
  maxSizeMb: number
}

export default function Mp3Uploader({ candidateId, sessionId, slug, existingMp3Url, maxSizeMb }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(!!existingMp3Url)
  const [mp3Url, setMp3Url] = useState(existingMp3Url)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setError('')

    if (f) {
      if (!f.name.toLowerCase().endsWith('.mp3') && f.type !== 'audio/mpeg') {
        setError('Veuillez sélectionner un fichier MP3.')
        return
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`Le fichier est trop lourd (max ${maxSizeMb} Mo).`)
        return
      }
    }

    setFile(f)
    setSuccess(false)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    setProgress('Upload en cours...')

    try {
      const supabase = createClient()
      const path = `${sessionId}/${slug}/mp3`

      const { error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(path, file, { upsert: true })

      if (uploadError) throw new Error(`Upload échoué: ${uploadError.message}`)

      setProgress('Enregistrement...')
      const { data } = supabase.storage.from('candidates').getPublicUrl(path)
      const url = data.publicUrl

      const result = await saveMp3Url(candidateId, url)
      if ('error' in result && result.error) throw new Error(result.error)

      setMp3Url(url)
      setSuccess(true)
      setProgress('')
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      setProgress('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Already uploaded */}
      {success && mp3Url && (
        <div className="bg-[#0d0b1a]/90 border border-[#7ec850]/30 rounded-2xl p-6 text-center space-y-4 backdrop-blur-xl shadow-2xl">
          <div className="text-3xl">✅</div>
          <p className="text-[#7ec850] font-medium">Votre playback MP3 a bien été reçu !</p>
          <audio controls className="w-full h-10">
            <source src={mp3Url} type="audio/mpeg" />
          </audio>
          <p className="text-white/50 text-xs">
            Vous pouvez remplacer votre fichier en en sélectionnant un nouveau ci-dessous.
          </p>
        </div>
      )}

      {/* Upload zone */}
      <div className="bg-[#0d0b1a]/85 border border-white/15 rounded-2xl p-6 space-y-5 backdrop-blur-xl shadow-2xl">
        <div>
          <p className="text-white text-sm font-medium mb-1">
            {success ? 'Remplacer le fichier' : 'Sélectionnez votre playback MP3'}
          </p>
          <p className="text-white/50 text-xs">
            Fichier MP3 uniquement &middot; {maxSizeMb} Mo maximum &middot; Version instrumentale de votre chanson
          </p>
        </div>

        {/* File input */}
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full p-6 rounded-xl border-2 border-dashed transition-colors text-center ${
            file
              ? 'border-[#7ec850]/50 bg-[#7ec850]/10'
              : 'border-white/30 hover:border-[#e91e8c]/50 bg-white/5'
          }`}
        >
          {file ? (
            <div>
              <p className="text-[#7ec850] font-medium text-sm">🎵 {file.name}</p>
              <p className="text-white/50 text-xs mt-1">
                {(file.size / (1024 * 1024)).toFixed(1)} Mo
              </p>
            </div>
          ) : (
            <div>
              <p className="text-white/60 text-sm">🎵 Cliquez pour choisir un fichier MP3</p>
            </div>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white hover:opacity-90 shadow-lg"
        >
          {uploading ? progress : 'Envoyer mon playback MP3'}
        </button>
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-white/40 text-xs">
          Ce lien est personnel. Ne le partagez pas.
        </p>
      </div>
    </div>
  )
}
