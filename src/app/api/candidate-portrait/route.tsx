import React from 'react'
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// Load background + logo as base64 (cached at module level)
let bgDataUri = ''
let logoDataUri = ''
try {
  const bgBuffer = readFileSync(join(process.cwd(), 'public', 'images', 'profile-bg.jpg'))
  bgDataUri = `data:image/jpeg;base64,${bgBuffer.toString('base64')}`
} catch { /* no bg */ }
try {
  const logoBuffer = readFileSync(join(process.cwd(), 'public', 'images', 'logo.png'))
  logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`
} catch { /* no logo */ }

/** Fetch photo → sharp auto-orient → resize → base64 */
async function getPhoto(url: string, size: number): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    const buffer = Buffer.from(await res.arrayBuffer())
    const oriented = await sharp(buffer)
      .rotate()
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer()
    return `data:image/jpeg;base64,${oriented.toString('base64')}`
  } catch {
    return ''
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const sessionId = searchParams.get('session_id') || '682bef39-e7ec-4943-9e62-96bfb91bfcac'

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('first_name, last_name, stage_name, song_title, song_artist, bio, photo_url, city, likes_count, slug')
    .eq('session_id', sessionId)
    .eq('slug', slug)
    .single()

  if (!candidate) {
    return new Response('Candidate not found', { status: 404 })
  }

  // Get session slug for QR code URL
  const { data: session } = await supabase
    .from('sessions')
    .select('slug')
    .eq('id', sessionId)
    .single()

  const sessionSlug = session?.slug || 'chantenscene-aubagne-2026'
  const candidateUrl = `https://chantenscene.fr/${sessionSlug}/candidats/${slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(candidateUrl)}&bgcolor=FFFFFF&color=8B7332&format=png&margin=4`

  const name = candidate.stage_name || candidate.first_name
  const photoDataUri = candidate.photo_url ? await getPhoto(candidate.photo_url, 620) : ''

  // Fetch QR code as base64
  let qrDataUri = ''
  try {
    const qrRes = await fetch(qrUrl)
    if (qrRes.ok) {
      const qrBuffer = Buffer.from(await qrRes.arrayBuffer())
      qrDataUri = `data:image/png;base64,${qrBuffer.toString('base64')}`
    }
  } catch { /* no QR */ }

  // Bio snippet (max 120 chars)
  let bioSnippet = ''
  if (candidate.bio) {
    bioSnippet = candidate.bio.length > 120 ? candidate.bio.slice(0, 117) + '...' : candidate.bio
  }

  const songTitle = candidate.song_title || ''
  const songArtist = candidate.song_artist || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          position: 'relative',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Background concert scene */}
        {bgDataUri ? (
          <img src={bgDataUri} width={1080} height={1080} style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1080px', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1080px', background: 'linear-gradient(135deg, #1a0a2e 0%, #0a0814 50%, #2a0a1e 100%)' }} />
        )}

        {/* Dark overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1080px', background: 'rgba(5,3,15,0.55)', display: 'flex' }} />

        {/* Main layout: left photo + right text */}
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, position: 'relative' }}>

          {/* LEFT SIDE — Large photo with rounded corners + logo overlay */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '540px', padding: '24px 0 24px 24px',
            position: 'relative',
          }}>
            <div style={{
              width: '500px', height: '750px',
              borderRadius: '24px', overflow: 'hidden',
              border: '4px solid #C9A84C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1a1030',
              boxShadow: '0 0 60px rgba(201,168,76,0.3)',
              position: 'relative',
            }}>
              {photoDataUri ? (
                <img src={photoDataUri} alt="" width={500} height={750} style={{ width: '500px', height: '750px', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '160px', color: 'white', opacity: 0.3, display: 'flex' }}>{'\uD83C\uDFA4'}</div>
              )}
            </div>
            {/* Logo overlay — top right of photo */}
            {logoDataUri && (
              <img
                src={logoDataUri}
                width={180}
                height={180}
                style={{ position: 'absolute', top: '130px', right: '-60px', width: '180px', height: '180px', objectFit: 'contain', zIndex: 10 }}
              />
            )}
          </div>

          {/* RIGHT SIDE — Text content, bottom aligned with photo */}
          <div style={{
            display: 'flex', flexDirection: 'column', flex: 1,
            padding: '24px 30px 165px 24px', justifyContent: 'flex-start',
            height: '1080px',
          }}>

            {/* Spacer to align with photo top */}
            <div style={{ height: '141px', display: 'flex' }} />

            {/* "On vous présente" */}
            <div style={{
              fontSize: '24px', fontWeight: 600, color: '#C9A84C',
              display: 'flex', letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: '0 2px 10px rgba(0,0,0,0.6)',
            }}>
              On vous pr{'\u00E9'}sente
            </div>

            {/* Name */}
            <div style={{
              fontSize: '72px', fontWeight: 800, color: 'white',
              display: 'flex', lineHeight: 1.1, marginTop: '8px',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            }}>
              {name}
            </div>

            {/* City */}
            {candidate.city && (
              <div style={{
                fontSize: '28px', color: '#C9A84C', fontWeight: 600,
                display: 'flex', marginTop: '14px',
              }}>
                {'\uD83D\uDCCD'} {candidate.city}
              </div>
            )}

            {/* Song */}
            {songTitle && (
              <div style={{
                fontSize: '28px', color: 'rgba(255,255,255,0.7)',
                display: 'flex', marginTop: '18px', fontStyle: 'italic',
                flexWrap: 'wrap',
              }}>
                {'\uD83C\uDFB5'} {'\u00AB'} {songTitle} {'\u00BB'}{songArtist ? ` \u2014 ${songArtist}` : ''}
              </div>
            )}

            {/* Bio */}
            {bioSnippet && (
              <div style={{
                fontSize: '22px', color: 'rgba(255,255,255,0.5)',
                display: 'flex', marginTop: '20px', lineHeight: 1.5,
                maxWidth: '440px',
              }}>
                {'\u00AB'} {bioSnippet} {'\u00BB'}
              </div>
            )}

            {/* Spacer — push QR+button to bottom, aligned with photo */}
            <div style={{ flex: 1, display: 'flex', minHeight: '10px' }} />

            {/* QR Code — links to candidate profile */}
            {qrDataUri && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '160px', height: '160px', borderRadius: '16px',
                  overflow: 'hidden', background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px',
                }}>
                  <img src={qrDataUri} width={152} height={152} style={{ width: '152px', height: '152px' }} />
                </div>
                <div style={{
                  fontSize: '20px', color: 'rgba(255,255,255,0.4)',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                }}>
                  <span style={{ display: 'flex' }}>Scannez pour</span>
                  <span style={{ display: 'flex', fontWeight: 700, color: '#C9A84C', fontSize: '24px' }}>voter !</span>
                </div>
              </div>
            )}

            {/* CTA Button — relief effect */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(180deg, #E8D06C 0%, #C9A84C 40%, #A8873A 100%)',
              borderRadius: '40px', padding: '14px 36px',
              alignSelf: 'flex-start',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)',
            }}>
              <span style={{
                fontSize: '24px', fontWeight: 800, color: '#1a1000',
                letterSpacing: '2px', display: 'flex',
                textShadow: '0 1px 0 rgba(255,255,255,0.3)',
              }}>
                {'\uD83D\uDDF3\uFE0F'} VOTEZ POUR MOI
              </span>
            </div>

            {/* URL */}
            <div style={{
              fontSize: '18px', color: 'rgba(255,255,255,0.35)',
              display: 'flex', marginTop: '10px', letterSpacing: '2px',
            }}>
              chantenscene.fr
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  )
}
