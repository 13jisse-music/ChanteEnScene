'use client'

import { useState } from 'react'

interface Props {
  session: {
    name: string
    city: string
    year: number
    config: Record<string, unknown>
  }
  stats: {
    candidates: number
    votes: number
    pageViews: number
  }
  slug: string
}

const TIERS = [
  {
    name: 'Or',
    price: 'À partir de 500€',
    color: '#f5a623',
    bg: 'bg-[#f5a623]/10 border-[#f5a623]/30',
    features: [
      'Logo en grand sur la page d\'accueil du site',
      'Logo sur la page Partenaires (placement premium)',
      'Mention durant les événements live (demi-finale + finale)',
      'Publication dédiée sur nos réseaux sociaux',
      'Lien vers votre site web',
      'Logo sur les supports imprimés (affiches, flyers)',
      'Espace stand lors de la finale (sur demande)',
    ],
  },
  {
    name: 'Argent',
    price: 'À partir de 250€',
    color: '#94a3b8',
    bg: 'bg-white/5 border-white/20',
    features: [
      'Logo sur la page d\'accueil du site',
      'Logo sur la page Partenaires (placement visible)',
      'Mention durant les événements live',
      'Mention sur nos réseaux sociaux',
      'Lien vers votre site web',
      'Logo sur les supports imprimés',
    ],
  },
  {
    name: 'Bronze',
    price: 'À partir de 100€',
    color: '#cd7f32',
    bg: 'bg-[#cd7f32]/10 border-[#cd7f32]/30',
    features: [
      'Logo sur la page Partenaires',
      'Mention dans le programme de l\'événement',
      'Lien vers votre site web',
    ],
  },
  {
    name: 'Partenaire',
    price: 'Échange de visibilité',
    color: '#e91e8c',
    bg: 'bg-[#e91e8c]/10 border-[#e91e8c]/30',
    features: [
      'Logo sur la page Partenaires',
      'Échange de visibilité réciproque',
      'Possibilité de lots / prix pour les candidats',
    ],
  },
]

export default function DossierClient({ session, stats }: Props) {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Print button */}
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
        >
          Imprimer / Télécharger PDF
        </button>
      </div>

      {/* ═══ PAGE 1 : COVER ═══ */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 text-center print:bg-white print:border-gray-200 print:text-black">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-3xl sm:text-4xl md:text-5xl mb-2 print:text-black">
            <span className="text-white print:text-black">Chant</span>
            <span className="text-[#7ec850] print:text-[#7ec850]">En</span>
            <span className="text-[#e91e8c] print:text-[#e91e8c]">Scène</span>
          </h1>
          <p className="text-white/40 text-sm print:text-gray-500">
            Édition {session.year}
          </p>
        </div>

        <div className="my-8 sm:my-10 py-6 sm:py-8 border-y border-white/10 print:border-gray-200">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-2xl md:text-3xl text-gradient-gold print:text-[#f5a623]">
            Dossier de Partenariat
          </h2>
          <p className="text-white/50 text-sm mt-3 max-w-md mx-auto print:text-gray-600">
            Rejoignez l&apos;aventure et donnez de la voix à votre marque !
          </p>
        </div>

        <p className="text-white/30 text-xs print:text-gray-400">
          inscriptions@chantenscene.fr
        </p>
      </div>

      {/* ═══ PAGE 2 : PRÉSENTATION ═══ */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 print:bg-white print:border-gray-200 print:text-black print:break-before-page">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-6 print:text-black">
          Qu&apos;est-ce que <span className="text-[#e91e8c]">ChanteEnScène</span> ?
        </h2>

        <div className="space-y-4 text-white/70 text-sm leading-relaxed print:text-gray-700">
          <p>
            <strong className="text-white print:text-black">ChanteEnScène</strong> est un concours de chant
            ouvert à tous, organisé à <strong className="text-white print:text-black">{session.city}</strong>.
            De l&apos;inscription en ligne à la grande finale sur scène, c&apos;est une expérience unique
            qui rassemble des dizaines de candidats et des centaines de spectateurs.
          </p>
          <p>
            Le concours se déroule en <strong className="text-white print:text-black">3 phases</strong> :
            une sélection en ligne par un jury professionnel, une demi-finale publique, et une
            grande finale en plein air avec musiciens live. Trois catégories d&apos;âge (Enfant, Ado, Adulte)
            permettent à chacun de participer.
          </p>
          <p>
            Grâce à sa <strong className="text-white print:text-black">plateforme digitale innovante</strong>,
            ChanteEnScène offre une expérience moderne : galerie de candidats interactive (style TikTok),
            votes en direct, streaming live, et un site web complet accessible en permanence.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <StatBox
            value={stats.candidates > 0 ? `${stats.candidates}+` : '30+'}
            label="Candidats"
            color="#e91e8c"
          />
          <StatBox
            value={stats.votes > 0 ? `${stats.votes}+` : '500+'}
            label="Votes en ligne"
            color="#f5a623"
          />
          <StatBox
            value={stats.pageViews > 0 ? `${Math.round(stats.pageViews / 100) * 100}+` : '2000+'}
            label="Visiteurs du site"
            color="#7ec850"
          />
        </div>
      </div>

      {/* ═══ PAGE 3 : AUDIENCE & VISIBILITÉ ═══ */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 print:bg-white print:border-gray-200 print:text-black print:break-before-page">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-6 print:text-black">
          Votre visibilité
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VisibilityCard
            icon="🌐"
            title="Site web & app mobile"
            description="Un site moderne et interactif visité par les candidats, leurs proches, les votants et les curieux. Votre logo y est visible 24h/24 pendant toute la durée du concours (3-4 mois)."
          />
          <VisibilityCard
            icon="📱"
            title="Réseaux sociaux"
            description="Posts dédiés, stories, mentions dans les publications. Votre marque est associée à un événement festif et positif."
          />
          <VisibilityCard
            icon="🎤"
            title="Événements live"
            description="Demi-finale et finale avec un public de plusieurs centaines de personnes. Annonces micro, affichage sur écran, présence physique possible."
          />
          <VisibilityCard
            icon="📰"
            title="Supports imprimés"
            description="Affiches, flyers, programme de l'événement distribués dans les commerces et lieux publics de la ville."
          />
        </div>
      </div>

      {/* ═══ PAGE 4 : OFFRES ═══ */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 print:bg-white print:border-gray-200 print:text-black print:break-before-page">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-2 print:text-black">
          Nos offres de partenariat
        </h2>
        <p className="text-white/40 text-sm mb-8 print:text-gray-500">
          Choisissez la formule qui correspond à votre budget et vos objectifs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`border rounded-2xl p-6 ${tier.bg} print:border-gray-300 print:bg-gray-50`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="font-[family-name:var(--font-montserrat)] font-bold text-lg"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </h3>
                <span
                  className="text-sm font-bold"
                  style={{ color: tier.color }}
                >
                  {tier.price}
                </span>
              </div>
              <ul className="space-y-2">
                {tier.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/60 print:text-gray-600">
                    <span className="mt-0.5 text-xs" style={{ color: tier.color }}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-6 text-center print:text-gray-400">
          Les montants sont indicatifs et peuvent être adaptés selon votre projet. N&apos;hésitez pas à nous contacter !
        </p>
      </div>

      {/* ═══ PAGE 5 : CONTACT FORM ═══ */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 print:bg-white print:border-gray-200 print:text-black print:break-before-page">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mb-2 text-center print:text-black">
          Intéressé(e) ?
        </h2>
        <p className="text-white/50 text-sm mb-6 sm:mb-8 max-w-md mx-auto text-center print:text-gray-600">
          Laissez-nous vos coordonnées, nous vous recontactons rapidement.
        </p>

        <PartnerForm />

        <div className="mt-8 pt-6 border-t border-white/10 text-center print:border-gray-200">
          <p className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
            <span className="text-white print:text-black">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Scène</span>
          </p>
          <p className="text-white/20 text-xs mt-1 print:text-gray-400">
            Le concours de chant — Édition {session.year}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center p-4 rounded-xl bg-white/5 print:bg-gray-50 print:border print:border-gray-200">
      <p className="font-[family-name:var(--font-montserrat)] font-bold text-2xl" style={{ color }}>
        {value}
      </p>
      <p className="text-white/40 text-xs mt-1 print:text-gray-500">{label}</p>
    </div>
  )
}

function VisibilityCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-white/5 border border-white/5 print:bg-gray-50 print:border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-sm text-white print:text-black">{title}</h3>
      </div>
      <p className="text-white/50 text-xs leading-relaxed print:text-gray-600">{description}</p>
    </div>
  )
}

const FORM_INPUT =
  'w-full bg-[#1a1232]/80 border border-[#2e2555] rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[#f0eaf7] placeholder:text-[#6b5d85] focus:outline-none focus:border-[#e91e8c] focus:ring-1 focus:ring-[#e91e8c]/30 transition-colors'

function PartnerForm() {
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/partner-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez-nous à inscriptions@chantenscene.fr')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8 animate-fade-up">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-bold text-white">Merci pour votre intérêt !</p>
        <p className="text-white/50 text-sm mt-2">Nous vous recontactons très vite.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto no-print">
      <div>
        <label className="block text-sm font-medium text-[#a899c2] mb-1.5">
          Entreprise / Organisation <span className="text-[#e91e8c]">*</span>
        </label>
        <input
          type="text"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Nom de votre entreprise"
          className={FORM_INPUT}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#a899c2] mb-1.5">
          Email <span className="text-[#e91e8c]">*</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className={FORM_INPUT}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#a899c2] mb-1.5">
          Téléphone <span className="text-[#6b5d85] text-xs">(optionnel)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
          className={FORM_INPUT}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#a899c2] mb-1.5">
          Message <span className="text-[#6b5d85] text-xs">(optionnel)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Parlez-nous de votre projet..."
          rows={3}
          className={FORM_INPUT + ' resize-none'}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f5a623] to-[#e08e0b] hover:shadow-lg hover:shadow-[#f5a623]/30 transition-all disabled:opacity-50"
      >
        {loading ? 'Envoi...' : 'Envoyer ma demande'}
      </button>
    </form>
  )
}
