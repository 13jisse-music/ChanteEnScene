import PresseContactForm from '@/components/PresseContactForm'

export const metadata = {
  title: 'Espace Presse — ChanteEnScène',
  description: 'Dossier de presse, photos HD et ressources médias du concours ChanteEnScène.',
}

const PHOTOS_BASE = 'https://xarrchsokuhobwqvcnkg.supabase.co/storage/v1/object/public/photos/photos'
const SESSION_2025 = 'a0000000-0000-0000-0000-000000002025'

const pressPhotos = [
  { src: `${PHOTOS_BASE}/${SESSION_2025}/20250710_220427.jpg`, alt: 'Performance sur scène' },
  { src: `${PHOTOS_BASE}/${SESSION_2025}/img_8130.jpg`, alt: 'Candidat en concert' },
  { src: `${PHOTOS_BASE}/${SESSION_2025}/20250710_224437.jpg`, alt: 'Finale 2025' },
  { src: `${PHOTOS_BASE}/${SESSION_2025}/img_8192.jpg`, alt: 'Émotion sur scène' },
  { src: `${PHOTOS_BASE}/${SESSION_2025}/20250710_220923.jpg`, alt: 'Ambiance concert' },
  { src: `${PHOTOS_BASE}/${SESSION_2025}/img_8167.jpg`, alt: 'Public et scène' },
]

export default function PressePage() {
  return (
    <section className="relative z-10 py-8 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-3"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Espace Presse
        </h1>
        <p className="text-white/50 text-sm">
          Ressources m&eacute;dias pour journalistes et partenaires
        </p>
      </div>

      <div className="space-y-8">
        {/* Dossier de presse */}
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-[#e91e8c]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-[#e91e8c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-1">
                Dossier de presse 2026
              </h2>
              <p className="text-white/50 text-sm mb-4">
                7 pages — Concept, chiffres cl&eacute;s, palmar&egrave;s, &eacute;dition 2026, galerie photos, contact.
              </p>
              <a
                href="/documents/dossier-presse-chantenscene.pdf"
                download
                className="inline-flex items-center gap-2 bg-[#e91e8c] hover:bg-[#d4177f] text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                T&eacute;l&eacute;charger le PDF
              </a>
            </div>
          </div>
        </div>

        {/* Photos HD */}
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-2">
            Photos HD
          </h2>
          <p className="text-white/50 text-sm mb-6">
            Cliquez sur une photo pour la t&eacute;l&eacute;charger en haute r&eacute;solution. Cr&eacute;dit : Julien aka Playymo.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pressPhotos.map((photo, i) => (
              <a
                key={i}
                href={photo.src}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-[4/3] rounded-xl overflow-hidden border border-white/10 hover:border-[#e91e8c]/50 transition-colors group"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>

        {/* Contact presse — Formulaire */}
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-8">
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-2 text-center">
            Contact presse
          </h2>
          <p className="text-white/50 text-sm mb-6 text-center">
            Pour toute demande d&apos;interview, partenariat ou information compl&eacute;mentaire.
          </p>
          <PresseContactForm />
        </div>
      </div>
    </section>
  )
}
