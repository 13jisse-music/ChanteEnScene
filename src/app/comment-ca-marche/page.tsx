import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Comment ça marche — ChanteEnScène',
  description: 'Découvrez toutes les fonctionnalités de ChanteEnScène : inscriptions, votes, live, mode reporter, galerie photos et plus.',
}

const SESSION_SLUG = 'aubagne-2026'

export default function CommentCaMarchePage() {
  return (
    <div className="relative z-10 min-h-screen">
      {/* Hero */}
      <section className="relative pt-12 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e91e8c]/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-[#e91e8c] text-sm font-semibold uppercase tracking-widest mb-3">
            ChanteEnScène
          </p>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-5xl text-white leading-tight">
            Comment ça marche ?
          </h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">
            Tout ce que vous pouvez faire sur la plateforme — voter, suivre le live, prendre des photos et plus.
          </p>
        </div>
      </section>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24 space-y-20">

        {/* ─── S'INSCRIRE ─── */}
        <Feature
          icon="📝"
          title="S'inscrire au concours"
          accent="#f5a623"
          reverse={false}
          image="/images/comment-ca-marche/inscription.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              L&apos;inscription se fait entièrement en ligne, en <strong className="text-white/80">4 étapes simples</strong> :
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StepBox n="1" title="Identité" desc="Nom, prénom, date de naissance. La catégorie (Enfant, Ado, Adulte) est calculée automatiquement." />
              <StepBox n="2" title="Chanson" desc="Choisissez votre chanson, l'artiste original et le style musical." />
              <StepBox n="3" title="Vidéo" desc="Envoyez une vidéo de votre candidature et une photo de profil." />
              <StepBox n="4" title="Validation" desc="Consentement et confirmation. Vous recevez un email de confirmation." />
            </div>
            <p className="text-white/60 text-xs">
              Après validation par l&apos;équipe, votre profil apparaît dans la galerie des candidats.
            </p>
            <CTA href={`/${SESSION_SLUG}/inscription`} label="Je m'inscris" />
          </div>
        </Feature>

        {/* ─── VOTER ─── */}
        <Feature
          icon="❤️"
          title="Voter pour vos favoris"
          accent="#e91e8c"
          reverse={true}
          image="/images/comment-ca-marche/voter.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Soutenez vos candidats préférés en un clic. <strong className="text-white/80">Pas besoin de créer un compte</strong> — le vote est lié à votre appareil.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InfoCard icon="🔒" title="Sécurisé" desc="1 vote par appareil et par candidat, impossible de tricher" />
              <InfoCard icon="⚡" title="Instantané" desc="Le compteur de votes se met à jour en temps réel" />
              <InfoCard icon="📱" title="Sur mobile" desc="Votez depuis votre téléphone, tablette ou ordinateur" />
            </div>
            <CTA href={`/${SESSION_SLUG}/candidats`} label="Voir les candidats" />
          </div>
        </Feature>

        {/* ─── SUIVRE LE LIVE ─── */}
        <Feature
          icon="🔴"
          title="Suivre le live en direct"
          accent="#ef4444"
          reverse={false}
          image="/images/comment-ca-marche/live.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Pendant la demi-finale et la grande finale, suivez tout en direct depuis votre téléphone — même si vous êtes dans le public !
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon="🎤" title="Candidat en cours" desc="Voyez qui est sur scène avec sa photo, sa chanson et sa bio" />
              <InfoCard icon="❤️" title="Vote en direct" desc="Le bouton 'Je soutiens' apparaît quand le vote est ouvert" />
              <InfoCard icon="📊" title="Temps réel" desc="Compteur de votes en direct, mis à jour chaque seconde" />
              <InfoCard icon="👀" title="À suivre" desc="Découvrez qui passe ensuite dans le lineup" />
            </div>
            <CTA href={`/${SESSION_SLUG}/live`} label="Page Live" />
          </div>
        </Feature>

        {/* ─── MODE REPORTER ─── */}
        <Feature
          icon="📸"
          title="Mode Reporter"
          accent="#8b5cf6"
          reverse={true}
          image="/images/comment-ca-marche/reporter.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Vous êtes dans le public ? Devenez <strong className="text-white/80">reporter du concours</strong> ! Prenez des photos pendant les performances et contribuez à la galerie officielle.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon="📷" title="Photographiez" desc="Prenez jusqu'à 5 photos par spectacle directement depuis la page Live" />
              <InfoCard icon="✨" title="Publiez" desc="Vos meilleures photos sont sélectionnées et publiées dans la galerie" />
              <InfoCard icon="👤" title="Crédité" desc="Votre nom apparaît comme crédit sur vos photos" />
              <InfoCard icon="🔄" title="Automatique" desc="La photo est liée au candidat en cours sur scène" />
            </div>
            <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-xl p-4 text-center">
              <p className="text-[#8b5cf6] text-sm font-semibold">
                Disponible sur mobile pendant le live
              </p>
              <p className="text-white/60 text-xs mt-1">
                Renseignez votre email et c&apos;est parti !
              </p>
            </div>
          </div>
        </Feature>

        {/* ─── REVELATION VAINQUEUR ─── */}
        <Feature
          icon="🎉"
          title="Révélation du vainqueur"
          accent="#f5a623"
          reverse={false}
          image="/images/comment-ca-marche/vainqueur.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Le moment le plus attendu de la soirée ! La révélation du gagnant se vit <strong className="text-white/80">simultanément sur tous les écrans</strong> — scène, téléphones du public, jury...
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InfoCard icon="🪙" title="Countdown" desc="Animation 3D avec une pièce tournante et les photos des finalistes" />
              <InfoCard icon="🏆" title="Annonce" desc="Le nom et la photo du vainqueur apparaissent en plein écran" />
              <InfoCard icon="🎊" title="Confettis" desc="Explosion de confettis synchronisée sur tous les appareils" />
            </div>
            <p className="text-white/60 text-xs text-center">
              Un vainqueur est désigné par catégorie : Enfant, Ado, Adulte.
            </p>
          </div>
        </Feature>

        {/* ─── NOTIFICATIONS ─── */}
        <Feature
          icon="🔔"
          title="Notifications push"
          accent="#3b82f6"
          reverse={true}
          image="/images/comment-ca-marche/notifications.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Activez les notifications pour ne rien manquer ! Vous serez prévenu quand :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon="🎤" title="Candidat sur scène" desc="Un nouveau candidat commence sa performance" />
              <InfoCard icon="🗳️" title="Vote ouvert" desc="C'est le moment de voter pour votre favori" />
              <InfoCard icon="🏆" title="Résultats" desc="Le vainqueur a été annoncé" />
              <InfoCard icon="📢" title="Annonces" desc="Infos importantes de l'organisation" />
            </div>
            <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-4 text-center">
              <p className="text-white/70 text-xs">
                Les notifications fonctionnent dans le navigateur. Pas besoin d&apos;installer d&apos;application.
              </p>
            </div>
          </div>
        </Feature>

        {/* ─── PARRAINAGE ─── */}
        <Feature
          icon="🤝"
          title="Parrainage"
          accent="#8b5cf6"
          reverse={false}
          image="/images/comment-ca-marche/voter.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Vous êtes candidat(e) ? <strong className="text-white/80">Parrainez vos proches</strong> et faites grandir le concours !
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon="🔗" title="Votre lien unique" desc="Chaque candidat dispose d'un lien de parrainage personnalisé sur sa page profil" />
              <InfoCard icon="📲" title="Partagez-le" desc="Envoyez-le par WhatsApp, SMS, Instagram… à ceux qui aiment chanter" />
              <InfoCard icon="📊" title="Compteur" desc="Suivez en direct le nombre de filleuls inscrits grâce à vous" />
              <InfoCard icon="⭐" title="Visibilité" desc="Plus vous parrainez, plus votre profil attire l'attention !" />
            </div>
            <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-xl p-4 text-center">
              <p className="text-[#8b5cf6] text-sm font-semibold">
                Comment ça marche ?
              </p>
              <p className="text-white/60 text-xs mt-1">
                1. Inscrivez-vous &bull; 2. Allez sur &laquo;&nbsp;Mon profil&nbsp;&raquo; &bull; 3. Copiez votre lien de parrainage &bull; 4. Partagez-le !
              </p>
            </div>
          </div>
        </Feature>

        {/* ─── GALERIE & PARTAGE ─── */}
        <Feature
          icon="🖼️"
          title="Galerie & partage"
          accent="#7ec850"
          reverse={false}
          image="/images/comment-ca-marche/galerie.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Retrouvez toutes les photos du concours dans la galerie. Partagez vos candidats préférés sur les réseaux sociaux.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon="📸" title="Galerie photos" desc="Photos officielles + photos du public (Mode Reporter)" />
              <InfoCard icon="🔗" title="Partager" desc="WhatsApp, Facebook, X, Instagram ou copier le lien" />
              <InfoCard icon="👤" title="Profil unique" desc="Chaque candidat a sa propre page avec URL partageable" />
              <InfoCard icon="📱" title="Responsive" desc="Swipe TikTok sur mobile, feed Instagram sur desktop" />
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <CTA href={`/${SESSION_SLUG}/candidats`} label="Candidats" />
              <CTA href={`/${SESSION_SLUG}/galerie`} label="Galerie" />
            </div>
          </div>
        </Feature>

        {/* ─── CHATBOT ─── */}
        <Feature
          icon="💬"
          title="Une question ?"
          accent="#e91e8c"
          reverse={true}
          image="/images/comment-ca-marche/chatbot.png"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              Le <strong className="text-white/80">chatbot automatique</strong> répond à vos questions 24h/24 : dates, lieu, inscription, règlement, résultats...
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon="🤖" title="Réponse instantanée" desc="Tapez votre question et obtenez une réponse immédiate" />
              <InfoCard icon="💡" title="20+ sujets" desc="Inscription, dates, catégories, jury, règlement..." />
            </div>
            <p className="text-white/60 text-xs text-center">
              Le widget 💬 est visible en bas à droite sur toutes les pages.
            </p>
          </div>
        </Feature>

        {/* ─── CTA FINAL ─── */}
        <section className="text-center pt-8">
          <div className="bg-gradient-to-br from-[#e91e8c]/10 to-[#f5a623]/10 border border-white/10 rounded-2xl p-8 md:p-12">
            <p className="text-3xl mb-2">🎤</p>
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-2">
              Prêt à participer ?
            </h2>
            <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">
              Inscrivez-vous au concours ou découvrez les candidats déjà en lice.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/${SESSION_SLUG}/inscription`}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white hover:shadow-lg hover:shadow-[#e91e8c]/20 transition-all"
              >
                Je m&apos;inscris
              </Link>
              <Link
                href={`/${SESSION_SLUG}/candidats`}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                Voir les candidats
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ═══ Sub-components ═══ */

function Feature({
  icon,
  title,
  accent,
  reverse,
  image,
  children,
}: {
  icon: string
  title: string
  accent: string
  reverse: boolean
  image?: string
  children: React.ReactNode
}) {
  return (
    <section className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-10 items-center`}>
      {/* Illustration */}
      {image && (
        <div className="w-full md:w-[45%] shrink-0">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/15 shadow-lg shadow-black/30">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 450px"
            />
          </div>
        </div>
      )}
      {/* Text content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${accent}20` }}
          >
            {icon}
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
              {title}
            </h2>
            <div className="w-10 h-0.5 rounded-full mt-1.5" style={{ background: accent }} />
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function StepBox({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center text-xs font-bold">
          {n}
        </span>
        <span className="text-white text-sm font-semibold">{title}</span>
      </div>
      <p className="text-white/60 text-xs leading-relaxed">{desc}</p>
    </div>
  )
}

function InfoCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-3 items-start">
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-white/80 text-sm font-semibold">{title}</p>
        <p className="text-white/60 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
    >
      {label} →
    </Link>
  )
}
