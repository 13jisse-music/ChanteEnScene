'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { checkinCandidate } from '@/app/admin/demi-finale/actions'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  photo_url: string | null
}

interface Props {
  session: { id: string; name: string; slug: string }
  eventId: string | null
  eventStatus: string | null
  candidates: Candidate[]
  initialCheckedInIds: string[]
}

export default function CheckinManager({ session, eventId, eventStatus, candidates, initialCheckedInIds }: Props) {
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set(initialCheckedInIds))
  const [baseUrl, setBaseUrl] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'arrived' | 'waiting'>('all')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Auto-detect base URL
  useEffect(() => {
    const saved = localStorage.getItem('ces_checkin_base_url')
    if (saved) {
      setBaseUrl(saved)
    } else {
      setBaseUrl(window.location.origin)
    }
  }, [])

  const checkinUrl = baseUrl ? `${baseUrl}/${session.slug}/checkin` : ''

  // Generate QR code
  useEffect(() => {
    if (canvasRef.current && checkinUrl) {
      QRCode.toCanvas(canvasRef.current, checkinUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#1a1533', light: '#ffffff' },
      })
    }
  }, [checkinUrl])

  // Poll for new check-ins every 5s (lineup changes)
  const checkedInIdsRef = useRef(checkedInIds)
  checkedInIdsRef.current = checkedInIds

  const pollCheckins = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/checkin-status?eventId=${eventId}`)
      if (res.ok) {
        const data = await res.json()
        const newIds = new Set<string>(data.checkedInIds || [])
        if (newIds.size !== checkedInIdsRef.current.size) {
          setCheckedInIds(newIds)
        }
      }
    } catch { /* silent */ }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    const interval = setInterval(pollCheckins, 5000)
    return () => clearInterval(interval)
  }, [eventId, pollCheckins])

  function saveBaseUrl(url: string) {
    setBaseUrl(url)
    localStorage.setItem('ces_checkin_base_url', url)
  }

  async function handleManualCheckin(candidateId: string) {
    if (!eventId) return
    setLoadingId(candidateId)
    setError(null)

    const result = await checkinCandidate(eventId, candidateId)
    if (result.error) {
      setError(result.error)
      setLoadingId(null)
      return
    }

    setCheckedInIds((prev) => new Set([...prev, candidateId]))
    setLoadingId(null)
  }

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>QR Code Check-in — ${session.name}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:Arial,sans-serif;">
        <h1 style="margin-bottom:4px;font-size:28px;">
          <span>Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span>
        </h1>
        <p style="color:#666;margin-bottom:8px;font-size:14px;">${session.name}</p>
        <h2 style="color:#e91e8c;margin-bottom:24px;font-size:20px;">Check-in Demi-finale</h2>
        <img src="${dataUrl}" width="320" height="320" />
        <p style="margin-top:24px;font-size:16px;font-weight:bold;">Scannez pour signaler votre arrivée</p>
        <p style="color:#999;font-size:11px;margin-top:12px;word-break:break-all;max-width:400px;text-align:center;">${checkinUrl}</p>
        <script>setTimeout(()=>window.print(),300)</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `QR_Checkin_${session.slug}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const displayName = (c: Candidate) => c.stage_name || `${c.first_name} ${c.last_name}`

  const arrived = candidates.filter((c) => checkedInIds.has(c.id))
  const waiting = candidates.filter((c) => !checkedInIds.has(c.id))
  const filtered = filter === 'arrived' ? arrived : filter === 'waiting' ? waiting : candidates

  // Group by category
  const categories = [...new Set(candidates.map((c) => c.category))].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            Check-in Demi-finale
          </h1>
          <p className="text-white/40 text-sm mt-1">{session.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#7ec850]/10 border border-[#7ec850]/25 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-[#7ec850]">{checkedInIds.size}</p>
            <p className="text-[10px] text-[#7ec850]/60">arrivés</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-white/60">{candidates.length}</p>
            <p className="text-[10px] text-white/30">attendus</p>
          </div>
        </div>
      </div>

      {!eventId && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-white/40">Aucun événement demi-finale créé.</p>
          <p className="text-white/25 text-xs mt-2">Créez l&apos;événement depuis la régie demi-finale.</p>
        </div>
      )}

      {eventId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-white text-sm">QR Code Check-in</h2>

              {/* URL config */}
              <div>
                <label className="text-white/30 text-[10px] uppercase tracking-wider">URL de base</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => saveBaseUrl(e.target.value)}
                  placeholder="https://chanteenscene.fr"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0d0b1a] border border-[#2a2545] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e91e8c]/40"
                />
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => saveBaseUrl(window.location.origin)}
                    className="px-2 py-1 rounded text-[10px] bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                  >
                    localhost
                  </button>
                  <button
                    onClick={() => saveBaseUrl('https://chanteenscene.fr')}
                    className="px-2 py-1 rounded text-[10px] bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                  >
                    production
                  </button>
                </div>
              </div>

              {/* QR Preview */}
              {checkinUrl && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-3 flex justify-center">
                    <canvas ref={canvasRef} />
                  </div>
                  <p className="text-white/20 text-[10px] text-center break-all">{checkinUrl}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white/90 transition-colors"
                    >
                      PNG
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex-1 py-2 rounded-xl text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
                    >
                      Imprimer
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(checkinUrl)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white/90 transition-colors"
                    >
                      Copier URL
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${eventStatus === 'live' ? 'bg-[#7ec850] animate-pulse' : eventStatus === 'paused' ? 'bg-yellow-500' : 'bg-white/20'}`} />
                <span className="text-white/40 text-xs">
                  {eventStatus === 'live' ? 'Demi-finale en cours' : eventStatus === 'paused' ? 'En pause' : eventStatus === 'pending' ? 'Pas encore commencée' : 'Terminée'}
                </span>
              </div>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const catTotal = candidates.filter((c) => c.category === cat).length
                  const catArrived = candidates.filter((c) => c.category === cat && checkedInIds.has(c.id)).length
                  return (
                    <div key={cat} className="flex justify-between text-xs">
                      <span className="text-white/40">{cat}</span>
                      <span className={catArrived === catTotal ? 'text-[#7ec850]' : 'text-white/60'}>
                        {catArrived}/{catTotal}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Candidates list */}
          <div className="lg:col-span-2">
            <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6">
              {/* Filters */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white text-sm">Candidats</h2>
                <div className="flex gap-1">
                  {([
                    { key: 'all' as const, label: 'Tous', count: candidates.length },
                    { key: 'arrived' as const, label: 'Arrivés', count: arrived.length },
                    { key: 'waiting' as const, label: 'En attente', count: waiting.length },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === f.key
                          ? f.key === 'arrived' ? 'bg-[#7ec850]/15 text-[#7ec850]' : f.key === 'waiting' ? 'bg-[#e91e8c]/15 text-[#e91e8c]' : 'bg-white/10 text-white'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3 mb-4">{error}</p>
              )}

              {/* List */}
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-white/20 text-sm text-center py-8">
                    {filter === 'arrived' ? 'Aucun candidat arrivé' : filter === 'waiting' ? 'Tous les candidats sont arrivés !' : 'Aucun candidat'}
                  </p>
                ) : (
                  filtered.map((c) => {
                    const isCheckedIn = checkedInIds.has(c.id)
                    const isLoading = loadingId === c.id

                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isCheckedIn
                            ? 'bg-[#7ec850]/5 border border-[#7ec850]/15'
                            : 'bg-[#0d0b1a] border border-[#2a2545]'
                        }`}
                      >
                        {/* Photo */}
                        <div className="w-10 h-10 rounded-full bg-[#1a1533] overflow-hidden shrink-0 border border-white/10">
                          {c.photo_url ? (
                            <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">
                              {c.first_name[0]}{c.last_name[0]}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{displayName(c)}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#e91e8c]">{c.category}</span>
                            {c.stage_name && (
                              <span className="text-[10px] text-white/20">{c.first_name} {c.last_name}</span>
                            )}
                          </div>
                        </div>

                        {/* Status / Action */}
                        {isCheckedIn ? (
                          <span className="text-[#7ec850] text-xs font-medium shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7ec850]" />
                            Arrivé(e)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleManualCheckin(c.id)}
                            disabled={isLoading || !eventId}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {isLoading ? '...' : 'Check-in'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
