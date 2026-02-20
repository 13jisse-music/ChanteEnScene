'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DayData {
  date: string
  label: string
  pageViews: number
  uniqueVisitors: number
}

export default function DailyStats({ data }: { data: DayData[] }) {
  if (!data || data.length === 0) return null

  const todayData = data[data.length - 1]

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#2a2545] flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base">
          Trafic — 7 derniers jours
        </h2>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span>Aujourd&apos;hui : <strong className="text-white">{todayData?.uniqueVisitors || 0}</strong> visiteurs, <strong className="text-white">{todayData?.pageViews || 0}</strong> pages</span>
        </div>
      </div>
      <div className="p-4" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1232',
                border: '1px solid rgba(233,30,140,0.3)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
              formatter={(value: number, name: string) => [
                value,
                name === 'pageViews' ? 'Pages vues' : 'Visiteurs uniques',
              ]}
            />
            <Legend
              formatter={(value: string) =>
                value === 'pageViews' ? 'Pages vues' : 'Visiteurs uniques'
              }
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
            />
            <Bar dataKey="pageViews" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="uniqueVisitors" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
