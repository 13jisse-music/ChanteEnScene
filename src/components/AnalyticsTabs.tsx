'use client'

import { useState } from 'react'

interface TabsData {
  topPages: [string, number][]
  topRefs: [string, number][]
  topCities: [string, number][]
  topTools: [string, number][]
  topClicks: [string, number][]
  topErrors: [string, number][]
  devices: [string, number][]
  browsers: [string, number][]
  oses: [string, number][]
  languages: [string, number][]
}

const TABS = [
  { key: 'pages', label: 'Pages' },
  { key: 'outils', label: 'Sections' },
  { key: 'sources', label: 'Sources' },
  { key: 'geo', label: 'Geo' },
  { key: 'devices', label: 'Devices' },
  { key: 'clics', label: 'Clics' },
] as const

// Noms lisibles pour les pages CES
const TOOL_NAMES: Record<string, string> = {
  '/': 'Accueil',
  '/blog': 'Blog',
  '/comment-ca-marche': 'Comment ca marche',
  '/editions': 'Editions',
  '/palmares': 'Palmares',
  '/presse': 'Presse',
  '/proposer-un-lieu': 'Proposer un lieu',
  '/soutenir': 'Soutenir',
  '/reglement': 'Reglement',
  '/mentions-legales': 'Mentions legales',
  '/confidentialite': 'Confidentialite',
  '/go': 'Lien court',
  '/jury': 'Jury',
}

function RankList({ items, color = 'text-[#e91e8c]', emptyMsg = 'Aucune donnee' }: {
  items: [string, number][]
  color?: string
  emptyMsg?: string
}) {
  if (items.length === 0) return <p className="text-xs text-gray-500">{emptyMsg}</p>
  const max = items[0][1]
  return (
    <div className="space-y-2">
      {items.map(([label, count], i) => (
        <div key={label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-300 truncate max-w-[250px]">
              <span className="text-gray-500 mr-1.5">{i + 1}.</span>
              {label}
            </span>
            <span className={`${color} font-medium ml-2`}>{count}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max((count / max) * 100, 2)}%`,
                backgroundColor: color === 'text-[#e91e8c]' ? '#e91e8c' :
                  color === 'text-blue-400' ? '#60a5fa' :
                  color === 'text-emerald-400' ? '#34d399' : '#e91e8c',
                opacity: 0.6,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsTabs({ data }: { data: TabsData }) {
  const [tab, setTab] = useState<string>('pages')

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
      {/* Onglets */}
      <div className="flex overflow-x-auto border-b border-[#2a2545]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.key
                ? 'text-[#e91e8c] border-[#e91e8c]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'pages' && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Pages les plus visitees</h3>
            <RankList items={data.topPages} />
          </div>
        )}

        {tab === 'outils' && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Sections les plus visitees</h3>
            <RankList
              items={data.topTools.map(([path, count]) => [TOOL_NAMES[path] || path, count])}
              color="text-emerald-400"
              emptyMsg="Pas encore de donnees (tracker en cours de collecte)"
            />
          </div>
        )}

        {tab === 'sources' && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3">D&apos;ou viennent les visiteurs</h3>
            <RankList items={data.topRefs} color="text-blue-400" emptyMsg="Aucun referrer externe" />
          </div>
        )}

        {tab === 'geo' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Villes</h3>
              <RankList items={data.topCities} color="text-emerald-400" emptyMsg="Pas de donnees geo" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Langues</h3>
              <RankList items={data.languages} />
            </div>
          </div>
        )}

        {tab === 'devices' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Type d&apos;appareil</h3>
              {data.devices.length === 0
                ? <p className="text-xs text-gray-500">En attente de donnees</p>
                : <DonutList items={data.devices} colors={['#e91e8c', '#3b82f6', '#10b981']} />
              }
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Navigateur</h3>
              <RankList items={data.browsers} color="text-blue-400" emptyMsg="En attente" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Systeme</h3>
              <RankList items={data.oses} color="text-emerald-400" emptyMsg="En attente" />
            </div>
          </div>
        )}

        {tab === 'clics' && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Elements les plus cliques</h3>
            <RankList
              items={data.topClicks}
              color="text-[#e91e8c]"
              emptyMsg="Pas encore de donnees clics"
            />
            <p className="mt-3 text-[10px] text-gray-500">
              Astuce : ajouter data-track=&quot;nom&quot; sur un bouton pour le nommer dans les stats
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DonutList({ items, colors }: { items: [string, number][]; colors: string[] }) {
  const total = items.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <p className="text-xs text-gray-500">Pas de donnees</p>

  return (
    <div className="space-y-2">
      {items.map(([label, count], i) => {
        const pct = Math.round((count / total) * 100)
        const color = colors[i % colors.length]
        return (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-300 flex-1 capitalize">{label}</span>
            <span className="text-white font-medium">{pct}%</span>
            <span className="text-gray-500">({count})</span>
          </div>
        )
      })}
    </div>
  )
}
