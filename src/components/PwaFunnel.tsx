'use client'

interface DeviceBreakdown {
  mobile: number
  desktop: number
}

interface PwaFunnelProps {
  uniqueVisitors: number
  pwaInstalls: number
  pushSubscriptions: number
  visitorsByDevice: DeviceBreakdown
  installsByDevice: DeviceBreakdown
  pushByDevice: DeviceBreakdown
}

export default function PwaFunnel({
  uniqueVisitors,
  pwaInstalls,
  pushSubscriptions,
  visitorsByDevice,
  installsByDevice,
  pushByDevice,
}: PwaFunnelProps) {
  const steps = [
    {
      label: 'Visiteurs uniques',
      value: uniqueVisitors,
      icon: '👀',
      color: '#3b82f6',
      devices: visitorsByDevice,
    },
    {
      label: 'Installations PWA',
      value: pwaInstalls,
      icon: '📲',
      color: '#10b981',
      devices: installsByDevice,
    },
    {
      label: 'Notifications activées',
      value: pushSubscriptions,
      icon: '🔔',
      color: '#f97316',
      devices: pushByDevice,
    },
  ]

  const max = Math.max(uniqueVisitors, 1)

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
      <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base mb-1">
        Adoption PWA
      </h2>
      <p className="text-white/30 text-xs mb-5">
        Funnel visiteurs &rarr; installation &rarr; notifications
      </p>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const pct = max > 0 ? (step.value / max) * 100 : 0
          const conversionRate =
            idx > 0 && steps[idx - 1].value > 0
              ? ((step.value / steps[idx - 1].value) * 100).toFixed(1)
              : null

          const mobilePct = step.value > 0 ? (step.devices.mobile / step.value) * 100 : 0
          const desktopPct = step.value > 0 ? (step.devices.desktop / step.value) * 100 : 0

          return (
            <div key={step.label}>
              {/* Label row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{step.icon}</span>
                  <span className="text-sm text-white/70">{step.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-[family-name:var(--font-montserrat)] font-black text-lg"
                    style={{ color: step.color }}
                  >
                    {step.value}
                  </span>
                  {conversionRate !== null && (
                    <span className="text-xs text-white/30">
                      ({conversionRate}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Bar */}
              <div className="h-8 rounded-lg bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(pct, step.value > 0 ? 3 : 0)}%`,
                    background: `linear-gradient(90deg, ${step.color}, ${step.color}99)`,
                  }}
                />
                {pct > 0 && (
                  <span
                    className="absolute inset-y-0 flex items-center text-xs font-semibold text-white/80"
                    style={{ left: Math.max(pct, 3) > 15 ? '12px' : `${Math.max(pct, 3) + 2}%` }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Device breakdown */}
              {step.value > 0 && (
                <div className="flex items-center gap-4 mt-1.5 ml-7">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">📱</span>
                    <span className="text-xs text-white/50">
                      {step.devices.mobile}
                    </span>
                    <span className="text-[10px] text-white/25">
                      ({mobilePct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">💻</span>
                    <span className="text-xs text-white/50">
                      {step.devices.desktop}
                    </span>
                    <span className="text-[10px] text-white/25">
                      ({desktopPct.toFixed(0)}%)
                    </span>
                  </div>
                  {/* Mini proportional bar */}
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden flex">
                    <div
                      className="h-full rounded-l-full transition-all duration-500"
                      style={{
                        width: `${mobilePct}%`,
                        background: '#e91e8c',
                      }}
                    />
                    <div
                      className="h-full rounded-r-full transition-all duration-500"
                      style={{
                        width: `${desktopPct}%`,
                        background: '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Arrow between steps */}
              {idx < steps.length - 1 && (
                <div className="flex justify-center my-1">
                  <svg className="w-4 h-4 text-white/15" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {uniqueVisitors > 0 && (
        <div className="mt-5 pt-4 border-t border-[#2a2545] space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Taux global visiteur &rarr; notif</span>
            <span className="font-semibold" style={{ color: '#f97316' }}>
              {((pushSubscriptions / uniqueVisitors) * 100).toFixed(1)}%
            </span>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-white/25">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#e91e8c' }} />
              Mobile
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
              Desktop
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
