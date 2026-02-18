'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateCandidateProfile, updateCandidatePhoto, updateFinaleSongs } from '@/app/[slug]/mon-profil/actions'
import type { FinaleSong } from '@/app/[slug]/mon-profil/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  email: string
  phone: string | null
  city: string | null
  category: string
  photo_url: string | null
  bio: string | null
  accent_color: string
  song_title: string | null
  song_artist: string | null
  status: string
  slug: string
  youtube_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  website_url: string | null
  finale_songs: FinaleSong[] | null
}

interface Props {
  candidate: Candidate
  sessionSlug: string
}

const EMPTY_SONG: FinaleSong = { title: '', artist: '', youtube_url: '' }

const ACCENT_COLORS = [
  '#E91E8C', '#FF6B9D', '#e8541e', '#f5a623',
  '#7ec850', '#3b82f6', '#8b5cf6', '#ef4444',
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente de validation', color: '#f59e0b' },
  approved: { label: 'Candidature validée', color: '#7ec850' },
  rejected: { label: 'Candidature refusée', color: '#ef4444' },
  semifinalist: { label: 'Demi-finaliste', color: '#3b82f6' },
  finalist: { label: 'Finaliste', color: '#8b5cf6' },
  winner: { label: 'Gagnant(e) !', color: '#f5a623' },
}

export default function CandidateProfile({ candidate, sessionSlug }: Props) {
  const isFinalist = candidate.status === 'finalist' || candidate.status === 'winner'

  const [stageName, setStageName] = useState(candidate.stage_name || '')
  const [bio, setBio] = useState(candidate.bio || '')
  const [accentColor, setAccentColor] = useState(candidate.accent_color || '#E91E8C')
  const [songTitle, setSongTitle] = useState(candidate.song_title || '')
  const [songArtist, setSongArtist] = useState(candidate.song_artist || '')
  const [city, setCity] = useState(candidate.city || '')
  const [phone, setPhone] = useState(candidate.phone || '')
  const [photoUrl, setPhotoUrl] = useState(candidate.photo_url)
  const [youtubeUrl, setYoutubeUrl] = useState(candidate.youtube_url || '')
  const [instagramUrl, setInstagramUrl] = useState(candidate.instagram_url || '')
  const [tiktokUrl, setTiktokUrl] = useState(candidate.tiktok_url || '')
  const [websiteUrl, setWebsiteUrl] = useState(candidate.website_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Finale songs state
  const initSongs = candidate.finale_songs && candidate.finale_songs.length > 0
    ? candidate.finale_songs
    : [{ ...EMPTY_SONG }]
  const [finaleSongs, setFinaleSongs] = useState<FinaleSong[]>(initSongs)
  const [savingSongs, setSavingSongs] = useState(false)

  const st = STATUS_LABELS[candidate.status] || { label: candidate.status, color: '#666' }
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

  function updateSong(index: number, field: keyof FinaleSong, value: string) {
    setFinaleSongs(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function addSong() {
    if (finaleSongs.length < 3) {
      setFinaleSongs(prev => [...prev, { ...EMPTY_SONG }])
    }
  }

  function removeSong(index: number) {
    if (finaleSongs.length > 1) {
      setFinaleSongs(prev => prev.filter((_, i) => i !== index))
    }
  }

  async function handleSaveFinaleSongs() {
    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Le numéro de téléphone est obligatoire pour la coordination avec les musiciens.' })
      return
    }
    const filledSongs = finaleSongs.filter(s => s.title.trim() || s.artist.trim())
    if (filledSongs.length === 0) {
      setMessage({ type: 'error', text: 'Veuillez renseigner au moins un morceau.' })
      return
    }
    setSavingSongs(true)
    setMessage(null)
    const result = await updateFinaleSongs(candidate.id, candidate.slug, filledSongs, phone)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Vos propositions de morceaux ont été enregistrées !' })
      setTimeout(() => setMessage(null), 4000)
    }
    setSavingSongs(false)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const result = await updateCandidateProfile(candidate.id, candidate.slug, {
      stage_name: stageName,
      bio,
      accent_color: accentColor,
      song_title: songTitle,
      song_artist: songArtist,
      city,
      phone,
      youtube_url: youtubeUrl,
      instagram_url: instagramUrl,
      tiktok_url: tiktokUrl,
      website_url: websiteUrl,
    })

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Profil sauvegardé !' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `candidates/${candidate.id}/photo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setMessage({ type: 'error', text: `Erreur upload: ${uploadError.message}` })
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

    const result = await updateCandidatePhoto(candidate.id, candidate.slug, publicUrl)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setPhotoUrl(publicUrl)
      setMessage({ type: 'success', text: 'Photo mise à jour !' })
      setTimeout(() => setMessage(null), 3000)
    }
    setUploading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-2"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Mon profil
        </h1>
        <span
          className="inline-block px-4 py-1.5 rounded-full text-sm font-medium"
          style={{ background: `${st.color}20`, color: st.color }}
        >
          {st.label}
        </span>
      </div>

      {message && (
        <div className={`rounded-xl p-4 text-sm ${
          message.type === 'success'
            ? 'bg-[#7ec850]/10 border border-[#7ec850]/30 text-[#7ec850]'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* ============================================ */}
      {/* FINALIST VIEW - Read-only profile + songs    */}
      {/* ============================================ */}
      {isFinalist ? (
        <>
          {/* Finalist banner */}
          <div className="bg-gradient-to-r from-[#8b5cf6]/10 to-[#e91e8c]/10 border border-[#8b5cf6]/30 rounded-2xl p-6 space-y-4">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white text-center">
              Félicitations, vous êtes en finale !
            </h2>
            <div className="text-white/70 text-sm space-y-3 leading-relaxed">
              <p>
                La finale est un <strong className="text-white">concert live</strong> où vous chanterez accompagné(e) par des musiciens professionnels sur scène.
                Le public présent dans la salle votera en direct pour élire le ou la gagnant(e).
              </p>
              <p>
                Pour préparer au mieux votre prestation, nous vous invitons à proposer <strong className="text-white">2 à 3 morceaux</strong> que
                les musiciens apprendront pour vous accompagner. Pensez à varier vos choix :
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>Un morceau <strong className="text-white/80">émotionnel ou calme</strong> pour montrer votre sensibilité vocale</li>
                <li>Un morceau <strong className="text-white/80">dynamique et entrainant</strong> pour embarquer le public avec vous</li>
              </ul>
              <p>
                Ajoutez un <strong className="text-white">lien YouTube</strong> vers la version de référence pour chaque morceau afin que les musiciens puissent les préparer au mieux.
              </p>
            </div>
          </div>

          {/* Photo (read-only) */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-2">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, ${candidate.accent_color || '#E91E8C'}, #e8732a, ${candidate.accent_color || '#E91E8C'})`,
                  padding: '3px',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
                }}
              />
              <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#1a1232]">
                {photoUrl ? (
                  <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-white/20">
                    🎤
                  </div>
                )}
              </div>
            </div>
            <p className="text-white font-bold text-lg">{displayName}</p>
          </div>

          {/* Identity + Phone */}
          <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{candidate.first_name} {candidate.last_name}</p>
                <p className="text-white/40 text-xs">{candidate.category}{candidate.city ? ` — ${candidate.city}` : ''}</p>
              </div>
              <p className="text-white/40 text-xs">{candidate.email}</p>
            </div>
            <div className="border-t border-[#2a2545] pt-4">
              <p className="text-white/50 text-xs mb-2">
                Votre numéro est indispensable pour la coordination avec les musiciens via WhatsApp.
              </p>
              <div>
                <label className="text-white/40 text-xs block mb-1">Téléphone *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Finale songs section */}
          <div className="bg-[#161228]/80 border border-[#8b5cf6]/20 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-white">
                Mes morceaux pour la finale
              </h3>
              <span className="text-white/30 text-xs">{finaleSongs.length}/3</span>
            </div>

            {finaleSongs.map((song, idx) => (
              <div key={idx} className="bg-[#1a1533]/80 border border-[#2a2545] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs font-medium">Morceau {idx + 1}</span>
                  {finaleSongs.length > 1 && (
                    <button
                      onClick={() => removeSong(idx)}
                      className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-xs block mb-1">Titre *</label>
                    <input
                      value={song.title}
                      onChange={(e) => updateSong(idx, 'title', e.target.value)}
                      placeholder="Titre du morceau"
                      className="w-full px-3 py-2 rounded-lg bg-[#161228] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#8b5cf6]/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs block mb-1">Artiste *</label>
                    <input
                      value={song.artist}
                      onChange={(e) => updateSong(idx, 'artist', e.target.value)}
                      placeholder="Artiste original"
                      className="w-full px-3 py-2 rounded-lg bg-[#161228] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#8b5cf6]/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1">Lien YouTube <span className="text-white/20">(optionnel — version de référence pour les musiciens)</span></label>
                  <input
                    value={song.youtube_url}
                    onChange={(e) => updateSong(idx, 'youtube_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-lg bg-[#161228] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#8b5cf6]/50 focus:outline-none"
                  />
                </div>
              </div>
            ))}

            {finaleSongs.length < 3 && (
              <button
                onClick={addSong}
                className="w-full py-3 rounded-xl border border-dashed border-[#8b5cf6]/30 text-[#8b5cf6]/70 hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 text-sm transition-colors"
              >
                + Ajouter un morceau
              </button>
            )}

            <button
              onClick={handleSaveFinaleSongs}
              disabled={savingSongs}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all disabled:opacity-50"
            >
              {savingSongs ? 'Enregistrement...' : 'Enregistrer mes morceaux'}
            </button>

            {/* Share buttons (visible only after songs are saved) */}
            {candidate.finale_songs && candidate.finale_songs.length > 0 && (
              <div className="border-t border-[#2a2545] pt-4 space-y-3">
                <p className="text-white/40 text-xs text-center">Partager vos morceaux avec les musiciens</p>
                <button
                  onClick={() => {
                    const songs = candidate.finale_songs || []
                    const lines = songs.map((s, i) =>
                      `${i + 1}. *${s.title}* — ${s.artist}${s.youtube_url ? `\n   ${s.youtube_url}` : ''}`
                    ).join('\n')
                    const text = `🎤 *${displayName}* — Morceaux pour la finale\n📞 ${phone || candidate.phone || ''}\n\n${lines}`
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.47 14.38c-.29-.15-1.71-.84-1.98-.94-.27-.1-.46-.15-.66.15-.2.29-.76.94-.93 1.13-.17.2-.34.22-.63.07-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.15 4.99 4.42.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.08 1.71-.7 1.95-1.37.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34zm-5.42 7.4c-1.94 0-3.84-.52-5.5-1.51l-.39-.24-4.1 1.08 1.1-4.01-.26-.41A10.86 10.86 0 0 1 1.17 12C1.17 6.01 6.01 1.17 12.05 1.17 17.98 1.17 22.82 6.01 22.82 12c0 5.98-4.88 10.83-10.87 10.83l.1-.05zm9.26-20.2A11.81 11.81 0 0 0 12.05 0C5.46 0 .08 5.38.08 12c0 2.12.55 4.19 1.6 6.01L0 24l6.16-1.62A11.93 11.93 0 0 0 12.05 24c6.58 0 11.92-5.38 11.92-12 0-3.2-1.24-6.2-3.5-8.47l-.06.05z"/></svg>
                  Partager sur WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Public profile link */}
          <div className="text-center">
            <a
              href={`/${sessionSlug}/candidats/${candidate.slug}`}
              className="text-sm text-white/40 hover:text-[#e91e8c] transition-colors"
            >
              Voir mon profil public →
            </a>
          </div>
        </>
      ) : (
        /* ============================================ */
        /* NORMAL VIEW - Editable profile               */
        /* ============================================ */
        <>
          {/* Semifinalist action banner */}
          {candidate.status === 'semifinalist' && (
            <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#e91e8c]/10 border border-[#3b82f6]/30 rounded-2xl p-5 space-y-3">
              <p className="text-white/70 text-sm text-center">
                Vous êtes qualifié(e) pour la demi-finale !
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={`/checkin/${candidate.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:shadow-lg hover:shadow-[#3b82f6]/30 transition-all"
                >
                  📍 Check-in demi-finale
                </a>
                <a
                  href={`/upload-mp3/${candidate.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
                >
                  🎵 Envoyer mon playback
                </a>
              </div>
            </div>
          )}

          {/* Photo */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <div
                className="absolute inset-0 rounded-full animate-glow-ring"
                style={{
                  background: `conic-gradient(from 0deg, ${accentColor}, #e8732a, ${accentColor})`,
                  padding: '3px',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
                }}
              />
              <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#1a1232]">
                {photoUrl ? (
                  <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-white/20">
                    🎤
                  </div>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm text-[#e91e8c] hover:underline disabled:opacity-50"
            >
              {uploading ? 'Upload...' : 'Changer la photo'}
            </button>
          </div>

          {/* Form */}
          <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 space-y-5">
            {/* Identity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs block mb-1">Prénom</label>
                <p className="text-white/70 text-sm px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545]">
                  {candidate.first_name}
                </p>
              </div>
              <div>
                <label className="text-white/40 text-xs block mb-1">Nom</label>
                <p className="text-white/70 text-sm px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545]">
                  {candidate.last_name}
                </p>
              </div>
            </div>

            <div>
              <label className="text-white/40 text-xs block mb-1">Nom de scène</label>
              <input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Votre nom d'artiste (facultatif)"
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-white/40 text-xs block mb-1">Email</label>
              <p className="text-white/50 text-sm px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545]">
                {candidate.email}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs block mb-1">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs block mb-1">Ville</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Votre ville"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-white/40 text-xs block mb-1">Catégorie</label>
              <p className="text-white/70 text-sm px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545]">
                {candidate.category}
              </p>
            </div>

            {/* Song */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs block mb-1">Titre de la chanson</label>
                <input
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Ma chanson"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs block mb-1">Artiste original</label>
                <input
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  placeholder="Artiste"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-white/40 text-xs block mb-1">Bio / Présentation</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez un peu de vous et de votre passion pour la musique..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none resize-none"
              />
              <p className="text-white/20 text-xs text-right mt-1">{bio.length}/500</p>
            </div>

            {/* Accent color */}
            <div>
              <label className="text-white/40 text-xs block mb-2">Couleur de profil</label>
              <div className="flex gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      accentColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            {/* Social links */}
            <div className="space-y-3">
              <label className="text-white/40 text-xs block">Réseaux sociaux</label>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FF0000]/10 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#FF0000]"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                </span>
                <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="youtube.com/..." className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#E4405F]/10 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#E4405F]"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12c0-3.2.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>
                </span>
                <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="instagram.com/..." className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#00f2ea]/10 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#00f2ea]"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15z"/></svg>
                </span>
                <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="tiktok.com/@..." className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#3b82f6]/10 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#3b82f6]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </span>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="monsite.com" className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder mon profil'}
            </button>
          </div>

          {/* Public profile link */}
          <div className="text-center">
            <a
              href={`/${sessionSlug}/candidats/${candidate.slug}`}
              className="text-sm text-white/40 hover:text-[#e91e8c] transition-colors"
            >
              Voir mon profil public →
            </a>
          </div>
        </>
      )}
    </div>
  )
}
