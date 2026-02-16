'use client'

interface Props {
  current: number
  total: number
}

export default function JuryVoteCounter({ current, total }: Props) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/40 uppercase tracking-wider">Votes jury</p>
        <p className="text-sm font-bold text-white">
          {current}
          <span className="text-white/30 font-normal">/{total}</span>
        </p>
      </div>
      <div className="w-full h-2 bg-[#2a2545] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {current >= total && total > 0 && (
        <p className="text-[10px] text-[#7ec850] mt-1.5">Tous les votes sont enregistrés</p>
      )}
    </div>
  )
}
