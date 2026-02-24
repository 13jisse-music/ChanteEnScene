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
    // GitHub API unavailable — silently fail
  }

  if (allCommits.length === 0) return null

  // Count unique working days (Paris timezone)
  const uniqueDays = new Set(
    allCommits.map(c =>
      new Date(c.commit.author.date).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
    )
  ).size

  const totalCommits = allCommits.length

  // Solo intermediate dev: 6.5-8.2h per commit-equivalent (research, design, code, debug, test)
  const estimatedLow = Math.round((totalCommits * 6.5) / 50) * 50
  const estimatedHigh = Math.round((totalCommits * 8.2) / 50) * 50

  // Months equivalent (8h/day, 22 working days/month)
  const monthsLow = Math.round(estimatedLow / 176)
  const monthsHigh = Math.round(estimatedHigh / 176)

  // Actual hours with Claude (~4h per active session day)
  const actualHours = uniqueDays * 4

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg sm:text-xl">&#9889;</span>
        <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-base">
          Temps de d&eacute;veloppement estim&eacute;
        </h2>
      </div>
      <p className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl text-[#e91e8c]">
        {estimatedLow.toLocaleString('fr-FR')}&nbsp;&mdash;&nbsp;{estimatedHigh.toLocaleString('fr-FR')}&nbsp;h
      </p>
      <p className="text-white/40 text-xs mt-1">
        dev interm&eacute;diaire solo &bull; {monthsLow} &agrave; {monthsHigh} mois &agrave; temps plein
      </p>
      <p className="text-white/20 text-[11px] mt-2.5">
        (~{actualHours}h r&eacute;elles avec Claude &bull; {uniqueDays} jours &bull; {totalCommits} commits)
      </p>
    </div>
  )
}
