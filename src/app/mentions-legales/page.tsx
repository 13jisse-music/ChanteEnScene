export const metadata = {
  title: 'Mentions légales — ChanteEnScène',
}

export default function MentionsLegalesPage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-3xl mx-auto">
      <h1
        className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-8 text-center"
        style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
      >
        Mentions légales
      </h1>

      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8 space-y-6 text-white/70 text-sm leading-relaxed">
        <div>
          <h2 className="font-bold text-white text-base mb-2">Éditeur du site</h2>
          <p>
            ChanteEnScène<br />
            Association loi 1901<br />
            Siège social : Aubagne, France<br />
            Email : contact@chantenscene.fr
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Directeur de publication</h2>
          <p>Le président de l&apos;association ChanteEnScène.</p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Hébergement</h2>
          <p>
            Vercel Inc.<br />
            440 N Barranca Ave #4133<br />
            Covina, CA 91723, USA<br />
            Site : vercel.com
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu de ce site (textes, images, logos, vidéos) est protégé par les lois
            relatives à la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle,
            est interdite sans l&apos;accord préalable de l&apos;éditeur.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Données personnelles</h2>
          <p>
            Les données collectées sur ce site sont traitées conformément au RGPD.
            Pour plus d&apos;informations, consultez notre{' '}
            <a href="/confidentialite" className="text-[#e91e8c] hover:underline">
              politique de confidentialité
            </a>.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Cookies</h2>
          <p>
            Ce site utilise des cookies techniques nécessaires à son fonctionnement
            (authentification, préférences). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Crédits</h2>
          <p>
            Développement : ChanteEnScène<br />
            Design : Thème original ChanteEnScène<br />
            Technologies : Next.js, Supabase, Tailwind CSS
          </p>
        </div>
      </div>
    </section>
  )
}
