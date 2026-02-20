export const dynamic = 'force-dynamic'

const SUPABASE_PROJECT_REF = 'xarrchsokuhobwqvcnkg'
const DB_LIMIT_BYTES = 500 * 1024 * 1024 // 500 MB
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024 // 1 GB

interface TableInfo {
  table_name: string
  row_count: number
}

interface BucketInfo {
  bucket_id: string
  file_count: number
  total_bytes: number
}

interface HealthCheck {
  label: string
  value: string
  ok: boolean
}

async function runSQL<T>(query: string): Promise<T[]> {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return []

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD} jours`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

async function getInfraStats() {
  const [dbSizeRows, tables, buckets, lastBackup, lastPost, pushCount, emailCount] =
    await Promise.all([
      runSQL<{ db_size_bytes: string }>(
        `SELECT pg_database_size('postgres') as db_size_bytes`
      ),
      runSQL<{ table_name: string; row_count: string }>(
        `SELECT relname as table_name, n_live_tup as row_count FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC`
      ),
      runSQL<{ bucket_id: string; file_count: string; total_bytes: string }>(
        `SELECT bucket_id, count(*) as file_count, coalesce(sum((metadata->>'size')::bigint), 0) as total_bytes FROM storage.objects WHERE metadata->>'size' IS NOT NULL GROUP BY bucket_id ORDER BY total_bytes DESC`
      ),
      runSQL<{ created_at: string; name: string }>(
        `SELECT created_at, name FROM storage.objects WHERE bucket_id = 'backups' ORDER BY created_at DESC LIMIT 1`
      ),
      runSQL<{ created_at: string; source: string }>(
        `SELECT created_at, source FROM public.social_posts_log ORDER BY created_at DESC LIMIT 1`
      ),
      runSQL<{ count: string }>(
        `SELECT count(*) FROM public.push_subscriptions`
      ),
      runSQL<{ count: string }>(
        `SELECT count(*) FROM public.email_subscribers`
      ),
    ])

  const dbSizeBytes = parseInt(dbSizeRows[0]?.db_size_bytes || '0')
  const parsedTables: TableInfo[] = tables.map((t) => ({
    table_name: t.table_name,
    row_count: parseInt(t.row_count),
  }))
  const parsedBuckets: BucketInfo[] = buckets.map((b) => ({
    bucket_id: b.bucket_id,
    file_count: parseInt(b.file_count),
    total_bytes: parseInt(b.total_bytes),
  }))
  const totalStorageBytes = parsedBuckets.reduce((s, b) => s + b.total_bytes, 0)
  const totalRows = parsedTables.reduce((s, t) => s + t.row_count, 0)

  const health: HealthCheck[] = []

  if (lastBackup[0]) {
    const d = new Date(lastBackup[0].created_at)
    const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000)
    health.push({
      label: 'Dernier backup',
      value: timeAgo(lastBackup[0].created_at),
      ok: daysAgo <= 8,
    })
  } else {
    health.push({ label: 'Dernier backup', value: 'Aucun', ok: false })
  }

  if (lastPost[0]) {
    health.push({
      label: 'Dernière pub sociale',
      value: `${timeAgo(lastPost[0].created_at)} (${lastPost[0].source})`,
      ok: true,
    })
  } else {
    health.push({ label: 'Dernière pub sociale', value: 'Aucune', ok: true })
  }

  health.push({
    label: 'Push actifs',
    value: `${pushCount[0]?.count || 0} abonnés`,
    ok: true,
  })

  health.push({
    label: 'Email actifs',
    value: `${emailCount[0]?.count || 0} abonnés`,
    ok: true,
  })

  return { dbSizeBytes, parsedTables, parsedBuckets, totalStorageBytes, totalRows, health }
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const color =
    pct < 50 ? 'bg-green-500' : pct < 80 ? 'bg-yellow-500' : 'bg-red-500'
  const textColor =
    pct < 50 ? 'text-green-400' : pct < 80 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-white/60">{label}</span>
        <span className={`text-lg font-bold ${textColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-3 bg-[#0d0b1a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-white/30 mt-1.5">
        {formatBytes(value)} / {formatBytes(max)}
      </p>
    </div>
  )
}

export default async function InfraPage() {
  const token = process.env.SUPABASE_ACCESS_TOKEN

  if (!token) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">Infrastructure</h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm">
          Variable <code className="bg-red-500/20 px-1.5 py-0.5 rounded">SUPABASE_ACCESS_TOKEN</code> manquante.
          Ajoutez-la dans <code className="bg-red-500/20 px-1.5 py-0.5 rounded">.env.local</code> et sur Vercel.
        </div>
      </div>
    )
  }

  const { dbSizeBytes, parsedTables, parsedBuckets, totalStorageBytes, totalRows, health } =
    await getInfraStats()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-2">Infrastructure</h1>
      <p className="text-white/50 mb-6 sm:mb-8">
        Supabase free tier — {parsedTables.length} tables, {totalRows.toLocaleString('fr-FR')} lignes
      </p>

      {/* Jauges BDD + Storage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <ProgressBar value={dbSizeBytes} max={DB_LIMIT_BYTES} label="Base de données" />
        <ProgressBar value={totalStorageBytes} max={STORAGE_LIMIT_BYTES} label="Storage" />
      </div>

      {/* Storage par bucket */}
      <div className="bg-[#1a1232] rounded-2xl p-5 mb-8 border border-[#2a2545]">
        <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">
          Storage par bucket
        </h2>
        <div className="space-y-2">
          {parsedBuckets.map((b) => {
            const pct = totalStorageBytes > 0 ? (b.total_bytes / totalStorageBytes) * 100 : 0
            return (
              <div key={b.bucket_id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm font-mono text-white/70 w-24 shrink-0">{b.bucket_id}</span>
                <div className="flex-1 h-2 bg-[#0d0b1a] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#e91e8c]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-white/40 w-16 text-right">{formatBytes(b.total_bytes)}</span>
                <span className="text-xs text-white/25 w-12 text-right">{b.file_count} f.</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tables */}
      <div className="bg-[#1a1232] rounded-2xl p-5 mb-8 border border-[#2a2545]">
        <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">
          Tables ({parsedTables.length})
        </h2>
        <div className="space-y-1">
          {parsedTables.map((t) => {
            const dotColor =
              t.row_count === 0
                ? 'bg-white/10'
                : t.row_count < 100
                  ? 'bg-green-500'
                  : t.row_count < 1000
                    ? 'bg-green-400'
                    : t.row_count < 10000
                      ? 'bg-yellow-400'
                      : 'bg-red-400'
            return (
              <div key={t.table_name} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-white/[0.02]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="text-sm font-mono text-white/60 flex-1">{t.table_name}</span>
                <span className={`text-sm font-mono tabular-nums ${t.row_count === 0 ? 'text-white/15' : 'text-white/70'}`}>
                  {t.row_count.toLocaleString('fr-FR')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Santé */}
      <div className="bg-[#1a1232] rounded-2xl p-5 mb-8 border border-[#2a2545]">
        <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">
          Santé
        </h2>
        <div className="space-y-2">
          {health.map((h) => (
            <div key={h.label} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/[0.02]">
              <span className={`w-2 h-2 rounded-full shrink-0 ${h.ok ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-white/50 w-40 shrink-0">{h.label}</span>
              <span className="text-sm text-white/70">{h.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Limites free tier */}
      <div className="bg-white/[0.02] rounded-2xl p-5 border border-[#2a2545]/50">
        <h2 className="text-sm font-semibold text-white/30 mb-3 uppercase tracking-wider">
          Limites free tier Supabase
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/25">
          <div>BDD : 500 MB</div>
          <div>Storage : 1 GB</div>
          <div>50K MAU</div>
          <div>2 projets max</div>
          <div>Bandwidth : 5 GB</div>
          <div>Edge : 500K req</div>
          <div>Realtime : 200 conn.</div>
          <div>File upload : 50 MB</div>
        </div>
      </div>
    </div>
  )
}
