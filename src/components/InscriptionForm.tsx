'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify, getCategory, calculateAge } from '@/lib/utils'
import { getFingerprint } from '@/lib/fingerprint'
import { subscribeEmail } from '@/app/actions/subscribe-email'

interface SessionConfig {
  age_categories: { name: string; min_age: number; max_age: number }[]
  max_photo_size_mb: number
  max_video_size_mb: number
  max_mp3_size_mb: number
  max_video_duration_sec: number
  semifinal_date: string
}

interface Session {
  id: string
  name: string
  slug: string
  config: SessionConfig
}

const INPUT =
  'w-full bg-[#1a1232]/80 border border-[#2e2555] rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-sm sm:text-base text-[#f0eaf7] placeholder:text-[#6b5d85] focus:outline-none focus:border-[#e91e8c] focus:ring-1 focus:ring-[#e91e8c]/30 transition-colors'

const LABEL = 'block text-sm font-medium text-[#a899c2] mb-1.5'

const STEPS = [
  { title: 'Identité', icon: '👤' },
  { title: 'Chanson', icon: '🎵' },
  { title: 'Médias', icon: '📸' },
  { title: 'Finaliser', icon: '✨' },
]

/* ─── File Upload (mobile-friendly tap zone) ─── */
function FileZone({
  label,
  accept,
  file,
  onChange,
  maxSizeMb,
  required,
  hint,
  preview,
}: {
  label: string
  accept: string
  file: File | null
  onChange: (f: File | null) => void
  maxSizeMb: number
  required?: boolean
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
      {label && (
        <label className={LABEL}>
          {label} {required && <span className="text-[#e91e8c]">*</span>}
        </label>
      )}
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
            <p className="text-3xl mb-2 opacity-50">{accept.includes('image') ? '📷' : accept.includes('audio') ? '🎵' : '📄'}</p>
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

/* ─── Main component ─── */
export default function InscriptionForm({ session }: { session: Session }) {
  const config = session.config

  // Step
  const [currentStep, setCurrentStep] = useState(0)

  // Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [stageName, setStageName] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [bio, setBio] = useState('')
  const [accentColor, setAccentColor] = useState('#E91E8C')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Files
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoMode, setVideoMode] = useState<'url' | 'file'>('url')
  const [videoPublic, setVideoPublic] = useState(false)
  const [consent, setConsent] = useState<File | null>(null)
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)

  // Referral
  const searchParams = useSearchParams()
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [referrerName, setReferrerName] = useState<string | null>(null)

  useEffect(() => {
    const refSlug = searchParams.get('ref')
    if (!refSlug) return
    const supabase = createClient()
    supabase
      .from('candidates')
      .select('id, first_name, last_name, stage_name')
      .eq('session_id', session.id)
      .eq('slug', refSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReferredBy(data.id)
          setReferrerName(data.stage_name || `${data.first_name} ${data.last_name}`)
        }
      })
  }, [searchParams, session.id])

  // UI
  const [loading, setLoading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdSlug, setCreatedSlug] = useState('')
  const [error, setError] = useState('')

  // Derived
  const category = dob ? getCategory(dob, config.age_categories, config.semifinal_date || new Date().toISOString().split('T')[0]) : null
  const age = dob ? calculateAge(dob, new Date().toISOString()) : null
  const isMinor = age !== null && age < 18

  function handlePhotoChange(f: File | null) {
    setPhoto(f)
    setPhotoPreview(f ? URL.createObjectURL(f) : '')
  }

  // Validation per step — returns error message or null
  function validateStep(): string | null {
    if (currentStep === 0) {
      if (!firstName.trim()) return 'Veuillez remplir votre prénom.'
      if (!lastName.trim()) return 'Veuillez remplir votre nom.'
      if (!dob) return 'Veuillez indiquer votre date de naissance.'
      if (!email.trim()) return 'Veuillez remplir votre email.'
      if (!category) return 'Votre âge ne correspond à aucune catégorie.'
      return null
    }
    if (currentStep === 1) {
      if (!songTitle.trim()) return 'Veuillez indiquer le titre de la chanson.'
      if (!songArtist.trim()) return 'Veuillez indiquer l\'artiste original.'
      return null
    }
    if (currentStep === 2) {
      if (!photo) return 'Veuillez ajouter une photo.'
      if (!videoUrl.trim() && !videoFile) return 'Veuillez ajouter une vidéo de candidature.'
      return null
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError('')
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function prev() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function handleSubmit() {
    if (currentStep < STEPS.length - 1) return
    setError('')
    setLoading(true)

    try {
      if (!photo) throw new Error('Veuillez ajouter une photo.')
      if (!videoUrl.trim() && !videoFile) throw new Error('Veuillez ajouter une vidéo de candidature.')
      if (!category) throw new Error('Votre âge ne correspond à aucune catégorie.')
      if (isMinor && !consent) throw new Error("L'autorisation parentale est obligatoire pour les mineurs.")

      const candidateSlug = slugify(`${firstName}-${lastName}`) + '-' + Math.random().toString(36).substring(2, 6)
      const basePath = `${session.id}/${candidateSlug}`

      // Capture fingerprint (silent fail)
      let fingerprint: string | null = null
      try { fingerprint = await getFingerprint() } catch {}

      // === STEP 1: Upload video via signed URL if file (can be large, bypasses 4.5MB limit) ===
      let resolvedVideoUrl = ''
      if (videoMode === 'file' && videoFile) {
        setUploadStep('Vidéo...')
        // Get a signed upload URL from our server
        const urlRes = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `${basePath}/video`, bucket: 'candidates' }),
        })
        const urlData = await urlRes.json()
        if (!urlRes.ok) throw new Error(urlData.error || 'Erreur préparation vidéo')

        // Upload directly to the signed URL (works in all browsers)
        let uploadRes: Response
        try {
          uploadRes = await fetch(urlData.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': videoFile.type || 'video/mp4' },
            body: videoFile,
          })
        } catch {
          throw new Error(`La vidéo n'a pas pu être envoyée. Vérifiez votre connexion internet et réessayez. (${Math.round(videoFile.size / 1024 / 1024)} Mo)`)
        }
        if (!uploadRes.ok) {
          const sizeMb = Math.round(videoFile.size / 1024 / 1024)
          if (uploadRes.status === 413 || sizeMb > 500) {
            throw new Error(`La vidéo est trop volumineuse (${sizeMb} Mo). Essayez de filmer en qualité standard ou de raccourcir la vidéo.`)
          }
          throw new Error(`Erreur lors de l'envoi de la vidéo (${uploadRes.status}). Veuillez réessayer.`)
        }
        resolvedVideoUrl = urlData.publicUrl
      } else if (videoMode === 'url' && videoUrl.trim()) {
        resolvedVideoUrl = videoUrl.trim()
      }

      // === STEP 2: Upload photo + consent + data via our server (small files only) ===
      setUploadStep('Photo & inscription...')
      const fd = new FormData()
      fd.append('session_id', session.id)
      fd.append('first_name', firstName.trim())
      fd.append('last_name', lastName.trim())
      if (stageName.trim()) fd.append('stage_name', stageName.trim())
      fd.append('date_of_birth', dob)
      fd.append('email', email.trim().toLowerCase())
      if (phone.trim()) fd.append('phone', phone.trim())
      if (city.trim()) fd.append('city', city.trim())
      fd.append('category', category)
      fd.append('song_title', songTitle.trim())
      fd.append('song_artist', songArtist.trim())
      if (bio.trim()) fd.append('bio', bio.trim())
      fd.append('accent_color', accentColor)
      fd.append('slug', candidateSlug)
      fd.append('video_public', String(videoPublic))
      if (resolvedVideoUrl) fd.append('video_url', resolvedVideoUrl)
      if (youtubeUrl.trim()) fd.append('youtube_url', youtubeUrl.trim())
      if (instagramUrl.trim()) fd.append('instagram_url', instagramUrl.trim())
      if (tiktokUrl.trim()) fd.append('tiktok_url', tiktokUrl.trim())
      if (websiteUrl.trim()) fd.append('website_url', websiteUrl.trim())
      if (fingerprint) fd.append('fingerprint', fingerprint)
      if (referredBy) fd.append('referred_by', referredBy)

      // Photo file (goes through server — usually < 4MB)
      fd.append('photo', photo)
      // Consent file if any (PDF, small)
      if (consent) fd.append('consent', consent)

      const registerRes = await fetch('/api/register-candidate', {
        method: 'POST',
        body: fd,
      })

      const registerData = await registerRes.json()
      if (!registerRes.ok) {
        throw new Error(registerData.error || "Erreur lors de l'inscription")
      }

      // Send confirmation email (non-blocking)
      try {
        await fetch('/api/send-registration-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            candidateName: stageName.trim() || `${firstName.trim()} ${lastName.trim()}`,
            sessionName: session.name,
            sessionId: session.id,
            category,
            songTitle: songTitle.trim(),
            songArtist: songArtist.trim(),
          }),
        })
      } catch {
        // Email failure should not block registration success
      }

      // Subscribe to newsletter if opted in (non-blocking)
      if (newsletterOptIn) {
        try {
          await subscribeEmail(session.id, email.trim().toLowerCase(), 'inscription', fingerprint || undefined)
        } catch {
          // Newsletter subscribe failure should not block registration
        }
      }

      // Track Meta Pixel conversion (non-blocking)
      try {
        if (typeof window !== 'undefined' && typeof (window as /* eslint-disable-line @typescript-eslint/no-explicit-any */ any).fbq === 'function') {
          (window as any).fbq('track', 'Lead', { content_name: 'Inscription ChanteEnScene' })
        }
      } catch {}

      setCreatedSlug(candidateSlug)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
      setUploadStep('')
    }
  }

  // ─── Success ───
  if (success) {
    return (
      <div className="text-center py-12 animate-fade-up bg-[#0d0b1a]/70 backdrop-blur-md border border-[#2a2545]/50 rounded-2xl p-5 sm:p-6">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="font-[family-name:var(--font-montserrat)] font-black text-2xl mb-3">
          <span className="text-gradient-pink">Inscription envoyée !</span>
        </h2>
        <p className="text-[#a899c2] mb-2">
          Merci <strong className="text-white">{firstName}</strong> !
        </p>
        <p className="text-[#a899c2] text-sm mb-4">
          Un email de confirmation a été envoyé à <strong className="text-white">{email}</strong>
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7ec850]/10 border border-[#7ec850]/25 text-sm text-[#7ec850] mb-6">
          <span className="w-2 h-2 bg-[#7ec850] rounded-full" />
          Catégorie {category}
        </div>

        <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-5 mt-6 text-left space-y-3">
          <p className="text-white/50 text-xs uppercase tracking-wider">Prochaines étapes</p>
          <div className="flex items-start gap-3">
            <span className="text-lg">📋</span>
            <p className="text-sm text-[#a899c2]">
              Votre candidature est <strong className="text-[#f5a623]">en cours d&apos;examen</strong>. Vous recevrez un email quand elle sera validée.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">🗳️</span>
            <p className="text-sm text-[#a899c2]">
              Une fois validée, votre profil sera visible et le public pourra voter pour vous !
            </p>
          </div>
        </div>

        {/* Referral sharing */}
        {createdSlug && (
          <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/25 rounded-xl p-5 mt-6 text-center space-y-3">
            <p className="text-[#8b5cf6] font-semibold text-sm flex items-center justify-center gap-2">
              <span>🤝</span> Parraine tes proches !
            </p>
            <p className="text-[#a899c2] text-xs leading-relaxed">
              Tu connais quelqu&apos;un qui aime chanter ? Partage ce lien — chaque filleul inscrit booste ta visibilité !
            </p>
            <div className="bg-[#0d0b1a] rounded-lg px-3 py-2 text-xs text-[#8b5cf6] break-all select-all">
              https://www.chantenscene.fr/{session.slug}/inscription?ref={createdSlug}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`https://www.chantenscene.fr/${session.slug}/inscription?ref=${createdSlug}`)
              }}
              className="px-5 py-2 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#8b5cf6] text-xs font-medium hover:bg-[#8b5cf6]/30 transition-colors"
            >
              Copier le lien
            </button>
          </div>
        )}

      </div>
    )
  }

  // ─── Progress bar ───
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <form onSubmit={(e) => e.preventDefault()} className="animate-fade-up pb-6 sm:pb-8 bg-[#0d0b1a]/70 backdrop-blur-md border border-[#2a2545]/50 rounded-2xl p-4 sm:p-6">
      {/* Referral banner */}
      {referrerName && (
        <div className="flex items-center gap-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/25 rounded-xl px-4 py-3 mb-4 text-sm">
          <span>🤝</span>
          <p className="text-[#8b5cf6]">
            Parrainé(e) par <strong className="text-white">{referrerName}</strong>
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-5 sm:mb-8">
        {/* Progress bar */}
        <div className="h-1 bg-[#2e2555] rounded-full mb-3 sm:mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-between">
          {STEPS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { if (i < currentStep) setCurrentStep(i) }}
              className={`flex flex-col items-center gap-1 transition-all ${
                i === currentStep
                  ? 'text-[#e91e8c]'
                  : i < currentStep
                    ? 'text-[#7ec850] cursor-pointer'
                    : 'text-[#6b5d85]'
              }`}
            >
              <span className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-xs sm:text-sm transition-all ${
                i === currentStep
                  ? 'bg-[#e91e8c]/15 border-2 border-[#e91e8c]'
                  : i < currentStep
                    ? 'bg-[#7ec850]/15 border-2 border-[#7ec850]'
                    : 'bg-[#1a1232] border-2 border-[#2e2555]'
              }`}>
                {i < currentStep ? '✓' : s.icon}
              </span>
              <span className="text-[10px] font-medium hidden sm:block">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step title */}
      <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg sm:text-xl mb-4 sm:mb-6">
        {STEPS[currentStep].icon} {STEPS[currentStep].title}
      </h2>

      {/* ─── STEP 0: Identité ─── */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Prénom <span className="text-[#e91e8c]">*</span></label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Nom <span className="text-[#e91e8c]">*</span></label>
            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Nom de scène <span className="text-[#6b5d85] text-xs">(optionnel)</span></label>
            <input type="text" value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Si différent de votre nom" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Date de naissance <span className="text-[#e91e8c]">*</span></label>
            <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className={INPUT} />
            {dob && category && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] text-xs font-semibold">
                  Catégorie : {category}
                </span>
              </div>
            )}
            {dob && !category && (
              <p className="mt-2 text-red-400 text-xs">Votre âge ne correspond à aucune catégorie.</p>
            )}
          </div>
          <div>
            <label className={LABEL}>Email <span className="text-[#e91e8c]">*</span></label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Téléphone <span className="text-[#6b5d85] text-xs">(optionnel)</span></label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Ville <span className="text-[#6b5d85] text-xs">(optionnel)</span></label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Votre ville" className={INPUT} />
          </div>
        </div>
      )}

      {/* ─── STEP 1: Chanson ─── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Titre de la chanson <span className="text-[#e91e8c]">*</span></label>
            <input type="text" required value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Ex: Je vole" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Artiste original <span className="text-[#e91e8c]">*</span></label>
            <input type="text" required value={songArtist} onChange={(e) => setSongArtist(e.target.value)} placeholder="Ex: Louane" className={INPUT} />
          </div>
          <p className="text-[#6b5d85] text-xs bg-white/5 rounded-xl p-3">
            Le playback MP3 vous sera demandé si vous êtes sélectionné(e) pour la demi-finale.
          </p>
        </div>
      )}

      {/* ─── STEP 2: Médias ─── */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <FileZone
            label="Votre photo"
            accept="image/*"
            file={photo}
            onChange={handlePhotoChange}
            maxSizeMb={config.max_photo_size_mb}
            required
            hint="Photo portrait, bonne qualité"
            preview={photoPreview}
          />

          <div>
            <label className={LABEL}>Vidéo de candidature <span className="text-[#e91e8c]">*</span></label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setVideoMode('url')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  videoMode === 'url'
                    ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                    : 'bg-[#1a1232]/80 border border-[#6b5d85]/40 text-white/60 hover:text-white/80'
                }`}
              >
                Lien YouTube
              </button>
              <button
                type="button"
                onClick={() => setVideoMode('file')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  videoMode === 'file'
                    ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/40 text-[#e91e8c]'
                    : 'bg-[#1a1232]/80 border border-[#6b5d85]/40 text-white/60 hover:text-white/80'
                }`}
              >
                Fichier vidéo
              </button>
            </div>
            {videoMode === 'url' ? (
              <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={INPUT} />
            ) : (
              <FileZone label="" accept="video/*" file={videoFile} onChange={setVideoFile} maxSizeMb={config.max_video_size_mb} hint={`Max ${config.max_video_duration_sec || 180}s`} />
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer group bg-[#1a1232]/80 backdrop-blur-sm border border-[#2e2555] rounded-xl p-4">
            <input
              type="checkbox"
              checked={videoPublic}
              onChange={(e) => setVideoPublic(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-[#6b5d85] bg-[#0d0b1a] text-[#e91e8c] focus:ring-[#e91e8c]/30 cursor-pointer"
            />
            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
              J&apos;accepte que ma vidéo de candidature soit diffusée publiquement sur le site ChanteEnScène
            </span>
          </label>
        </div>
      )}

      {/* ─── STEP 3: Finaliser ─── */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <label className={LABEL}>Bio / Présentation <span className="text-[#6b5d85] text-xs">(optionnel)</span></label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez-nous de vous..."
              rows={4}
              maxLength={500}
              className={INPUT + ' resize-none'}
            />
            <p className="text-right text-xs text-[#6b5d85] mt-1">{bio.length}/500</p>
          </div>

          <div>
            <label className={LABEL}>Couleur de profil</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-12 rounded-xl cursor-pointer border border-[#2e2555] bg-transparent"
              />
              <span className="text-[#6b5d85] text-xs">Personnalisez votre page candidat</span>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div>
            <label className={LABEL}>Réseaux sociaux <span className="text-[#6b5d85] text-xs">(optionnel)</span></label>
            <p className="text-[#6b5d85] text-xs mb-3">Ajoutez vos liens pour que le public puisse vous découvrir</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FF0000]/10 text-sm shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#FF0000]"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                </span>
                <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="youtube.com/..." className={INPUT + ' flex-1'} />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#E4405F]/10 text-sm shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E4405F]"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12c0-3.2.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>
                </span>
                <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="instagram.com/..." className={INPUT + ' flex-1'} />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#00f2ea]/10 text-sm shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#00f2ea]"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15z"/></svg>
                </span>
                <input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="tiktok.com/@..." className={INPUT + ' flex-1'} />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#3b82f6]/10 text-sm shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#3b82f6]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </span>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="monsite.com" className={INPUT + ' flex-1'} />
              </div>
            </div>
          </div>

          {/* Autorisation parentale */}
          {isMinor && (
            <div className="space-y-3">
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-yellow-400 text-sm">
                  Vous avez moins de 18 ans. Autorisation parentale obligatoire.
                </p>
              </div>
              <FileZone
                label="Autorisation parentale"
                accept=".pdf,image/*"
                file={consent}
                onChange={setConsent}
                maxSizeMb={5}
                required
                hint="PDF ou photo du document signé"
              />
            </div>
          )}

          {/* Newsletter opt-in */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(e) => setNewsletterOptIn(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#2e2555] bg-[#1a1232] text-[#e91e8c] focus:ring-[#e91e8c] accent-[#e91e8c]"
            />
            <span className="text-sm text-white/60">
              Recevoir les actualités ChanteEnScène par email (résultats, dates, newsletter)
            </span>
          </label>

          {/* Recap */}
          <div className="bg-[#1a1232] border border-[#2e2555] rounded-xl p-4 space-y-2">
            <p className="text-[#6b5d85] text-xs uppercase tracking-wider mb-2">Récapitulatif</p>
            <p className="text-sm"><span className="text-[#6b5d85]">Nom :</span> {firstName} {lastName} {stageName && `(${stageName})`}</p>
            <p className="text-sm"><span className="text-[#6b5d85]">Catégorie :</span> <span className="text-[#e91e8c]">{category}</span></p>
            <p className="text-sm"><span className="text-[#6b5d85]">Chanson :</span> {songTitle} — {songArtist}</p>
            <p className="text-sm"><span className="text-[#6b5d85]">Email :</span> {email}</p>
            <p className="text-sm"><span className="text-[#6b5d85]">Photo :</span> {photo ? '✅' : '❌'}</p>
            <p className="text-sm"><span className="text-[#6b5d85]">Vidéo :</span> {videoUrl.trim() || videoFile ? '✅' : '❌'}</p>
            <p className="text-sm"><span className="text-[#6b5d85]">Vidéo publique :</span> {videoPublic ? '✅' : '❌'}</p>
            {(youtubeUrl || instagramUrl || tiktokUrl || websiteUrl) && (
              <p className="text-sm"><span className="text-[#6b5d85]">Réseaux :</span> {[youtubeUrl && 'YouTube', instagramUrl && 'Instagram', tiktokUrl && 'TikTok', websiteUrl && 'Site web'].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mt-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-6 sm:mt-8">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={prev}
            className="flex-1 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base bg-[#1a1232] border border-[#2e2555] active:bg-[#221845] transition-colors"
          >
            ← Retour
          </button>
        )}
        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-[#e91e8c] to-[#c4157a] active:scale-[0.98] transition-all"
          >
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-[#e91e8c] to-[#c4157a] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {uploadStep || 'Envoi...'}
              </span>
            ) : (
              'Envoyer mon inscription'
            )}
          </button>
        )}
      </div>
    </form>
  )
}
