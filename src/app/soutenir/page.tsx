import Link from 'next/link'

export const metadata = {
  title: 'Soutenir ChanteEnScène',
  description: 'ChanteEnScène est un projet associatif 100% bénévole. Chaque contribution nous aide à offrir une scène aux talents de demain.',
}

const STRIPE_DON_LIBRE = 'https://buy.stripe.com/00w9AL7lae3QdNafKY14407'

export default function SoutenirPage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-xl mx-auto">
      {/* Hero compact avec CTA immédiat */}
      <div className="text-center mb-5">
        <div className="text-5xl mb-2">💜</div>
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-2xl md:text-3xl text-white leading-tight mb-1.5"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Soutenez<br />
          <span className="bg-gradient-to-r from-[#e91e8c] to-[#ffc44d] bg-clip-text text-transparent">
            ChanteEnSc&egrave;ne
          </span>
        </h1>
        <p className="text-white/50 text-xs mb-4">
          Projet 100% b&eacute;n&eacute;vole &mdash; chaque euro compte
        </p>

        {/* CTA IMMÉDIAT — visible sans scroller */}
        <a
          href={STRIPE_DON_LIBRE}
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-5 py-4 rounded-full font-bold text-base text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all text-center"
        >
          ☕ Faire un don
        </a>
        <p className="text-white/30 text-[10px] mt-2">
          Montant libre &agrave; partir de 1&nbsp;&euro; &mdash; Stripe s&eacute;curis&eacute;
        </p>
      </div>

      {/* Stats compactes */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl py-2.5 px-1.5 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-black text-xl text-[#ff6b9d]">4</p>
          <p className="text-white/40 text-[10px] mt-0.5">&eacute;ditions</p>
        </div>
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl py-2.5 px-1.5 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-black text-xl text-[#a8e063]">73</p>
          <p className="text-white/40 text-[10px] mt-0.5">candidats</p>
        </div>
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl py-2.5 px-1.5 text-center">
          <p className="font-[family-name:var(--font-montserrat)] font-black text-xl text-[#ffc44d]">1800+</p>
          <p className="text-white/40 text-[10px] mt-0.5">votes</p>
        </div>
      </div>

      {/* Bonus donateur — accrocheur */}
      <div
        className="rounded-2xl p-4 text-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(255,196,77,0.06))', border: '1px solid rgba(233,30,140,0.2)' }}
      >
        <p className="text-sm mb-1">
          🎬 <strong className="text-white">Votre nom au g&eacute;n&eacute;rique</strong>
        </p>
        <p className="text-white/50 text-[11px]">
          Visible par tout le public lors de la finale
        </p>
      </div>

      {/* Où va votre don — compact 2x2 */}
      <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 mb-4">
        <p className="font-[family-name:var(--font-montserrat)] text-[11px] text-white/60 text-center mb-2.5 uppercase tracking-wider">
          Votre don finance
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎤</span>
            <span className="text-white/50 text-[11px]">Sc&egrave;ne &amp; sono</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📱</span>
            <span className="text-white/50 text-[11px]">App &amp; site web</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📨</span>
            <span className="text-white/50 text-[11px]">Communication</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💡</span>
            <span className="text-white/50 text-[11px]">Lumi&egrave;res &amp; d&eacute;co</span>
          </div>
        </div>
      </div>

      {/* 2ème CTA */}
      <div className="text-center mb-4">
        <a
          href={STRIPE_DON_LIBRE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-7 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
        >
          Soutenir le projet
        </a>
      </div>

      {/* Lien vers partenaires */}
      <div className="text-center">
        <Link
          href="/aubagne-2026/partenaires"
          className="text-white/25 text-[11px] hover:text-white/40 transition-colors border border-white/[0.08] rounded-xl px-4 py-2 inline-block"
        >
          Entreprise ? Nos offres partenaires &rarr;
        </Link>
      </div>
    </section>
  )
}
