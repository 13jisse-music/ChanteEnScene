'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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

const MOBILE_COLOR = '#e91e8c'
const DESKTOP_COLOR = '#3b82f6'

function DevicePie({ devices, size = 80 }: { devices: DeviceBreakdown; size?: number }) {
  const total = devices.mobile + devices.desktop
  if (total === 0) return null

  const data = [
    { name: 'Mobile', value: devices.mobile },
    { name: 'Desktop', value: devices.desktop },
  ]

  return (
    <div className="flex items-center gap-3">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.3}
              outerRadius={size * 0.45}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={MOBILE_COLOR} />
              <Cell fill={DESKTOP_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: MOBILE_COLOR }} />
          <span className="text-white/60">
            Mobile <span className="font-semibold text-white/80">{devices.mobile}</span>
            <span className="text-white/30 ml-1">({total > 0 ? ((devices.mobile / total) * 100).toFixed(0) : 0}%)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: DESKTOP_COLOR }} />
          <span className="text-white/60">
            Desktop <span className="font-semibold text-white/80">{devices.desktop}</span>
            <span className="text-white/30 ml-1">({total > 0 ? ((devices.desktop / total) * 100).toFixed(0) : 0}%)</span>
          </span>
        </div>
      </div>
    </div>
  )
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
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base mb-1">
        Adoption PWA
      </h2>
      <p className="text-white/30 text-xs mb-4 sm:mb-5">
        Funnel visiteurs &rarr; installation &rarr; notifications
      </p>

      <div className="space-y-5">
        {steps.map((step, idx) => {
          const pct = max > 0 ? (step.value / max) * 100 : 0
          const conversionRate =
            idx > 0 && steps[idx - 1].value > 0
              ? ((step.value / steps[idx - 1].value) * 100).toFixed(1)
              : null

          return (
            <div key={step.label}>
              {/* Label row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{step.icon}</span>
                  <span className="text-sm text-white/70">{step.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-[family-name:var(--font-montserrat)] font-black text-xl"
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

              {/* Bar + Pie */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {/* Funnel bar */}
                <div className="flex-1 h-5 sm:h-6 rounded-lg bg-white/5 overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(pct, step.value > 0 ? 3 : 0)}%`,
                      background: `linear-gradient(90deg, ${step.color}, ${step.color}99)`,
                    }}
                  />
                  {pct > 0 && (
                    <span
                      className="absolute inset-y-0 flex items-center text-[10px] font-semibold text-white/80"
                      style={{ left: Math.max(pct, 3) > 15 ? '8px' : `${Math.max(pct, 3) + 2}%` }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Pie chart */}
                {step.value > 0 && <DevicePie devices={step.devices} size={60} />}
              </div>

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
        <div className="mt-5 pt-4 border-t border-[#2a2545]">
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Taux global visiteur &rarr; notif</span>
            <span className="font-semibold" style={{ color: '#f97316' }}>
              {((pushSubscriptions / uniqueVisitors) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
