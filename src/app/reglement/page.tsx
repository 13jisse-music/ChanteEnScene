export const metadata = {
  title: 'Règlement du concours — ChanteEnScène',
}

export default function ReglementPage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-3xl mx-auto">
      <h1
        className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white mb-8 text-center"
        style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
      >
        Règlement du concours
      </h1>

      <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8 space-y-6 text-white/70 text-sm leading-relaxed">
        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 1 — Objet</h2>
          <p>
            Le présent règlement définit les conditions de participation au concours de chant
            ChanteEnScène, organisé par l&apos;association ChanteEnScène.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 2 — Conditions de participation</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Le concours est ouvert à toute personne âgée de 6 ans minimum.</li>
            <li>Trois catégories d&apos;âge : Enfant (6-12 ans), Ado (13-17 ans), Adulte (18 ans et plus).</li>
            <li>Les mineurs doivent fournir une autorisation parentale signée.</li>
            <li>L&apos;inscription se fait en ligne via le formulaire dédié.</li>
            <li>Chaque candidat doit soumettre une vidéo de candidature.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 3 — Déroulement</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Inscriptions</strong> — Les candidats s&apos;inscrivent en ligne avec une vidéo de candidature.
            </li>
            <li>
              <strong>Sélection</strong> — Un jury professionnel sélectionne les demi-finalistes sur la base des vidéos.
            </li>
            <li>
              <strong>Demi-finale</strong> — Les candidats sélectionnés se produisent en live devant un jury et un public.
            </li>
            <li>
              <strong>Finale</strong> — Les finalistes s&apos;affrontent sur scène. Le classement combine les notes
              du jury (60%) et les votes du public (40%).
            </li>
          </ol>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 4 — Notation</h2>
          <p>Le jury évalue les candidats selon 4 critères notés sur 10 :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Justesse vocale</li>
            <li>Interprétation</li>
            <li>Présence scénique</li>
            <li>Originalité</li>
          </ul>
          <p className="mt-2">
            Le classement final combine la note du jury (60%) et les votes du public (40%).
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 5 — Votes du public</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Les votes sont gratuits et accessibles depuis un smartphone.</li>
            <li>Un vote par appareil et par candidat.</li>
            <li>Les tentatives de fraude entraînent l&apos;annulation des votes.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 6 — Prix</h2>
          <p>
            Un gagnant est désigné par catégorie. Les prix sont définis par l&apos;organisation
            et communiqués avant chaque édition. La participation au concours est gratuite.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 7 — Droit à l&apos;image</h2>
          <p>
            En s&apos;inscrivant, le candidat autorise ChanteEnScène à utiliser son image, sa voix et
            ses prestations à des fins de promotion du concours (site web, réseaux sociaux, presse).
          </p>
        </div>

        <div>
          <h2 className="font-bold text-white text-base mb-2">Article 8 — Responsabilité</h2>
          <p>
            L&apos;organisation se réserve le droit de modifier le règlement, d&apos;annuler ou reporter
            l&apos;événement en cas de force majeure. Toute décision du jury est définitive.
          </p>
        </div>
      </div>
    </section>
  )
}
