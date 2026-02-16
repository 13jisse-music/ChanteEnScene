'use client'

interface Props {
  candidateName: string
  candidatePhoto: string | null
  category: string
  onDismiss: () => void
}

export default function JuryWinnerBanner({ candidateName, candidatePhoto, category, onDismiss }: Props) {
  return (
    <div className="bg-gradient-to-r from-[#f5a623]/20 to-[#e8732a]/20 border-2 border-[#f5a623]/40 rounded-2xl p-6 text-center space-y-4 animate-fade-up">
      <div className="text-5xl">🏆</div>

      <h2 className="font-[family-name:var(--font-montserrat)] font-black text-xl text-gradient-gold">
        Vainqueur !
      </h2>
      <p className="text-white/40 text-xs uppercase tracking-widest">{category}</p>

      <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-[3px] border-[#f5a623] shadow-lg shadow-[#f5a623]/20">
        {candidatePhoto ? (
          <img src={candidatePhoto} alt={candidateName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1533] text-3xl">🎤</div>
        )}
      </div>

      <h3 className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-white">
        {candidateName}
      </h3>

      <button
        onClick={onDismiss}
        className="text-white/30 text-xs underline underline-offset-2 hover:text-white/50 transition-colors"
      >
        Fermer
      </button>
    </div>
  )
}
