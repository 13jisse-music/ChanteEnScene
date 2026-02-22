type GitHubCommit = {
  sha: string
  commit: {
    message: string
    author: { date: string }
  }
}

export default async function ChangelogCard() {
  let commits: GitHubCommit[] = []
  try {
    const res = await fetch(
      'https://api.github.com/repos/13jisse-music/ChanteEnScene/commits?per_page=10',
      {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ChanteEnScene-Admin' },
        next: { revalidate: 3600 },
      }
    )
    if (res.ok) {
      commits = await res.json()
    }
  } catch {
    // GitHub API unavailable
  }

  if (commits.length === 0) {
    return <p className="p-6 text-center text-white/30 text-sm">Impossible de charger l&apos;historique.</p>
  }

  // Group by date
  const grouped = new Map<string, GitHubCommit[]>()
  for (const c of commits) {
    const day = new Date(c.commit.author.date).toLocaleDateString('fr-FR', {
      timeZone: 'Europe/Paris',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (!grouped.has(day)) grouped.set(day, [])
    grouped.get(day)!.push(c)
  }

  return (
    <div className="divide-y divide-[#2a2545] max-h-[320px] overflow-y-auto">
      {[...grouped.entries()].map(([day, dayCommits]) => (
        <div key={day} className="p-3 sm:p-4">
          <p className="text-xs text-white/30 font-semibold mb-2">{day}</p>
          <div className="space-y-1.5">
            {dayCommits.map(c => {
              const firstLine = c.commit.message.split('\n')[0]
              const time = new Date(c.commit.author.date).toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div key={c.sha} className="flex items-start gap-2">
                  <span className="text-white/20 text-xs mt-0.5 shrink-0">{time}</span>
                  <p className="text-sm text-white/70">{firstLine}</p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
