import Link from 'next/link'

export const metadata = {
  title: 'Soutenir ChanteEnScène',
  description: 'ChanteEnScène est un projet associatif 100% bénévole. Chaque contribution nous aide à offrir une scène aux talents de demain.',
}

const STRIPE_DON_LIBRE = 'https://buy.stripe.com/aFacMX0WMf7UgZm56k14406'

export default function SoutenirPage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-3"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Soutenir ChanteEnSc&egrave;ne
        </h1>
        <p className="text-white/50 text-sm leading-relaxed max-w-md mx-auto">
          ChanteEnSc&egrave;ne est un projet associatif 100% b&eacute;n&eacute;vole.<br />
          Chaque contribution nous aide &agrave; offrir une sc&egrave;ne aux talents de demain.
        </p>
      </div>

      {/* Chiffres impact */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-4 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-[#ff6b9d]" style={{ textShadow: '0 0 12px rgba(233,30,140,0.4)' }}>4</p>
          <p className="text-white/40 text-[11px] mt-1">&eacute;ditions</p>
        </div>
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-4 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-[#a8e063]" style={{ textShadow: '0 0 12px rgba(126,200,80,0.4)' }}>73</p>
          <p className="text-white/40 text-[11px] mt-1">candidats 2025</p>
        </div>
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-4 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl text-[#ffc44d]" style={{ textShadow: '0 0 12px rgba(245,166,35,0.4)' }}>1800+</p>
          <p className="text-white/40 text-[11px] mt-1">votes publics</p>
        </div>
      </div>

      {/* Card don principal */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8 text-center mb-6">
        <div className="text-4xl mb-3">&#9749;</div>
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-2">
          Offrez-nous un caf&eacute;... ou plus !
        </h2>
        <p className="text-white/40 text-sm leading-relaxed mb-6">
          Montant libre, &agrave; partir de 1&nbsp;&euro;. Paiement s&eacute;curis&eacute; par Stripe.<br />
          Chaque euro compte pour financer la sc&egrave;ne, le son et les lumi&egrave;res.
        </p>
        <a
          href={STRIPE_DON_LIBRE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
        >
          Faire un don
        </a>
      </div>

      {/* A quoi sert votre don */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-8">
        <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white text-center mb-4">
          &Agrave; quoi sert votre don ?
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#128241;</span>
            <p className="text-white/50 text-sm">D&eacute;veloppement et h&eacute;bergement de l&apos;application mobile</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#127760;</span>
            <p className="text-white/50 text-sm">Noms de domaine, serveurs et services en ligne</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#128232;</span>
            <p className="text-white/50 text-sm">Newsletters, notifications push et communication digitale</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#128200;</span>
            <p className="text-white/50 text-sm">Outils marketing : analytics, r&eacute;seaux sociaux, r&eacute;f&eacute;rencement</p>
          </div>
        </div>
      </div>

      {/* Générique de fin */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-8 text-center">
        <p className="text-white/60 text-sm leading-relaxed">
          &#127916; Votre nom appara&icirc;tra dans le <strong className="text-white">g&eacute;n&eacute;rique de fin</strong> du concours,
          visible par tout le public lors de la finale.
        </p>
      </div>

      {/* Lien vers partenaires */}
      <div className="text-center">
        <Link
          href="/aubagne-2026/partenaires"
          className="text-white/25 text-xs hover:text-white/40 transition-colors border border-white/[0.08] rounded-xl px-4 py-2.5 inline-block"
        >
          Vous &ecirc;tes une entreprise ? D&eacute;couvrez nos offres partenaires &rarr;
        </Link>
      </div>
    </section>
  )
}
