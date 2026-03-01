import React from 'react'
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/** Fetch photo → sharp auto-orient → base64 data URI */
async function fixPhoto(url: string, size: number): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    const buffer = Buffer.from(await res.arrayBuffer())
    const oriented = await sharp(buffer)
      .rotate() // auto-orient based on EXIF
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()
    return `data:image/jpeg;base64,${oriented.toString('base64')}`
  } catch {
    return ''
  }
}

interface Candidate {
  first_name: string
  last_name: string
  stage_name: string | null
  slug: string
  song_title: string | null
  song_artist: string | null
  photo_url: string | null
  photoDataUri?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const slugsParam = searchParams.get('slugs')
  const hoursParam = searchParams.get('hours')

  if (!sessionId) {
    return new Response('Missing session_id', { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('name, slug')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  let query = supabase
    .from('candidates')
    .select('first_name, last_name, stage_name, slug, song_title, song_artist, photo_url')
    .eq('session_id', sessionId)
    .in('status', ['approved', 'semifinalist', 'finalist'])

  if (slugsParam) {
    query = query.in('slug', slugsParam.split(','))
  } else {
    const hours = parseInt(hoursParam || '24')
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  const { data: candidates } = await query.order('created_at', { ascending: true }).limit(8)

  if (!candidates?.length) {
    return new Response('No candidates found', { status: 404 })
  }

  const count = candidates.length
  const displayCandidates: Candidate[] = candidates.slice(0, 5)

  // Fix EXIF orientation for all photos in parallel
  const photoSize = count === 1 ? 600 : count <= 2 ? 400 : count <= 3 ? 280 : 160
  await Promise.all(
    displayCandidates.map(async (c) => {
      if (c.photo_url) {
        c.photoDataUri = await fixPhoto(c.photo_url, photoSize)
      }
    })
  )

  // Dynamic footer message
  let footerMessage = ''
  if (count <= 3) {
    footerMessage = 'Il reste de la place, inscrivez-vous !'
  } else if (count <= 5) {
    footerMessage = 'La comp\u00e9tition s\u2019intensifie !'
  } else {
    footerMessage = `${count} candidats aujourd\u2019hui ! La suite demain...`
  }

  // Choose layout based on count
  let content: React.ReactNode

  if (count === 1) {
    // ═══ HERO — Full page layout ═══
    const c = displayCandidates[0]
    const name = c.stage_name || c.first_name
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '32px' }}>
        {/* Big round photo */}
        <div style={{
          width: '340px', height: '340px', borderRadius: '50%', overflow: 'hidden',
          background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '6px solid #e91e8c', flexShrink: 0,
        }}>
          {c.photoDataUri ? (
            <img src={c.photoDataUri} alt="" width={340} height={340} style={{ width: '340px', height: '340px', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: '120px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
          )}
        </div>
        {/* Name */}
        <div style={{ fontSize: '56px', fontWeight: 800, color: 'white', textAlign: 'center', display: 'flex' }}>
          {name}
        </div>
        {/* Song */}
        {c.song_title && (
          <div style={{ fontSize: '30px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', display: 'flex' }}>
            {'\u00AB'} {c.song_title} {'\u00BB'}{c.song_artist ? ` \u2014 ${c.song_artist}` : ''}
          </div>
        )}
      </div>
    )
  } else if (count === 2) {
    // ═══ 50/50 — Two big cards stacked ═══
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '28px', justifyContent: 'center' }}>
        {displayCandidates.map((c, i) => {
          const name = c.stage_name || c.first_name
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)',
              borderRadius: '28px', padding: '32px 40px', gap: '36px', flex: 1,
            }}>
              <div style={{
                width: '220px', height: '220px', borderRadius: '50%', overflow: 'hidden',
                background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '5px solid #e91e8c',
              }}>
                {c.photoDataUri ? (
                  <img src={c.photoDataUri} alt="" width={220} height={220} style={{ width: '220px', height: '220px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '80px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                <div style={{ fontSize: '42px', fontWeight: 700, color: 'white', display: 'flex' }}>{name}</div>
                {c.song_title && (
                  <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                    {'\u00AB'} {c.song_title} {'\u00BB'}{c.song_artist ? ` \u2014 ${c.song_artist}` : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  } else if (count === 3) {
    // ═══ 1/3 each — Three medium cards ═══
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px', justifyContent: 'center' }}>
        {displayCandidates.map((c, i) => {
          const name = c.stage_name || c.first_name
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)',
              borderRadius: '24px', padding: '24px 32px', gap: '28px', flex: 1,
            }}>
              <div style={{
                width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden',
                background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '4px solid #e91e8c',
              }}>
                {c.photoDataUri ? (
                  <img src={c.photoDataUri} alt="" width={150} height={150} style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '56px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                <div style={{ fontSize: '34px', fontWeight: 700, color: 'white', display: 'flex' }}>{name}</div>
                {c.song_title && (
                  <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                    {'\u00AB'} {c.song_title} {'\u00BB'}{c.song_artist ? ` \u2014 ${c.song_artist}` : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  } else {
    // ═══ 4+ — Compact row layout ═══
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
        {displayCandidates.map((c, i) => {
          const name = c.stage_name || c.first_name
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '16px 24px', gap: '20px',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
                background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '3px solid #e91e8c',
              }}>
                {c.photoDataUri ? (
                  <img src={c.photoDataUri} alt="" width={80} height={80} style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '28px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'white', display: 'flex' }}>{name}</div>
                {c.song_title && (
                  <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                    {'\u00AB'} {c.song_title} {'\u00BB'}{c.song_artist ? ` \u2014 ${c.song_artist}` : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {count > 5 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            + {count - 5} autre{count - 5 > 1 ? 's' : ''} candidat{count - 5 > 1 ? 's' : ''}
          </div>
        )}
      </div>
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #1a1232 0%, #0d0b1a 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: count === 1 ? '20px' : '40px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px', display: 'flex' }}>🎤</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', textAlign: 'center', display: 'flex' }}>
            {count === 1 ? 'Nouveau candidat' : 'Nouveaux candidats'}
          </div>
          <div style={{ fontSize: '20px', color: '#e91e8c', marginTop: '8px', display: 'flex' }}>
            {session.name}
          </div>
        </div>

        {/* Content — layout adapts to count */}
        {content}

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: count === 1 ? '20px' : '32px', gap: '14px' }}>
          <div style={{ fontSize: '22px', color: '#e91e8c', fontWeight: 600, display: 'flex' }}>
            {footerMessage}
          </div>
          <div style={{
            background: '#e91e8c', color: 'white', fontSize: '20px', fontWeight: 700,
            padding: '14px 40px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            🗳️ Votez sur chantenscene.fr
          </div>
          <div style={{ display: 'flex', gap: '4px', fontSize: '13px', marginTop: '4px' }}>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>Chant</span>
            <span style={{ color: 'rgba(126,200,80,0.35)' }}>En</span>
            <span style={{ color: 'rgba(233,30,140,0.35)' }}>Scene</span>
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
