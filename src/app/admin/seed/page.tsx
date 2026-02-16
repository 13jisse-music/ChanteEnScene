import SeedManager from '@/components/SeedManager'

export default function AdminSeedPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white">
          Données de test
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Injectez des candidats fictifs, votes et jurés pour tester le système.
        </p>
      </div>
      <SeedManager />
    </div>
  )
}
