import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const slugsParam = searchParams.get('slugs') // comma-separated slugs
  const hoursParam = searchParams.get('hours') // or "last N hours" mode

  if (!sessionId) {
    return new Response('Missing session_id', { status: 400 })
  }

  const supabase = createAdminClient()

  // Get session info
  const { data: session } = await supabase
    .from('sessions')
    .select('name, slug')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  // Get candidates — either by slugs or by recent approval
  let query = supabase
    .from('candidates')
    .select('first_name, last_name, stage_name, slug, song_title, song_artist, photo_url')
    .eq('session_id', sessionId)
    .in('status', ['approved', 'semifinalist', 'finalist'])

  if (slugsParam) {
    const slugs = slugsParam.split(',')
    query = query.in('slug', slugs)
  } else {
    const hours = parseInt(hoursParam || '24')
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  const { data: candidates } = await query.order('created_at', { ascending: true }).limit(8)

  if (!candidates?.length) {
    return new Response('No candidates found', { status: 404 })
  }

  // Dynamic footer message
  const count = candidates.length
  let footerMessage = ''
  if (count <= 3) {
    footerMessage = 'Il reste de la place, inscrivez-vous !'
  } else if (count <= 5) {
    footerMessage = 'La competition s\'intensifie !'
  } else {
    footerMessage = `${count} candidats aujourd'hui ! La suite demain...`
  }

  const displayCandidates = candidates.slice(0, 5)

  // Compute image height based on candidate count
  const rowHeight = 104 // each candidate row
  const headerHeight = 200
  const footerHeight = 120
  const padding = 120 // top + bottom
  const gapTotal = (displayCandidates.length - 1) * 16
  const minHeight = headerHeight + (displayCandidates.length * rowHeight) + gapTotal + footerHeight + padding
  const imgHeight = Math.max(1080, Math.min(1350, minHeight)) // Instagram: 1080-1350

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: `${imgHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #1a1232 0%, #0d0b1a 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px', display: 'flex' }}>🎤</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', textAlign: 'center', display: 'flex' }}>
            {count === 1 ? 'Nouveau candidat' : 'Nouveaux candidats'}
          </div>
          <div style={{ fontSize: '20px', color: '#e91e8c', marginTop: '8px', display: 'flex' }}>
            {session.name}
          </div>
        </div>

        {/* Candidate list */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: 1,
          justifyContent: 'center',
        }}>
          {displayCandidates.map((c, i) => {
            const name = c.stage_name || c.first_name
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '20px',
                  padding: '16px 24px',
                  gap: '20px',
                }}
              >
                {/* Round photo */}
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#2a2545',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '3px solid #e91e8c',
                }}>
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photo_url}
                      alt=""
                      width={72}
                      height={72}
                      style={{ width: '72px', height: '72px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ fontSize: '28px', color: 'white', opacity: 0.3, display: 'flex' }}>🎤</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: 'white', display: 'flex' }}>
                    {name}
                  </div>
                  {c.song_title && (
                    <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                      {'\u00AB'} {c.song_title} {'\u00BB'}{c.song_artist ? ` \u2014 ${c.song_artist}` : ''}
                    </div>
                  )}
                </div>

                {/* Vote badge */}
                <div style={{
                  background: '#e91e8c',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 700,
                  padding: '8px 16px',
                  borderRadius: '12px',
                  flexShrink: 0,
                  display: 'flex',
                }}>
                  Votez !
                </div>
              </div>
            )
          })}

          {/* More candidates indicator */}
          {count > 5 && (
            <div style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '18px',
              display: 'flex',
              justifyContent: 'center',
              marginTop: '8px',
            }}>
              + {count - 5} autre{count - 5 > 1 ? 's' : ''} candidat{count - 5 > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '32px', gap: '16px' }}>
          <div style={{
            fontSize: '22px',
            color: '#e91e8c',
            fontWeight: 600,
            display: 'flex',
          }}>
            {footerMessage}
          </div>
          <div style={{ display: 'flex', gap: '4px', fontSize: '14px' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Chant</span>
            <span style={{ color: 'rgba(126,200,80,0.4)' }}>En</span>
            <span style={{ color: 'rgba(233,30,140,0.4)' }}>Scene</span>
            <span style={{ color: 'rgba(255,255,255,0.15)', marginLeft: '8px' }}>chantenscene.fr</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: imgHeight,
    }
  )
}
