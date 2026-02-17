'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateWinner, updateWinnerPhoto } from '@/app/admin/palmares/actions'

interface Winner {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string | null
  song_artist: string | null
  session_id: string
  slug: string
}

interface Edition {
  year: number
  name: string
  sessionId: string
  winners: Winner[]
}

export default function PalmaresAdmin({ editions }: { editions: Edition[] }) {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-2">
        Palmarès
      </h1>
      <p className="text-white/40 text-sm mb-8">
        Gérez les photos et informations des gagnants de chaque édition.
      </p>

      <div className="space-y-10">
        {editions.map((edition) => (
          <div key={edition.year}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-[#f5a623] to-[#e8732a] px-4 py-1.5 rounded-full">
                <span className="font-[family-name:var(--font-montserrat)] font-black text-sm text-white">
                  {edition.year}
                </span>
              </div>
              <h2 className="text-white font-semibold text-sm">{edition.name}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {edition.winners.map((winner) => (
                <WinnerCard key={winner.id} winner={winner} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {editions.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-white/30 text-sm">
            Aucun palmarès trouvé. Lancez le seed depuis la page Données test.
          </p>
        </div>
      )}
    </div>
  )
}

function WinnerCard({ winner }: { winner: Winner }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [firstName, setFirstName] = useState(winner.first_name)
  const [lastName, setLastName] = useState(winner.last_name)
  const [stageName, setStageName] = useState(winner.stage_name || '')
  const [songTitle, setSongTitle] = useState(winner.song_title || '')
  const [songArtist, setSongArtist] = useState(winner.song_artist || '')
  const [photoUrl, setPhotoUrl] = useState(winner.photo_url)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateWinner(winner.id, {
      first_name: firstName,
      last_name: lastName,
      stage_name: stageName,
      song_title: songTitle,
      song_artist: songArtist,
    })
    setSaving(false)
    if (res.error) {
      showToast(`Erreur: ${res.error}`)
    } else {
      showToast('Sauvegardé !')
      setEditing(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const storagePath = `${winner.session_id}/${winner.slug}/photo`

      const { error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(storagePath, file, { contentType: file.type, upsert: true })

      if (uploadError) {
        showToast(`Erreur upload: ${uploadError.message}`)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('candidates').getPublicUrl(storagePath)
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const res = await updateWinnerPhoto(winner.id, urlData.publicUrl)
      if (res.error) {
        showToast(`Erreur: ${res.error}`)
      } else {
        setPhotoUrl(newUrl)
        showToast('Photo mise à jour !')
      }
    } catch {
      showToast('Erreur inattendue')
    }
    setUploading(false)
  }

  const displayName = stageName || (lastName ? `${firstName} ${lastName}` : firstName)

  return (
    <div className="bg-[#161228]/80 border border-white/10 rounded-xl p-5 relative">
      {/* Toast */}
      {toast && (
        <div className="absolute top-2 right-2 bg-[#1a1232] border border-[#f5a623]/30 text-white text-xs px-3 py-1.5 rounded-lg z-10">
          {toast}
        </div>
      )}

      {/* Photo + upload */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative group">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1a1232] border-2 border-[#f5a623]/30 flex-shrink-0">
            <img
              src={photoUrl || `/images/placeholder-singer-${winner.category === 'Enfants' ? 1 : winner.category === 'Adolescents' ? 2 : 4}.png`}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <span className="text-white text-xs">{uploading ? '...' : '📷'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm truncate">{displayName}</h3>
          <p className="text-[#f5a623] text-xs font-medium">{winner.category}</p>
          {(songTitle || songArtist) && (
            <p className="text-white/30 text-xs mt-0.5 truncate">
              {songTitle}{songArtist && ` — ${songArtist}`}
            </p>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs w-full"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs w-full"
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <input
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs w-full"
            placeholder="Nom de scène (optionnel)"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs w-full"
              placeholder="Titre chanson"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
            />
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs w-full"
              placeholder="Artiste"
              value={songArtist}
              onChange={(e) => setSongArtist(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#f5a623] hover:bg-[#e8732a] text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setFirstName(winner.first_name)
                setLastName(winner.last_name)
                setStageName(winner.stage_name || '')
                setSongTitle(winner.song_title || '')
                setSongArtist(winner.song_artist || '')
              }}
              className="text-white/40 hover:text-white/70 text-xs px-3 py-1.5 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-white/30 hover:text-white/60 text-xs transition-colors"
        >
          Modifier les infos
        </button>
      )}
    </div>
  )
}
