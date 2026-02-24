type GitHubCommit = {
  sha: string
  commit: { author: { date: string } }
}

export default async function DevTimeCard() {
  let allCommits: GitHubCommit[] = []
  try {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ChanteEnScene-Admin',
    }
    const results = await Promise.all(
      [1, 2, 3].map(page =>
        fetch(
          `https://api.github.com/repos/13jisse-music/ChanteEnScene/commits?per_page=100&page=${page}`,
          { headers, next: { revalidate: 3600 } }
        )
          .then(r => (r.ok ? r.json() : []))
          .catch(() => [])
      )
    )
    allCommits = results.flat().filter((c: GitHubCommit) => c?.sha)
  } catch {
    // GitHub API unavailable
  }

  if (allCommits.length === 0) return null

  // Count unique working days (Paris timezone)
  const uniqueDays = new Set(
    allCommits.map(c =>
      new Date(c.commit.author.date).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
    )
  ).size

  const totalCommits = allCommits.length

  // Solo intermediate dev: ~7.3h per commit-equivalent (research, design, code, debug, test)
  const estimatedHours = Math.round((totalCommits * 7.3) / 10) * 10

  // Actual hours with Claude (~4h per active session day)
  const actualHours = uniqueDays * 4

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-3 sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-lg sm:text-2xl">&#9889;</span>
        <span
          className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full"
          style={{ background: '#f59e0b15', color: '#f59e0b' }}
        >
          Temps de travail
        </span>
      </div>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl" style={{ color: '#f59e0b' }}>
        {estimatedHours.toLocaleString('fr-FR')} h
      </p>
      <p className="text-white/20 text-[11px] mt-1">
        ({actualHours}h r&eacute;elles avec Claude)
      </p>
    </div>
  )
}
