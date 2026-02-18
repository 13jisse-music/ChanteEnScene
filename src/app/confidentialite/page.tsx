export const metadata = {
  title: 'Politique de confidentialité — ChanteEnScène',
}

export default function ConfidentialitePage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-3xl mx-auto">
      <h1
        className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-8 text-center"
        style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
      >
        Politique de confidentialité
      </h1>

      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8 space-y-6 text-white/70 text-sm leading-relaxed">
        <div>
          <h2 className="font-bold text-white text-base mb-2">1. Responsable du traitement</h2>
          <p>
            L&apos;association ChanteEnScène, dont le siège est à Aubagne, est responsable du traitement
            des données personnelles collectées sur ce site.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Candidats</strong> : nom, prénom, date de naissance, email, téléphone, ville, photo, vidéo, chanson.</li>
            <li><strong>Votes</strong> : empreinte numérique de l&apos;appareil (anonymisée), adresse IP (anonymisée).</li>
            <li><strong>Jury</strong> : nom, prénom, notes attribuées.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">3. Finalités</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Gestion des inscriptions et du concours</li>
            <li>Communication avec les candidats</li>
            <li>Gestion des votes et prévention de la fraude</li>
            <li>Affichage des profils candidats sur le site</li>
            <li>Archivage des résultats du concours</li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">4. Base légale</h2>
          <p>
            Le traitement des données est fondé sur le consentement du candidat (acceptation du règlement
            lors de l&apos;inscription) et l&apos;intérêt légitime de l&apos;organisation pour la gestion
            du concours.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">5. Durée de conservation</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Données d&apos;inscription : 2 ans après la fin de l&apos;édition</li>
            <li>Données de vote : 6 mois après l&apos;événement</li>
            <li>Données des gagnants (palmarès) : conservées indéfiniment</li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">6. Hébergement des données</h2>
          <p>
            Les données sont hébergées par Supabase (serveurs UE) et Vercel (CDN mondial).
            Les fichiers (photos, vidéos, MP3) sont stockés sur Supabase Storage.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">7. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Droit d&apos;accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l&apos;effacement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d&apos;opposition</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à : <strong>inscriptions@chantenscene.fr</strong>
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">8. Cookies</h2>
          <p>
            Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement
            (session d&apos;authentification Supabase). Aucun cookie de tracking ou publicitaire n&apos;est utilisé.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">9. Modification de la politique</h2>
          <p>
            Cette politique de confidentialité peut être mise à jour. La date de dernière modification
            sera indiquée en bas de cette page.
          </p>
          <p className="text-white/30 text-xs mt-4">
            Dernière mise à jour : Février 2026
          </p>
        </div>
      </div>
    </section>
  )
}
