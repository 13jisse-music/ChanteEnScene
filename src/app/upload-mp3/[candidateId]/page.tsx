import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LogoRing from '@/components/LogoRing'
import Mp3Uploader from '@/components/Mp3Uploader'

type Params = Promise<{ candidateId: string }>

export async function generateMetadata() {
  return {
    title: 'Envoyer mon playback MP3 — ChanteEnScène',
  }
}

export default async function UploadMp3Page({ params }: { params: Params }) {
  const { candidateId } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, song_title, song_artist, session_id, slug, mp3_url, status')
    .eq('id', candidateId)
    .single()

  if (!candidate || candidate.status !== 'semifinalist') notFound()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, config')
    .eq('id', candidate.session_id)
    .single()

  const config = (session?.config || {}) as { max_mp3_size_mb?: number }
  const maxSizeMb = config.max_mp3_size_mb || 20
  const displayName = candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`

  return (
    <main className="min-h-screen py-12 px-4">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(233,30,140,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(126,200,80,0.05) 0%, transparent 50%)
          `,
        }}
      />

      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <LogoRing size={70} />
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl mt-6 mb-3 drop-shadow-lg">
            <span className="text-white">Playback </span>
            <span className="text-[#e91e8c]">MP3</span>
          </h1>
          <div className="inline-block bg-[#0d0b1a]/70 backdrop-blur-sm rounded-full px-5 py-2">
            <p className="text-white/80 text-sm">
              {displayName} — &laquo; {candidate.song_title} &raquo; de {candidate.song_artist}
            </p>
          </div>
        </div>

        <Mp3Uploader
          candidateId={candidate.id}
          sessionId={candidate.session_id}
          slug={candidate.slug}
          existingMp3Url={candidate.mp3_url}
          maxSizeMb={maxSizeMb}
        />
      </div>
    </main>
  )
}
