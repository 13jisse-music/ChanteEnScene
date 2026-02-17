import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

export const metadata = {
  title: 'Palmarès — ChanteEnScène',
  description: 'Retrouvez tous les gagnants des éditions précédentes de ChanteEnScène.',
}

interface Winner {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
  song_title: string | null
  song_artist: string | null
  session: {
    name: string
    city: string
    year: number
    slug: string
  }
}

export default async function PalmaresPage() {
  const supabase = createAdminClient()

  const { data: winners } = await supabase
    .from('candidates')
    .select(`
      id, first_name, last_name, stage_name, category, photo_url, song_title, song_artist,
      session:session_id (name, city, year, slug)
    `)
    .eq('status', 'winner')
    .order('created_at', { ascending: false })

  // Group by session year
  const grouped = new Map<number, { session: Winner['session']; winners: Winner[] }>()

  for (const w of (winners || []) as unknown as Winner[]) {
    const session = w.session
    if (!session) continue
    const year = session.year
    if (!grouped.has(year)) {
      grouped.set(year, { session, winners: [] })
    }
    grouped.get(year)!.winners.push(w)
  }

  const years = Array.from(grouped.keys()).sort((a, b) => b - a)

  return (
    <section className="relative z-10 py-8 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-3"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Palmarès <span className="text-white">Chant</span><span className="text-[#7ec850]">En</span><span className="text-[#e91e8c]">Scène</span>
        </h1>
        <p className="text-white/50 text-sm">
          Retrouvez tous les gagnants des éditions précédentes
        </p>
      </div>

      {years.length > 0 ? (
        <div className="space-y-12">
          {years.map((year) => {
            const { session, winners: yearWinners } = grouped.get(year)!
            return (
              <div key={year}>
                {/* Year header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gradient-to-r from-[#f5a623] to-[#e8732a] px-5 py-2 rounded-full">
                    <span className="font-[family-name:var(--font-montserrat)] font-black text-lg text-white">
                      {year}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm">{session.name}</h2>
                    <p className="text-white/40 text-xs">{session.city}</p>
                  </div>
                </div>

                {/* Winners grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {yearWinners.map((w) => {
                    const name = w.stage_name || (w.last_name ? `${w.first_name} ${w.last_name}` : w.first_name)
                    const placeholderIdx = w.category === 'Enfants' ? 1 : w.category === 'Adolescents' ? 2 : 4
                    const placeholderImg = `/images/placeholder-singer-${placeholderIdx}.png`
                    return (
                      <div
                        key={w.id}
                        className="bg-[#161228]/80 border border-[#f5a623]/20 rounded-2xl p-6 text-center hover:border-[#f5a623]/50 transition-colors"
                      >
                        {/* Photo */}
                        <div className="relative w-24 h-24 mx-auto mb-4">
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: 'conic-gradient(from 0deg, #f5a623, #e8732a, #f5a623)',
                              padding: '3px',
                              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
                              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
                            }}
                          />
                          <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#1a1232]">
                            <img src={w.photo_url || placeholderImg} alt={name} className="w-full h-full object-cover" />
                          </div>
                          {/* Trophy badge */}
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#f5a623] flex items-center justify-center text-sm shadow-lg">
                            🏆
                          </div>
                        </div>

                        <h3
                          className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white mb-1"
                          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
                        >
                          {name}
                        </h3>
                        <p className="text-[#f5a623] text-xs font-medium mb-2">{w.category}</p>
                        {w.song_title && (
                          <p className="text-white/40 text-xs">
                            {w.song_title}
                            {w.song_artist && <span className="text-white/25"> — {w.song_artist}</span>}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🏆</p>
          <p className="text-white/30 text-sm">
            Le palmarès sera disponible après la première édition du concours.
          </p>
        </div>
      )}
    </section>
  )
}
