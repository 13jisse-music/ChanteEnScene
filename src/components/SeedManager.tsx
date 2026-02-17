'use client'

import { useState } from 'react'
import { seedTestData, clearTestData, resetAllSessionData, seedPalmares2025, clearPalmares2025 } from '@/app/admin/seed/actions'

interface JurorInfo {
  name: string
  role: string
  token: string
  url: string
}

export default function SeedManager() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [jurors, setJurors] = useState<JurorInfo[]>([])

  async function handleSeed() {
    setLoading(true)
    setResult(null)
    setJurors([])
    const res = await seedTestData()
    if ('error' in res && res.error) {
      setResult(`Erreur: ${res.error}`)
    } else if ('success' in res && res.success) {
      setResult(`${res.candidates} candidats créés avec succès !`)
      setJurors(res.jurors || [])
    }
    setLoading(false)
  }

  async function handleClear() {
    if (!confirm('Supprimer toutes les données de test ?')) return
    setLoading(true)
    setResult(null)
    setJurors([])
    const res = await clearTestData()
    if ('error' in res && res.error) {
      setResult(`Erreur: ${res.error}`)
    } else {
      setResult('Données de test supprimées.')
    }
    setLoading(false)
  }

  async function handleFullReset() {
    if (!confirm('⚠️ RESET COMPLET : Supprimer TOUTES les données de la session active (candidats, jurés, votes, événements, photos, FAQ, etc.) ? Cette action est irréversible !')) return
    if (!confirm('Êtes-vous vraiment sûr ? Toutes les données seront perdues définitivement.')) return
    setLoading(true)
    setResult(null)
    setJurors([])
    const res = await resetAllSessionData()
    if ('error' in res && res.error) {
      setResult(`Erreur: ${res.error}`)
    } else {
      setResult('Reset complet effectué. Toutes les données de la session ont été supprimées. La session est repassée en brouillon.')
    }
    setLoading(false)
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className={`space-y-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Actions */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-sm text-white">Injection de données</h2>
        <p className="text-white/40 text-xs">
          Crée 15 candidats fictifs en attente de validation, des votes publics (likes), ~80 vues de pages (tracking), et 6 jurés de test. Les mineurs ont une autorisation parentale fictive. Approuvez les candidats, votez avec le jury et uploadez les MP3 vous-même pour simuler le vrai parcours.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850] hover:bg-[#7ec850]/20 transition-colors"
          >
            Injecter les données de test
          </button>
          <button
            onClick={handleClear}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Supprimer les données de test
          </button>
        </div>
      </div>

      {/* Reset complet */}
      <div className="bg-[#161228] border border-red-500/20 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-sm text-red-400">Reset complet de la session</h2>
        <p className="text-white/40 text-xs">
          Supprime <strong className="text-red-400/80">TOUTES</strong> les données de la session active : candidats, jurés, votes, événements, lineup, notes jury, photos, FAQ chatbot, etc. La session repasse en brouillon. Utile pour repartir de zéro.
        </p>
        <button
          onClick={handleFullReset}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/20 transition-colors"
        >
          Reset complet (tout supprimer)
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-4 text-sm ${result.startsWith('Erreur') ? 'bg-red-500/10 border border-red-500/25 text-red-400' : 'bg-[#7ec850]/10 border border-[#7ec850]/25 text-[#7ec850]'}`}>
          {result}
        </div>
      )}

      {/* Juror links */}
      {jurors.length > 0 && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-sm text-white">Liens des jurés de test</h2>
          <p className="text-white/40 text-xs">
            Partagez ces liens par SMS/WhatsApp aux jurés pour qu&apos;ils accèdent à leur interface sur leur téléphone.
          </p>
          <div className="space-y-3">
            {jurors.map((j) => (
              <div key={j.token} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">{j.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#e91e8c]/10 text-[#e91e8c]">
                    {j.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${appUrl}${j.url}`}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(`${appUrl}${j.url}`)}
                    className="px-3 py-2 rounded-lg text-xs bg-[#e91e8c]/10 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors shrink-0"
                  >
                    Copier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Palmarès complet */}
      <div className="bg-[#161228] border border-[#f5a623]/20 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-sm text-[#f5a623]">Palmarès (2023 / 2024 / 2025)</h2>
        <p className="text-white/40 text-xs">
          Injecte les gagnants des 3 éditions (2023, 2024, 2025) dans des sessions archivées.
          Les photos des gagnants 2025 sont uploadées si disponibles.
          Visible sur <code className="bg-white/5 px-1.5 py-0.5 rounded">/palmares</code> et gérable dans <code className="bg-white/5 px-1.5 py-0.5 rounded">/admin/palmares</code>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setLoading(true)
              setResult(null)
              const res = await seedPalmares2025()
              if ('error' in res && res.error) {
                setResult(`Erreur: ${res.error}`)
              } else if ('success' in res && res.success) {
                setResult(`Palmarès créé ! ${res.winners?.join(', ')}`)
              }
              setLoading(false)
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#f5a623]/10 border border-[#f5a623]/25 text-[#f5a623] hover:bg-[#f5a623]/20 transition-colors"
          >
            Injecter le palmarès
          </button>
          <button
            onClick={async () => {
              if (!confirm('Supprimer le palmarès (toutes les éditions) ?')) return
              setLoading(true)
              setResult(null)
              const res = await clearPalmares2025()
              if ('error' in res && res.error) {
                setResult(`Erreur: ${res.error}`)
              } else {
                setResult('Palmarès supprimé (toutes les éditions).')
              }
              setLoading(false)
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Supprimer le palmarès
          </button>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-sm text-white">Guide de test rapide</h2>
        <div className="text-white/40 text-xs space-y-2 leading-relaxed">
          <p><strong className="text-white/60">1. Injectez les donnees</strong> — Cliquez sur le bouton ci-dessus</p>
          <p><strong className="text-white/60">2. Candidats</strong> — Allez dans Candidats pour voir les 15 profils (12 approuves + 3 en attente)</p>
          <p><strong className="text-white/60">3. Stats</strong> — Consultez Stats En Ligne (votes jury) et Stats Marketing (vues, sources de trafic)</p>
          <p><strong className="text-white/60">4. Regie En Ligne</strong> — Selectionnez les demi-finalistes et envoyez les notifications</p>
          <p><strong className="text-white/60">5. Demi-finale</strong> — Allez dans Regie Demi-finale, creez l&apos;evenement et lancez le direct</p>
          <p><strong className="text-white/60">6. Vote public</strong> — Ouvrez <code className="bg-white/5 px-1.5 py-0.5 rounded">/aubagne-2026/live</code> dans un autre onglet pour voter</p>
        </div>
        <a
          href="/admin/guide"
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
        >
          📖 Voir le mode d&apos;emploi complet
        </a>
      </div>
    </div>
  )
}
