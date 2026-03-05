import React from 'react'
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// Load background image as base64 (cached at module level)
let bgDataUri = ''
try {
  const bgBuffer = readFileSync(join(process.cwd(), 'public', 'images', 'fd.png'))
  bgDataUri = `data:image/png;base64,${bgBuffer.toString('base64')}`
} catch {
  // fallback: no background image
}

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

  // Choose layout based on count
  let content: React.ReactNode

  if (count === 1) {
    // ═══ HERO — Full page layout ═══
    const c = displayCandidates[0]
    const name = c.stage_name || c.first_name
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '40px' }}>
        <div style={{
          width: '400px', height: '400px', borderRadius: '50%', overflow: 'hidden',
          background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '6px solid #e91e8c', flexShrink: 0,
        }}>
          {c.photoDataUri ? (
            <img src={c.photoDataUri} alt="" width={400} height={400} style={{ width: '400px', height: '400px', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: '140px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
          )}
        </div>
        <div style={{ fontSize: '64px', fontWeight: 800, color: 'white', textAlign: 'center', display: 'flex' }}>
          {name}
        </div>
        {c.song_title && (
          <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', display: 'flex' }}>
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
              display: 'flex', alignItems: 'center', background: 'rgba(10,8,20,0.65)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '28px', padding: '36px 44px', gap: '36px', flex: 1,
            }}>
              <div style={{
                width: '240px', height: '240px', borderRadius: '50%', overflow: 'hidden',
                background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '5px solid #e91e8c',
              }}>
                {c.photoDataUri ? (
                  <img src={c.photoDataUri} alt="" width={240} height={240} style={{ width: '240px', height: '240px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '80px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
                <div style={{ fontSize: '48px', fontWeight: 800, color: 'white', display: 'flex' }}>{name}</div>
                {c.song_title && (
                  <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '24px', justifyContent: 'center' }}>
        {displayCandidates.map((c, i) => {
          const name = c.stage_name || c.first_name
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', background: 'rgba(10,8,20,0.65)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '28px', padding: '30px 36px', gap: '32px', flex: 1,
            }}>
              <div style={{
                width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden',
                background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '5px solid #e91e8c',
              }}>
                {c.photoDataUri ? (
                  <img src={c.photoDataUri} alt="" width={180} height={180} style={{ width: '180px', height: '180px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '64px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', display: 'flex' }}>{name}</div>
                {c.song_title && (
                  <div style={{ fontSize: '22px', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, justifyContent: 'center' }}>
        {displayCandidates.map((c, i) => {
          const name = c.stage_name || c.first_name
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', background: 'rgba(10,8,20,0.65)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '22px', padding: '18px 28px', gap: '22px',
            }}>
              <div style={{
                width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden',
                background: '#2a2545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '3px solid #e91e8c',
              }}>
                {c.photoDataUri ? (
                  <img src={c.photoDataUri} alt="" width={90} height={90} style={{ width: '90px', height: '90px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '32px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'white', display: 'flex' }}>{name}</div>
                {c.song_title && (
                  <div style={{ fontSize: '19px', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {'\u00AB'} {c.song_title} {'\u00BB'}{c.song_artist ? ` \u2014 ${c.song_artist}` : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {count > 5 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '19px', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
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
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background image */}
        {bgDataUri ? (
          <img src={bgDataUri} width={1080} height={1080} style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1080px', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1080px', background: 'linear-gradient(180deg, #110d1f 0%, #0a0814 100%)' }} />
        )}

        {/* Content overlay */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '50px 60px', position: 'relative' }}>
          {/* Mini header — just logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px', display: 'flex' }}>🎤</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', display: 'flex' }}>CHANTENSC&#200;NE</span>
          </div>

          {/* Content — layout adapts to count */}
          {content}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  )
}
