'use client'

import { useEffect, useRef, useState } from 'react'

interface GeoPoint {
  city: string
  region: string | null
  country: string | null
  lat: number
  lng: number
  count: number
}

// Aubagne = ChanteEnScène contest location
const AUBAGNE = { lat: 43.2927, lng: 5.5671 }

// Radius ranges for bubble size (min/max in pixels)
const MIN_RADIUS = 8
const MAX_RADIUS = 35

function getColor(count: number, max: number): string {
  const ratio = max > 1 ? count / max : 1
  if (ratio > 0.6) return '#e91e8c'  // pink (high)
  if (ratio > 0.3) return '#8b5cf6'  // violet (medium)
  return '#6366f1'                    // indigo (low)
}

function getRadius(count: number, max: number): number {
  if (max <= 1) return MIN_RADIUS + 5
  const ratio = count / max
  return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS)
}

export default function GeoAnalyticsMap({ geoData }: { geoData: GeoPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const [view, setView] = useState<'france' | 'world'>('france')

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default

      // Import leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (cancelled || !mapRef.current) return

      // Clean up previous map
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as L.Map).remove()
      }

      const center: [number, number] = view === 'france' ? [46.5, 2.5] : [30, 0]
      const zoom = view === 'france' ? 6 : 2

      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      })

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
      }).addTo(map)

      // Zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapInstanceRef.current = map

      if (!geoData.length) return

      const maxCount = Math.max(...geoData.map(g => g.count))

      // Aubagne marker (contest location)
      const aubagneIcon = L.divIcon({
        html: `<div style="
          width: 16px; height: 16px;
          background: #f59e0b;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(245,158,11,0.6);
        "></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([AUBAGNE.lat, AUBAGNE.lng], { icon: aubagneIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; text-align: center;">
            <strong style="color: #f59e0b;">📍 Aubagne</strong><br/>
            <span style="font-size: 11px; color: #666;">Lieu du concours</span>
          </div>
        `)

      // 50km radius circle around Aubagne
      L.circle([AUBAGNE.lat, AUBAGNE.lng], {
        radius: 50000,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.04,
        weight: 1,
        opacity: 0.3,
        dashArray: '6 4',
      }).addTo(map)

      // Visitor bubbles
      for (const point of geoData) {
        const radius = getRadius(point.count, maxCount)
        const color = getColor(point.count, maxCount)

        const circle = L.circleMarker([point.lat, point.lng], {
          radius,
          fillColor: color,
          fillOpacity: 0.5,
          color: color,
          weight: 2,
          opacity: 0.8,
        }).addTo(map)

        // Distance from Aubagne
        const distKm = Math.round(
          L.latLng(point.lat, point.lng).distanceTo(L.latLng(AUBAGNE.lat, AUBAGNE.lng)) / 1000
        )

        const isNear = distKm <= 50
        const distLabel = isNear
          ? `<span style="color: #10b981; font-weight: 600;">📍 ${distKm} km d'Aubagne</span>`
          : distKm <= 150
            ? `<span style="color: #f59e0b;">${distKm} km d'Aubagne</span>`
            : `<span style="color: #94a3b8;">${distKm} km d'Aubagne</span>`

        circle.bindPopup(`
          <div style="font-family: sans-serif; min-width: 140px;">
            <strong style="font-size: 14px;">${point.city}</strong>
            ${point.region ? `<br/><span style="font-size: 11px; color: #888;">${point.region}</span>` : ''}
            <br/><span style="font-size: 13px; font-weight: 600; color: ${color};">${point.count} visite${point.count > 1 ? 's' : ''}</span>
            <br/>${distLabel}
          </div>
        `)
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove()
        mapInstanceRef.current = null
      }
    }
  }, [geoData, view])

  // Compute stats
  const totalWithGeo = geoData.reduce((s, g) => s + g.count, 0)
  const nearAubagne = geoData
    .filter(g => {
      const R = 6371
      const dLat = (g.lat - AUBAGNE.lat) * Math.PI / 180
      const dLng = (g.lng - AUBAGNE.lng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(g.lat * Math.PI / 180) * Math.cos(AUBAGNE.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      return 2 * R * Math.asin(Math.sqrt(a)) <= 50
    })
    .reduce((s, g) => s + g.count, 0)
  const nearPct = totalWithGeo > 0 ? Math.round(nearAubagne / totalWithGeo * 100) : 0

  // Top 5 cities
  const topCities = [...geoData].sort((a, b) => b.count - a.count).slice(0, 5)

  if (!geoData.length) {
    return (
      <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 text-center">
        <p className="text-white/40 text-sm">
          Les donnees geographiques s&apos;accumulent — la carte apparaitra bientot.
        </p>
        <p className="text-white/20 text-xs mt-1">
          Chaque visite enregistre desormais la ville et les coordonnees GPS.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2545] flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm">
            Carte des visiteurs
          </h2>
          <p className="text-white/30 text-xs mt-0.5">
            {totalWithGeo} visite{totalWithGeo > 1 ? 's' : ''} localisee{totalWithGeo > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1 bg-[#0d0b1a] rounded-lg p-0.5">
          <button
            onClick={() => setView('france')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              view === 'france' ? 'bg-[#e91e8c]/20 text-[#e91e8c]' : 'text-white/40'
            }`}
          >
            France
          </button>
          <button
            onClick={() => setView('world')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              view === 'world' ? 'bg-[#e91e8c]/20 text-[#e91e8c]' : 'text-white/40'
            }`}
          >
            Monde
          </button>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: 400, width: '100%', background: '#0d0b1a' }} />

      {/* Stats bar */}
      <div className="p-4 border-t border-[#2a2545] grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Proximity to Aubagne */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center text-lg">
            📍
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: nearPct > 40 ? '#10b981' : nearPct > 20 ? '#f59e0b' : '#ef4444' }}>
              {nearPct}%
            </p>
            <p className="text-[10px] text-white/40">a moins de 50 km</p>
          </div>
        </div>

        {/* Number of cities */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center text-lg">
            🗺️
          </div>
          <div>
            <p className="text-lg font-bold text-[#8b5cf6]">{geoData.length}</p>
            <p className="text-[10px] text-white/40">ville{geoData.length > 1 ? 's' : ''} differente{geoData.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Top cities */}
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] text-white/40 mb-1.5">Top villes</p>
          <div className="space-y-0.5">
            {topCities.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-white/60 truncate">{c.city}</span>
                <span className="text-white/80 font-medium ml-2">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
