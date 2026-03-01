import Link from 'next/link'

export const metadata = {
  title: 'Astuces — ChanteEnScène',
  description: 'Conseils pratiques pour réussir votre candidature, obtenir plus de votes et briller le jour de l\'audition.',
}

const SESSION_SLUG = 'aubagne-2026'

export default function AstucesPage() {
  return (
    <div className="relative z-10 min-h-screen">
      {/* Hero */}
      <section className="relative pt-12 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f5a623]/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest mb-3">
            Guide pratique
          </p>
          <h1 className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-5xl text-white leading-tight">
            Astuces pour briller
          </h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">
            Tout ce qu&apos;il faut savoir pour réussir votre candidature, maximiser vos votes et vous préparer pour le jour J.
          </p>

          {/* Tabs */}
          <div className="flex justify-center gap-3 mt-8">
            <a href="#candidats" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white">
              Candidats
            </a>
            <a href="#public" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all">
              Public &amp; supporters
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-24">

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION CANDIDATS                          */}
        {/* ═══════════════════════════════════════════ */}
        <div id="candidats" className="scroll-mt-24">
          <SectionTitle emoji="🎤" title="Conseils pour les candidats" />

          {/* ─── FILMER SA VIDÉO ─── */}
          <TipCard
            number="1"
            icon="🎬"
            title="Réussir sa vidéo de candidature"
            accent="#e91e8c"
          >
            <p className="text-white/60 text-sm mb-4">
              La vidéo est votre <strong className="text-white/80">première impression</strong>. Pas besoin de matériel pro, un smartphone suffit !
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Tip emoji="💡" title="Lumière" text="Filmez face à une fenêtre (lumière naturelle). Évitez les contre-jours et les néons." />
              <Tip emoji="📐" title="Cadrage" text="Format portrait, cadré de la taille à la tête. Laissez de l'espace au-dessus." />
              <Tip emoji="🔇" title="Son" text="Choisissez un endroit calme. Pas de musique de fond ni de bruit de voiture." />
              <Tip emoji="🎨" title="Fond" text="Un mur uni ou un fond sobre. Rangez ce qui traîne derrière vous !" />
              <Tip emoji="⏱️" title="Durée" text="1 à 2 minutes max. Allez droit au but : un couplet + un refrain suffisent." />
              <Tip emoji="📱" title="Qualité" text="Filmez en 720p pour garder un fichier léger (max 50 Mo). Vérifiez avant d'envoyer." />
            </div>
            <div className="mt-4 bg-[#e91e8c]/10 border border-[#e91e8c]/20 rounded-xl p-4">
              <p className="text-[#e91e8c] text-sm font-semibold mb-1">Astuce bonus</p>
              <p className="text-white/60 text-xs">
                Si votre vidéo est trop lourde, postez-la sur YouTube (même en &laquo;&nbsp;non répertorié&nbsp;&raquo;) et collez le lien dans le formulaire. C&apos;est la méthode la plus simple !
              </p>
            </div>
          </TipCard>

          {/* ─── CHOISIR SA CHANSON ─── */}
          <TipCard
            number="2"
            icon="🎵"
            title="Bien choisir sa chanson"
            accent="#8b5cf6"
          >
            <p className="text-white/60 text-sm mb-4">
              Le choix de la chanson est <strong className="text-white/80">stratégique</strong>. Voici comment maximiser votre impact.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Tip emoji="🎯" title="Dans votre tessiture" text="Choisissez une chanson que vous pouvez chanter confortablement, sans forcer sur les aigus." />
              <Tip emoji="❤️" title="Émotion" text="Choisissez une chanson qui vous touche. L'émotion sincère se voit et s'entend." />
              <Tip emoji="🎭" title="Originalité" text="Évitez les grands classiques trop chantés. Surprenez le jury avec un choix personnel." />
              <Tip emoji="🗣️" title="Les paroles" text="Apprenez les paroles par cœur. Hésiter sur les mots casse la magie." />
            </div>
          </TipCard>

          {/* ─── OBTENIR DES VOTES ─── */}
          <TipCard
            number="3"
            icon="🗳️"
            title="Maximiser ses votes"
            accent="#f5a623"
          >
            <p className="text-white/60 text-sm mb-4">
              Les votes du public comptent pour <strong className="text-white/80">40% du score final</strong>. Chaque vote compte !
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Tip emoji="📲" title="Partagez votre page" text="Envoyez le lien de votre profil candidat par WhatsApp, SMS, email à tous vos contacts." />
              <Tip emoji="📸" title="Réseaux sociaux" text="Postez votre lien sur Instagram, Facebook, TikTok. Ajoutez #ChanteEnScène." />
              <Tip emoji="🤝" title="Parrainage" text="Utilisez votre lien de parrainage (sur votre profil) pour inviter d'autres chanteurs." />
              <Tip emoji="🔄" title="Relancez" text="Ne postez pas qu'une fois. Rappelez à vos proches de voter, surtout en fin de semaine." />
            </div>
            <div className="mt-4 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-xl p-4">
              <p className="text-[#f5a623] text-sm font-semibold mb-1">Le saviez-vous ?</p>
              <p className="text-white/60 text-xs">
                Chaque personne peut voter 1 fois par candidat depuis son appareil. Plus vous touchez de monde, plus vous recevez de votes !
              </p>
            </div>
          </TipCard>

          {/* ─── LE JOUR J ─── */}
          <TipCard
            number="4"
            icon="🌟"
            title="Le jour de l'audition"
            accent="#3b82f6"
          >
            <p className="text-white/60 text-sm mb-4">
              Voici comment <strong className="text-white/80">être au top</strong> le jour de la demi-finale ou de la finale.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Tip emoji="😴" title="Repos" text="Dormez bien la veille. Évitez de forcer votre voix les jours précédents." />
              <Tip emoji="🍵" title="Hydratation" text="Buvez de l'eau tiède (pas glacée). Évitez les sodas et les produits laitiers avant de chanter." />
              <Tip emoji="👗" title="Tenue" text="Portez une tenue dans laquelle vous vous sentez bien et qui correspond à votre chanson." />
              <Tip emoji="🎤" title="Micro" text="Tenez le micro droit, à 2-3 cm de la bouche. Ne le couvrez pas avec la main." />
              <Tip emoji="👀" title="Regard" text="Regardez le public, pas vos pieds. Balayez la salle du regard." />
              <Tip emoji="😊" title="Sourire" text="Même si vous êtes stressé(e), souriez en montant sur scène. Le public sera de votre côté." />
            </div>
            <div className="mt-4 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-4">
              <p className="text-[#3b82f6] text-sm font-semibold mb-1">Gestion du trac</p>
              <p className="text-white/60 text-xs">
                C&apos;est normal d&apos;avoir le trac ! Respirez profondément 3 fois avant de monter sur scène. Concentrez-vous sur les paroles et l&apos;émotion de votre chanson, pas sur le public.
              </p>
            </div>
          </TipCard>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION PUBLIC                             */}
        {/* ═══════════════════════════════════════════ */}
        <div id="public" className="scroll-mt-24 mt-20">
          <SectionTitle emoji="❤️" title="Conseils pour le public" />

          {/* ─── VOTER ─── */}
          <TipCard
            number="1"
            icon="🗳️"
            title="Comment voter"
            accent="#e91e8c"
          >
            <p className="text-white/60 text-sm mb-4">
              Votre vote fait la différence ! Voici comment soutenir vos favoris.
            </p>
            <div className="space-y-3">
              <Step n="1" text="Allez sur la page des candidats et choisissez votre favori" />
              <Step n="2" text="Cliquez sur le bouton ❤️ sur sa page de profil" />
              <Step n="3" text="C'est fait ! Votre vote est enregistré instantanément" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <Tip emoji="📱" title="Multi-appareils" text="Votez depuis votre téléphone ET votre ordinateur — ça fait 2 votes !" />
              <Tip emoji="👨‍👩‍👧‍👦" title="En famille" text="Chaque membre de la famille peut voter depuis son propre appareil." />
            </div>
            <Link
              href={`/${SESSION_SLUG}/candidats`}
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#e91e8c]/15 border border-[#e91e8c]/30 text-[#e91e8c] hover:bg-[#e91e8c]/25 transition-all"
            >
              Voir les candidats &rarr;
            </Link>
          </TipCard>

          {/* ─── SUPPORTER UN CANDIDAT ─── */}
          <TipCard
            number="2"
            icon="📣"
            title="Supporter un candidat"
            accent="#7ec850"
          >
            <p className="text-white/60 text-sm mb-4">
              Vous connaissez un candidat ? Voici comment l&apos;aider à <strong className="text-white/80">gagner en visibilité</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Tip emoji="🔗" title="Partagez son lien" text="Copiez le lien de sa page candidat et envoyez-le à vos contacts." />
              <Tip emoji="📱" title="Story Instagram" text="Partagez sa page en Story avec le lien cliquable (swipe up)." />
              <Tip emoji="💬" title="WhatsApp" text="Envoyez son lien dans vos groupes WhatsApp familiaux et entre amis." />
              <Tip emoji="🗣️" title="Bouche à oreille" text="Parlez-en autour de vous ! C'est souvent le plus efficace." />
            </div>
          </TipCard>

          {/* ─── LE JOUR DU LIVE ─── */}
          <TipCard
            number="3"
            icon="🎪"
            title="Le jour du spectacle"
            accent="#f5a623"
          >
            <p className="text-white/60 text-sm mb-4">
              Même dans le public, vous pouvez <strong className="text-white/80">participer activement</strong> !
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Tip emoji="🔔" title="Notifications" text="Activez les notifications push pour être prévenu des passages et résultats." />
              <Tip emoji="❤️" title="Votez en live" text="Le vote s'ouvre pendant chaque performance. Votez vite !" />
              <Tip emoji="📸" title="Mode Reporter" text="Prenez des photos pendant le spectacle. Les meilleures seront dans la galerie." />
              <Tip emoji="📲" title="Suivez en direct" text="Ouvrez la page Live sur votre téléphone pour voir le candidat en cours." />
            </div>
          </TipCard>
        </div>

        {/* ═══ CTA FINAL ═══ */}
        <section className="text-center pt-12 mt-8">
          <div className="bg-gradient-to-br from-[#e91e8c]/10 to-[#f5a623]/10 border border-white/10 rounded-2xl p-8 md:p-12">
            <p className="text-3xl mb-2">💪</p>
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-2">
              Prêt à vous lancer ?
            </h2>
            <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">
              Que vous soyez candidat ou supporter, chaque action compte !
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
                Voter pour mes favoris
              </Link>
              <Link
                href="/comment-ca-marche"
                className="px-6 py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                Comment ça marche ?
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ═══ Sub-components ═══ */

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-10 mt-4">
      <span className="text-4xl">{emoji}</span>
      <div>
        <h2 className="font-[family-name:var(--font-montserrat)] font-black text-2xl md:text-3xl text-white">
          {title}
        </h2>
        <div className="w-16 h-1 rounded-full bg-gradient-to-r from-[#e91e8c] to-[#f5a623] mt-2" />
      </div>
    </div>
  )
}

function TipCard({
  number,
  icon,
  title,
  accent,
  children,
}: {
  number: string
  icon: string
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-10 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ background: accent }}
        >
          {number}
        </div>
        <span className="text-2xl">{icon}</span>
        <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function Tip({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-3 items-start">
      <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
      <div>
        <p className="text-white/80 text-sm font-semibold">{title}</p>
        <p className="text-white/60 text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <div className="w-8 h-8 rounded-full bg-[#e91e8c]/15 text-[#e91e8c] flex items-center justify-center text-sm font-bold shrink-0">
        {n}
      </div>
      <p className="text-white/70 text-sm">{text}</p>
    </div>
  )
}
