'use client'

import Link from 'next/link'

interface Sponsor {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  tier: string
  position: number
}

interface Props {
  sponsors: Sponsor[]
  sessionName: string
  slug: string
}

const TIER_ORDER = ['gold', 'silver', 'bronze', 'partner'] as const

const TIER_CONFIG: Record<string, { label: string; labelColor: string; borderColor: string; gridCols: string }> = {
  gold: {
    label: 'Partenaires Or',
    labelColor: 'text-[#f5a623]',
    borderColor: 'border-[#f5a623]/20 hover:border-[#f5a623]/50',
    gridCols: 'grid-cols-1 sm:grid-cols-2',
  },
  silver: {
    label: 'Partenaires Argent',
    labelColor: 'text-white/60',
    borderColor: 'border-white/15 hover:border-white/30',
    gridCols: 'grid-cols-2 sm:grid-cols-3',
  },
  bronze: {
    label: 'Partenaires Bronze',
    labelColor: 'text-[#cd7f32]',
    borderColor: 'border-[#cd7f32]/20 hover:border-[#cd7f32]/40',
    gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  },
  partner: {
    label: 'Partenaires',
    labelColor: 'text-[#e91e8c]',
    borderColor: 'border-[#e91e8c]/15 hover:border-[#e91e8c]/35',
    gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  },
}

export default function SponsorShowcase({ sponsors, sessionName, slug }: Props) {
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    config: TIER_CONFIG[tier],
    items: sponsors.filter((s) => s.tier === tier),
  })).filter((g) => g.items.length > 0)

  if (sponsors.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-3xl md:text-4xl mb-4">
          Nos <span className="text-gradient-gold">Partenaires</span>
        </h1>
        <p className="text-white/40 text-sm max-w-md mx-auto mb-8">
          Les partenaires de {sessionName} seront annoncés prochainement.
        </p>
        <Link
          href={`/${slug}/partenaires/dossier`}
          className="inline-block px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f5a623] to-[#e08e0b] hover:shadow-lg hover:shadow-[#f5a623]/30 transition-all"
        >
          Devenir partenaire
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-3xl md:text-4xl mb-3">
          Nos <span className="text-gradient-gold">Partenaires</span>
        </h1>
        <p className="text-white/40 text-sm max-w-lg mx-auto">
          Merci à nos partenaires qui rendent {sessionName} possible !
        </p>
      </div>

      {/* Tier sections */}
      {grouped.map(({ tier, config, items }) => (
        <div key={tier}>
          <h2 className={`font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider mb-5 ${config.labelColor}`}>
            {config.label}
          </h2>
          <div className={`grid gap-5 ${config.gridCols}`}>
            {items.map((sponsor) => (
              <SponsorCard
                key={sponsor.id}
                sponsor={sponsor}
                borderColor={config.borderColor}
                isGold={tier === 'gold'}
              />
            ))}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="text-center pt-8 border-t border-white/5">
        <p className="text-white/30 text-sm mb-4">Vous souhaitez soutenir le concours ?</p>
        <Link
          href={`/${slug}/partenaires/dossier`}
          className="inline-block px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f5a623] to-[#e08e0b] hover:shadow-lg hover:shadow-[#f5a623]/30 transition-all text-white"
        >
          Devenir partenaire
        </Link>
      </div>
    </div>
  )
}

function SponsorCard({
  sponsor,
  borderColor,
  isGold,
}: {
  sponsor: Sponsor
  borderColor: string
  isGold: boolean
}) {
  const content = (
    <div
      className={`bg-[#161228]/80 border rounded-2xl transition-all duration-300 ${borderColor} ${
        isGold ? 'p-6' : 'p-4'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center justify-center mb-3 ${isGold ? 'h-28' : 'h-20'}`}>
        {sponsor.logo_url ? (
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
            <span className="text-3xl">🏢</span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className={`font-[family-name:var(--font-montserrat)] font-bold text-center mb-1 ${
        isGold ? 'text-base' : 'text-sm'
      }`}>
        {sponsor.name}
      </h3>

      {/* Description */}
      {sponsor.description && (
        <p className={`text-white/40 text-center ${isGold ? 'text-sm' : 'text-xs'} line-clamp-2`}>
          {sponsor.description}
        </p>
      )}

      {/* Website hint */}
      {sponsor.website_url && (
        <p className="text-[#e91e8c]/40 text-xs text-center mt-2">
          Visiter le site →
        </p>
      )}
    </div>
  )

  if (sponsor.website_url) {
    return (
      <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    )
  }

  return content
}
