'use client'

import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface Install {
  id: string
  platform: string
  city: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  install_source: string
  created_at: string
}

const PLATFORM_COLORS: Record<string, string> = {
  android: '#3ddc84',
  ios: '#e91e8c',
  desktop: '#3b82f6',
}

export default function InstallsMap({ installs }: { installs: Install[] }) {
  const [isOpen, setIsOpen] = useState(false)

  const platformData = useMemo(() => {
    const counts: Record<string, number> = {}
    installs.forEach((i) => {
      const p = i.platform || 'desktop'
      counts[p] = (counts[p] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [installs])

  useEffect(() => {
    if (!isOpen) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mapInstance: any = null

    const initMap = async () => {
      const L = await import('leaflet')

      // Inject Leaflet CSS once
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const container = document.getElementById('installs-map')
      if (!container) return

      const map = L.map('installs-map', { zoomControl: true }).setView([30, 5], 3)
      mapInstance = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)

      const validInstalls = installs.filter(
        (i) => i.latitude !== null && i.longitude !== null
      )

      validInstalls.forEach((install) => {
        const emoji = install.platform === 'android' ? '🤖' : install.platform === 'ios' ? '🍎' : '💻'
        const label = install.install_source === 'prompt' ? 'Install' : install.install_source === 'ios_instructions' ? 'iOS' : 'Standalone'
        const location = [install.city, install.region].filter(Boolean).join(', ')
        const date = new Date(install.created_at).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'short',
        })

        const icon = L.divIcon({
          html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">${emoji}</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        L.marker([install.latitude!, install.longitude!], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${emoji} ${install.platform}</strong><br/>${location || 'Localisation inconnue'}<br/><span style="color:#999">${date} &middot; ${label}</span>`
          )
      })

      if (validInstalls.length > 1) {
        const bounds = L.latLngBounds(
          validInstalls.map((i) => [i.latitude!, i.longitude!] as [number, number])
        )
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 })
      } else if (validInstalls.length === 1) {
        map.setView([validInstalls[0].latitude!, validInstalls[0].longitude!], 8)
      }
    }

    initMap()

    return () => {
      mapInstance?.remove?.()
    }
  }, [isOpen, installs])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  const withCoords = installs.filter(i => i.latitude !== null && i.longitude !== null).length
  const withoutCoords = installs.length - withCoords

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mini pie chart */}
        {platformData.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div style={{ width: 32, height: 32 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={8}
                    outerRadius={15}
                    strokeWidth={0}
                  >
                    {platformData.map((entry) => (
                      <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] || '#666'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/50">
              {platformData.map((entry) => (
                <span key={entry.name} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[entry.name] || '#666' }}
                  />
                  {entry.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map button */}
        <button
          onClick={() => setIsOpen(true)}
          className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          title="Voir sur la carte"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Carte</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-3xl bg-[#161228] border border-[#2a2545] rounded-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2545] shrink-0">
              <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base">
                Carte des installations PWA
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white text-2xl leading-none px-1"
              >
                &times;
              </button>
            </div>
            {/* Map */}
            <div id="installs-map" style={{ height: '500px', minHeight: '300px' }} className="w-full" />
            {/* Footer */}
            <div className="p-3 border-t border-[#2a2545] shrink-0 flex items-center justify-between">
              <p className="text-white/30 text-xs">
                {withCoords} installation{withCoords > 1 ? 's' : ''} sur la carte
                {withoutCoords > 0 && ` · ${withoutCoords} sans coordonnées`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
