'use client'

import { useState } from 'react'

interface Props {
  jurorName: string
  onComplete: () => void
}

const STEPS = [
  {
    emoji: '🎤',
    title: 'Bienvenue dans le jury',
    subtitle: 'ChanteEnScène',
    body: 'Vous avez été choisi(e) pour faire partie du jury en ligne. Votre rôle est essentiel : vous allez découvrir les candidats et donner votre avis sur leurs prestations.',
  },
  {
    emoji: '💛',
    title: 'En âme et conscience',
    subtitle: 'La bienveillance avant tout',
    body: 'Chaque candidat a eu le courage de monter sur scène et de partager sa passion. Évaluez avec respect et bienveillance — votre vote compte, mais vos mots aussi.',
  },
  {
    emoji: '📱',
    title: 'Comment voter ?',
    subtitle: 'Simple comme un swipe',
    body: 'Regardez la vidéo de chaque candidat, puis votez :\n\n👍 Oui — Vous êtes convaincu(e)\n🤔 Peut-être — Vous hésitez\n👎 Non — Pas cette fois\n\nVous pouvez modifier vos votes à tout moment.',
  },
]

export default function JuryOnboarding({ jurorName, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#1a1533] to-[#0d0b1a] flex flex-col items-center justify-center px-6">
      {/* Close button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
        aria-label="Fermer"
      >
        <span className="text-white/50 text-xl leading-none">&times;</span>
      </button>

      {/* Progress dots */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-[#e91e8c]' : i < step ? 'w-4 bg-[#e91e8c]/40' : 'w-4 bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-sm w-full text-center space-y-6 animate-fade-up pb-44">
        <div className="text-7xl">{current.emoji}</div>

        {step === 0 && (
          <p className="text-[#e91e8c] text-sm font-medium">
            Bonjour {jurorName} !
          </p>
        )}

        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-white">
            {current.title}
          </h1>
          <p className="text-white/40 text-sm">{current.subtitle}</p>
        </div>

        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
          {current.body}
        </p>
      </div>

      {/* Actions */}
      <div className="absolute bottom-12 left-6 right-6 max-w-sm mx-auto space-y-3">
        <button
          onClick={() => {
            if (isLast) {
              onComplete()
            } else {
              setStep(step + 1)
            }
          }}
          className="w-full py-4 rounded-2xl text-sm font-bold bg-[#e91e8c] text-white hover:bg-[#d4177d] active:scale-[0.98] transition-all"
        >
          {isLast ? "C'est parti !" : 'Suivant'}
        </button>

        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full py-3 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Passer l&apos;introduction
          </button>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-white/10 text-[10px]">
          <span className="text-white/15">Chant</span>
          <span className="text-[#7ec850]/20">En</span>
          <span className="text-[#e91e8c]/20">Scène</span>
        </p>
      </div>
    </div>
  )
}
