import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import CorrectionForm from '@/components/CorrectionForm'

type Params = Promise<{ token: string }>

export async function generateMetadata() {
  return { title: 'Corriger ma candidature — ChanteEnScène' }
}

export default async function CorrectionPage({ params }: { params: Params }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, stage_name, email, song_title, song_artist, photo_url, video_url, session_id, slug, correction_fields, status')
    .eq('correction_token', token)
    .single()

  if (!candidate) notFound()

  const { data: session } = await supabase
    .from('sessions')
    .select('name, config')
    .eq('id', candidate.session_id)
    .single()

  const maxVideoSizeMb = (session?.config as Record<string, unknown>)?.max_video_size_mb as number || 50

  if (candidate.status === 'approved') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d0b1a] text-white px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h1 className="font-bold text-xl">Candidature déjà validée</h1>
          <p className="text-white/50 text-sm">
            Votre candidature a été approuvée. Aucune correction n&apos;est possible.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0b1a] text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xl font-bold">
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Scène</span>
          </span>
          <p className="text-white/40 text-sm mt-2">{session?.name}</p>
        </div>

        <CorrectionForm
          token={token}
          candidateName={candidate.stage_name || `${candidate.first_name} ${candidate.last_name}`}
          email={candidate.email}
          songTitle={candidate.song_title || ''}
          songArtist={candidate.song_artist || ''}
          photoUrl={candidate.photo_url || ''}
          videoUrl={candidate.video_url || ''}
          correctionFields={candidate.correction_fields || []}
          sessionId={candidate.session_id}
          candidateSlug={candidate.slug}
          maxVideoSizeMb={maxVideoSizeMb}
        />
      </div>
    </main>
  )
}
