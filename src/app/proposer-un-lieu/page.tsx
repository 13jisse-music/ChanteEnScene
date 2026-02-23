import ProposerLieuForm from '@/components/ProposerLieuForm'

export const metadata = {
  title: 'Proposer un lieu — ChanteEnScène',
  description: 'Vous souhaitez accueillir ChanteEnScène dans votre ville ? Proposez votre commune pour une prochaine édition du concours de chant.',
}

export default function ProposerLieuPage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-3"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Proposer un lieu
        </h1>
        <p className="text-white/50 text-sm max-w-lg mx-auto">
          ChanteEnSc&egrave;ne voyage ! Vous repr&eacute;sentez une commune, une salle de spectacle ou un lieu en plein air ?
          Proposez votre ville pour accueillir une prochaine &eacute;dition.
        </p>
      </div>

      {/* Arguments */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">🎤</div>
          <p className="text-white font-semibold text-sm mb-1">Animation culturelle</p>
          <p className="text-white/40 text-xs leading-relaxed">
            Un &eacute;v&eacute;nement f&eacute;d&eacute;rateur qui attire un public familial et interg&eacute;n&eacute;rationnel.
          </p>
        </div>
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">📣</div>
          <p className="text-white font-semibold text-sm mb-1">Visibilit&eacute; m&eacute;diatique</p>
          <p className="text-white/40 text-xs leading-relaxed">
            Pr&eacute;sence sur le site, r&eacute;seaux sociaux, newsletter et application mobile d&eacute;di&eacute;e.
          </p>
        </div>
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <p className="text-white font-semibold text-sm mb-1">Format &eacute;prouv&eacute;</p>
          <p className="text-white/40 text-xs leading-relaxed">
            3 &eacute;ditions r&eacute;ussies &agrave; Aubagne. Organisation cl&eacute; en main, de A &agrave; Z.
          </p>
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 mb-8">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-white text-center mb-4">
          ChanteEnSc&egrave;ne en chiffres
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-[#e91e8c] font-bold text-2xl">4</p>
            <p className="text-white/40 text-xs">&eacute;ditions</p>
          </div>
          <div>
            <p className="text-[#7ec850] font-bold text-2xl">73</p>
            <p className="text-white/40 text-xs">candidats (2025)</p>
          </div>
          <div>
            <p className="text-[#f5a623] font-bold text-2xl">1800+</p>
            <p className="text-white/40 text-xs">votes publics</p>
          </div>
          <div>
            <p className="text-[#8b5cf6] font-bold text-2xl">5</p>
            <p className="text-white/40 text-xs">jur&eacute;s professionnels</p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-2 text-center">
          Contactez-nous
        </h2>
        <p className="text-white/50 text-sm mb-6 text-center">
          Remplissez ce formulaire et nous &eacute;tudierons votre proposition.
        </p>
        <ProposerLieuForm />
      </div>
    </section>
  )
}
