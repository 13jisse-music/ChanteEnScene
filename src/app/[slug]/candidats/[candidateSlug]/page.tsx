import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CandidateVoteButton from '@/components/CandidateVoteButton'
import ShareButtons from '@/components/ShareButtons'
import HeroBio from '@/components/HeroBio'
import PageTracker from '@/components/PageTracker'
import InlineVideoPlayer from '@/components/InlineVideoPlayer'

type Params = Promise<{ slug: string; candidateSlug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug, candidateSlug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!session) return { title: 'Candidat — ChanteEnScène' }

  const { data: candidate } = await supabase
    .from('candidates')
    .select('first_name, last_name, stage_name, song_title, song_artist')
    .eq('session_id', session.id)
    .eq('slug', candidateSlug)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .single()

  const name = candidate
    ? candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
    : 'Candidat'

  return {
    title: `${name} — ChanteEnScène`,
    description: candidate
      ? `${name} chante "${candidate.song_title}" de ${candidate.song_artist}`
      : undefined,
  }
}

export default async function CandidateProfilePage({ params }: { params: Params }) {
  const { slug, candidateSlug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('session_id', session.id)
    .eq('slug', candidateSlug)
    .in('status', ['approved', 'semifinalist', 'finalist', 'winner'])
    .single()

  if (!candidate) notFound()

  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`
  const accent = candidate.accent_color || '#e91e8c'
  const hasVideo = candidate.video_public && candidate.video_url
  const shareUrl = `https://chantenscene.fr/${slug}/candidats/${candidateSlug}`
  const hasSocials = candidate.youtube_url || candidate.instagram_url || candidate.tiktok_url || candidate.website_url
  const shares = candidate.shares_count ?? 0

  const STATUS_LABELS: Record<string, { label: string; color: string; medal: string }> = {
    winner: { label: 'Gagnant(e)', color: '#ffd700', medal: '🏆' },
    finalist: { label: 'Finaliste', color: '#8b5cf6', medal: '🥇' },
    semifinalist: { label: 'Demi-finaliste', color: '#7ec850', medal: '🥈' },
    approved: { label: 'Sélectionné(e)', color: '#e91e8c', medal: '🥉' },
  }
  const statusInfo = STATUS_LABELS[candidate.status]

  /* Helper : crée un nouveau bloc JSX de liens sociaux à chaque appel */
  function renderSocialLinks() {
    if (!hasSocials) return null
    return (
      <>
        {candidate.youtube_url && (
          <a href={candidate.youtube_url} target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#FF0000]/40 transition-all" title="YouTube">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
          </a>
        )}
        {candidate.instagram_url && (
          <a href={candidate.instagram_url} target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#E4405F]/40 transition-all" title="Instagram">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12c0-3.2.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>
          </a>
        )}
        {candidate.tiktok_url && (
          <a href={candidate.tiktok_url} target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#00f2ea]/40 transition-all" title="TikTok">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15z"/></svg>
          </a>
        )}
        {candidate.website_url && (
          <a href={candidate.website_url} target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#3b82f6]/40 transition-all" title="Site web">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </a>
        )}
      </>
    )
  }

  return (
    <main className="bg-[#0d0b1a]">
      <PageTracker sessionId={session.id} candidateId={candidate.id} pagePath={`/${slug}/candidats/${candidateSlug}`} />

      {/* ═══════════════════════════════════════════════════════════
          MOBILE — plein écran immersif (< lg)
      ═══════════════════════════════════════════════════════════ */}
      <section className="lg:hidden relative min-h-[500px] overflow-hidden" style={{ height: 'calc(100dvh - 4rem)' }}>
        {/* Photo de fond */}
        {candidate.photo_url ? (
          <img
            src={candidate.photo_url}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 20%' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1232] to-[#0d0b1a] flex items-center justify-center">
            <span className="text-[120px] opacity-10">🎤</span>
          </div>
        )}

        {/* Gradient dramatique */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, #0d0b1a 0%, ${accent}66 8%, ${accent}22 18%, rgba(13,11,26,0.2) 38%, rgba(13,11,26,0.05) 55%, transparent 75%)`,
          }}
        />

        {/* Back button */}
        <Link
          href={`/${slug}/candidats`}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-sm transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          Candidats
        </Link>

        {/* ── Côté droit : réseaux sociaux + partage ── */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-4">
          {hasSocials && <div className="flex flex-col gap-2">{renderSocialLinks()}</div>}
          {hasSocials && <div className="w-5 border-t border-white/15" />}
          <ShareButtons
            candidateName={displayName}
            shareUrl={shareUrl}
            candidateId={candidate.id}
            sessionId={session.id}
            vertical
          />
        </div>

        {/* ── Contenu hero (bas de l'écran) ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-8 pr-16">
          <div className="max-w-lg mx-auto">
            {/* Catégorie + statut */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              >
                {candidate.category}
              </span>
              {statusInfo && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: `${statusInfo.color}25`, color: statusInfo.color, border: `1px solid ${statusInfo.color}50`, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                >
                  {statusInfo.medal} {statusInfo.label}
                </span>
              )}
            </div>

            {/* NOM — prénom prédominant, taille adaptative */}
            {candidate.stage_name ? (
              <h1
                className="font-[family-name:var(--font-montserrat)] font-black text-white leading-[1.05] tracking-tight"
                style={{
                  fontSize: candidate.stage_name.length > 15 ? 'clamp(1.6rem, 7vw, 3rem)' : 'clamp(2rem, 9vw, 3.5rem)',
                  textShadow: `0 0 40px ${accent}80, 0 4px 15px rgba(0,0,0,0.6)`,
                }}
              >
                {candidate.stage_name}
              </h1>
            ) : (
              <div style={{ textShadow: `0 0 40px ${accent}80, 0 4px 15px rgba(0,0,0,0.6)` }}>
                <span
                  className="block font-[family-name:var(--font-montserrat)] font-black text-white leading-[1.05] tracking-tight"
                  style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)' }}
                >
                  {candidate.first_name}
                </span>
                <span
                  className="block font-[family-name:var(--font-montserrat)] font-bold text-white/75 leading-tight"
                  style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}
                >
                  {candidate.last_name}
                </span>
              </div>
            )}
            {statusInfo && (
              <span className="block text-3xl mt-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {statusInfo.medal}
              </span>
            )}

            {candidate.stage_name && (
              <p className="text-white/60 text-sm mt-1 font-medium"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                {candidate.first_name} {candidate.last_name}
              </p>
            )}

            {/* Chanson */}
            <p className="text-white/80 text-base mt-3 font-medium"
              style={{ textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}>
              <em>&laquo;&nbsp;{candidate.song_title}&nbsp;&raquo;</em>
              <span className="text-white/50"> &mdash; {candidate.song_artist}</span>
            </p>

            {/* Bio tronquée */}
            {candidate.bio && <HeroBio bio={candidate.bio} />}

            {/* Ville */}
            {candidate.city && (
              <span className="inline-flex items-center gap-1.5 text-white/50 text-sm mt-2"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                </svg>
                {candidate.city}
              </span>
            )}

            {/* Vote + compteurs */}
            <div className="mt-4 flex items-center flex-wrap gap-3">
              <CandidateVoteButton
                candidateId={candidate.id}
                sessionId={session.id}
                initialLikes={candidate.likes_count}
                accent={accent}
              />
              {shares > 0 && (
                <span className="text-white/30 text-sm tabular-nums flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13" />
                  </svg>
                  {shares} {shares === 1 ? 'partage' : 'partages'}
                </span>
              )}
            </div>

            {/* Bouton vidéo inline */}
            {hasVideo && <InlineVideoPlayer videoUrl={candidate.video_url!} />}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP — photo à gauche, infos à droite (>= lg)
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block relative z-[1] -mt-32">
        {/* Fond concert */}
        <div className="absolute inset-0 z-0">
          <img src="/images/profile-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          {/* Dégradé fondu en bas pour transition douce vers le fond sombre */}
          <div className="absolute bottom-0 left-0 right-0 h-80" style={{ background: 'linear-gradient(to bottom, transparent 0%, #0d0b1a 100%)' }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 pt-36 pb-32">
          {/* Back button */}
          <Link
            href={`/${slug}/candidats`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all mb-6"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
            Tous les candidats
          </Link>

          <div className="flex gap-10">
            {/* ── Photo (jamais coupée) ── */}
            <div className="w-[420px] flex-shrink-0">
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10"
                style={{ background: `linear-gradient(135deg, ${accent}15, #1a1232)` }}
              >
                {candidate.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt={displayName}
                    className="w-full h-auto block rounded-2xl"
                    style={{ maxHeight: '70vh' }}
                  />
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center">
                    <span className="text-[100px] opacity-10">🎤</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Infos ── */}
            <div className="flex-1 min-w-0 pt-2">
              {/* Catégorie + statut */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/90">
                  {candidate.category}
                </span>
                {statusInfo && (
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{ background: `${statusInfo.color}20`, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}
                  >
                    {statusInfo.medal} {statusInfo.label}
                  </span>
                )}
              </div>

              {/* NOM */}
              {candidate.stage_name ? (
                <h1
                  className="font-[family-name:var(--font-montserrat)] font-black text-white leading-[1.05] tracking-tight text-5xl"
                  style={{ textShadow: `0 0 40px ${accent}60` }}
                >
                  {candidate.stage_name}
                  {statusInfo && <span className="ml-3 text-4xl align-middle">{statusInfo.medal}</span>}
                </h1>
              ) : (
                <div>
                  <span
                    className="font-[family-name:var(--font-montserrat)] font-black text-white leading-[1.05] tracking-tight text-5xl"
                    style={{ textShadow: `0 0 40px ${accent}60` }}
                  >
                    {candidate.first_name}
                  </span>
                  {statusInfo && <span className="ml-3 text-4xl align-middle">{statusInfo.medal}</span>}
                  <span className="block font-[family-name:var(--font-montserrat)] font-bold text-white/60 leading-tight text-3xl mt-1">
                    {candidate.last_name}
                  </span>
                </div>
              )}

              {candidate.stage_name && (
                <p className="text-white/50 text-base mt-2 font-medium">
                  {candidate.first_name} {candidate.last_name}
                </p>
              )}

              {/* Chanson */}
              <p className="text-white/80 text-lg mt-4 font-medium">
                <em>&laquo;&nbsp;{candidate.song_title}&nbsp;&raquo;</em>
                <span className="text-white/50"> &mdash; {candidate.song_artist}</span>
              </p>

              {/* Bio complète */}
              {candidate.bio && (
                <p className="text-white/60 text-sm leading-relaxed mt-4 whitespace-pre-line">
                  {candidate.bio}
                </p>
              )}

              {/* Ville */}
              {candidate.city && (
                <span className="inline-flex items-center gap-1.5 text-white/40 text-sm mt-3">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                  </svg>
                  {candidate.city}
                </span>
              )}

              {/* Vote + compteurs */}
              <div className="mt-6 flex items-center flex-wrap gap-4">
                <CandidateVoteButton
                  candidateId={candidate.id}
                  sessionId={session.id}
                  initialLikes={candidate.likes_count}
                  accent={accent}
                />
                {shares > 0 && (
                  <span className="text-white/30 text-sm tabular-nums flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13" />
                    </svg>
                    {shares} {shares === 1 ? 'partage' : 'partages'}
                  </span>
                )}
              </div>

              {/* Bouton vidéo inline */}
              {hasVideo && <InlineVideoPlayer videoUrl={candidate.video_url!} />}

              {/* Réseaux sociaux + partage */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-start gap-8">
                {hasSocials && (
                  <div>
                    <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Réseaux</p>
                    <div className="flex flex-wrap gap-2">{renderSocialLinks()}</div>
                  </div>
                )}
                <div>
                  <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Partager</p>
                  <ShareButtons
                    candidateName={displayName}
                    shareUrl={shareUrl}
                    candidateId={candidate.id}
                    sessionId={session.id}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
