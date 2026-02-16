'use client'

interface RankedCandidate {
  candidateId: string
  name: string
  photoUrl: string | null
  category: string
  juryScore: number
  juryNormalized: number
  publicVotes: number
  publicNormalized: number
  socialVotes: number
  socialNormalized: number
  totalScore: number
}

interface Props {
  rankings: RankedCandidate[]
  juryWeight: number
  publicWeight: number
  socialWeight: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ClassementPanel({ rankings, juryWeight, publicWeight, socialWeight }: Props) {
  if (rankings.length === 0) {
    return (
      <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-6 text-center">
        <p className="text-white/30 text-sm">Aucun classement disponible.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#2a2545] flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
          Classement
        </h3>
        <div className="flex gap-3 text-[10px] text-white/30">
          <span className="text-[#e91e8c]/60">Jury {juryWeight}%</span>
          <span className="text-[#7ec850]/60">Public {publicWeight}%</span>
          <span className="text-[#3b82f6]/60">Réseaux {socialWeight}%</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2545] text-white/30 text-xs">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Candidat</th>
              <th className="px-3 py-2 text-right">Jury</th>
              <th className="px-3 py-2 text-right">Public</th>
              <th className="px-3 py-2 text-right">Réseaux</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2545]">
            {rankings.map((r, idx) => (
              <tr
                key={r.candidateId}
                className={idx === 0 ? 'bg-[#f5a623]/5' : ''}
              >
                <td className="px-3 py-3">
                  {idx < 3 ? (
                    <span className="text-lg">{MEDALS[idx]}</span>
                  ) : (
                    <span className="text-white/30">{idx + 1}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1a1533] overflow-hidden shrink-0">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">🎤</div>
                      )}
                    </div>
                    <span className={`truncate ${idx === 0 ? 'text-[#f5a623] font-bold' : 'text-white/80'}`}>
                      {r.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className="text-[#e91e8c]">{r.juryNormalized.toFixed(1)}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className="text-[#7ec850]">{r.publicVotes}</span>
                  <span className="text-white/20 text-xs ml-1">({r.publicNormalized.toFixed(1)})</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className="text-[#3b82f6]">{r.socialVotes}</span>
                  <span className="text-white/20 text-xs ml-1">({r.socialNormalized.toFixed(1)})</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className={`font-bold ${idx === 0 ? 'text-[#f5a623]' : 'text-white'}`}>
                    {r.totalScore.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
