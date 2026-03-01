import { escapeHtml } from '@/lib/security'

// ─── Registration confirmation email ───

export function registrationConfirmationEmail({
  candidateName,
  sessionName,
  category,
  songTitle,
  songArtist,
}: {
  candidateName: string
  sessionName: string
  category: string
  songTitle: string
  songArtist: string
}) {
  const safeName = escapeHtml(candidateName)
  const safeSession = escapeHtml(sessionName)
  const safeCategory = escapeHtml(category)
  const safeSongTitle = escapeHtml(songTitle)
  const safeSongArtist = escapeHtml(songArtist)
  const subject = `Inscription confirmée — ${sessionName}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
      <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px 0;">
        Bienvenue ${safeName} !
      </h1>
      <p style="color:#ffffff99;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Votre inscription au concours <strong style="color:#ffffff;">${safeSession}</strong> a bien été enregistrée.
      </p>

      <!-- Recap -->
      <div style="background:#0d0b1a;border-radius:12px;padding:16px;margin:0 0 24px 0;">
        <table style="width:100%;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#ffffff50;">Catégorie</td>
            <td style="padding:6px 0;color:#e91e8c;font-weight:bold;text-align:right;">${safeCategory}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#ffffff50;">Chanson</td>
            <td style="padding:6px 0;color:#ffffff;text-align:right;">${safeSongTitle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#ffffff50;">Artiste</td>
            <td style="padding:6px 0;color:#ffffff;text-align:right;">${safeSongArtist}</td>
          </tr>
        </table>
      </div>

      <p style="color:#ffffff70;font-size:13px;line-height:1.6;margin:0 0 16px 0;">
        Votre candidature est en cours d'examen. Vous recevrez un email dès qu'elle sera validée par notre équipe.
      </p>

      <div style="background:rgba(245,166,35,0.1);border:1px solid rgba(245,166,35,0.25);border-radius:12px;padding:16px;">
        <p style="color:#f5a623;font-size:13px;line-height:1.6;margin:0;text-align:center;">
          Une fois approuvée, votre profil sera visible sur le site et le public pourra voter pour vous !
        </p>
      </div>
    </div>

    <!-- Footer -->
    <p style="color:#ffffff30;font-size:11px;text-align:center;margin-top:24px;line-height:1.5;">
      En cas de question, contactez l'organisateur.<br/>
      ChanteEnScène — Concours de chant
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

// ─── Candidate approved email ───

export function candidateApprovedEmail({
  candidateName,
  sessionName,
  profileUrl,
  galleryUrl,
  referralUrl,
}: {
  candidateName: string
  sessionName: string
  profileUrl: string
  galleryUrl?: string
  referralUrl?: string
}) {
  const safeName = escapeHtml(candidateName)
  const safeSession = escapeHtml(sessionName)
  const subject = `C'est officiel — tu fais partie de ${sessionName} !`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
      <div style="text-align:center;font-size:48px;margin-bottom:16px;">🎉</div>
      <h1 style="color:#7ec850;font-size:22px;margin:0 0 8px 0;text-align:center;">
        Bienvenue dans l'aventure !
      </h1>
      <p style="color:#ffffff99;font-size:15px;line-height:1.6;margin:0 0 24px 0;text-align:center;">
        Félicitations <strong style="color:#ffffff;">${safeName}</strong> !<br/>
        Ta candidature pour <strong style="color:#ffffff;">${safeSession}</strong> a été validée.
      </p>

      <div style="background:rgba(126,200,80,0.1);border:1px solid rgba(126,200,80,0.25);border-radius:12px;padding:16px;margin:0 0 24px 0;">
        <p style="color:#7ec850;font-size:13px;line-height:1.8;margin:0;text-align:center;">
          ✅ Ton profil est en ligne — le public peut voter pour toi !<br/>
          🎤 Le jury en ligne découvre ta candidature<br/>
          📊 Suis tes votes sur ta page profil
        </p>
      </div>

      <!-- CTA: Profile -->
      <div style="text-align:center;margin:24px 0 16px 0;">
        <a href="${profileUrl}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:bold;">
          Voir mon profil
        </a>
      </div>

      <!-- Share section -->
      <div style="background:rgba(233,30,140,0.06);border:1px solid rgba(233,30,140,0.15);border-radius:12px;padding:16px;margin:24px 0 0 0;">
        <p style="color:#e91e8c;font-size:13px;font-weight:bold;margin:0 0 8px 0;text-align:center;">
          Chaque vote compte !
        </p>
        <p style="color:#ffffff80;font-size:12px;line-height:1.6;margin:0;text-align:center;">
          Partage ton profil avec tes proches pour récolter un maximum de votes.<br/>
          Copie ce lien et envoie-le sur tes réseaux :
        </p>
        <div style="background:#0d0b1a;border-radius:8px;padding:10px;margin-top:10px;text-align:center;">
          <a href="${profileUrl}" style="color:#38bdf8;font-size:12px;word-break:break-all;text-decoration:none;">${profileUrl}</a>
        </div>
      </div>

      ${referralUrl ? `
      <!-- Referral section -->
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:16px;margin:20px 0 0 0;">
        <p style="color:#8b5cf6;font-size:13px;font-weight:bold;margin:0 0 8px 0;text-align:center;">
          🤝 Parraine tes proches !
        </p>
        <p style="color:#ffffff80;font-size:12px;line-height:1.6;margin:0;text-align:center;">
          Envoie ce lien à ceux qui aiment chanter — chaque filleul inscrit booste ta visibilité :
        </p>
        <div style="background:#0d0b1a;border-radius:8px;padding:10px;margin-top:10px;text-align:center;">
          <a href="${referralUrl}" style="color:#8b5cf6;font-size:12px;word-break:break-all;text-decoration:none;">${referralUrl}</a>
        </div>
      </div>
      ` : ''}

      ${galleryUrl ? `
      <div style="text-align:center;margin-top:20px;">
        <a href="${galleryUrl}" style="color:#ffffff50;font-size:12px;text-decoration:underline;">
          Découvrir tous les candidats →
        </a>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <p style="color:#ffffff30;font-size:11px;text-align:center;margin-top:24px;line-height:1.5;">
      Bonne chance !<br/>
      L'équipe ChanteEnScène
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

// ─── Jury invitation email ───

const ROLE_LABELS: Record<string, string> = {
  online: 'Jury En Ligne',
  semifinal: 'Jury Demi-finale',
  final: 'Jury Grande Finale',
}

// ─── Jury weekly recap email ───

export function juryWeeklyRecapEmail({
  jurorName,
  sessionName,
  newCandidatesCount,
  totalCandidates,
  votedCount,
  remainingCount,
  juryUrl,
  newCandidates,
}: {
  jurorName: string
  sessionName: string
  newCandidatesCount: number
  totalCandidates: number
  votedCount: number
  remainingCount: number
  juryUrl: string
  newCandidates: { name: string; category: string; songTitle: string }[]
}) {
  const subject = remainingCount > 0
    ? `${remainingCount} candidat${remainingCount > 1 ? 's' : ''} en attente de votre vote — ${sessionName}`
    : `Recap hebdo — ${sessionName}`

  const safeJurorName = escapeHtml(jurorName)
  const safeSessionName = escapeHtml(sessionName)

  const candidateRows = newCandidates.slice(0, 5).map((c) => `
    <tr>
      <td style="padding:8px 0;color:#ffffff;font-size:13px;">${escapeHtml(c.name)}</td>
      <td style="padding:8px 0;color:#e91e8c;font-size:12px;text-align:center;">${escapeHtml(c.category)}</td>
      <td style="padding:8px 0;color:#ffffff70;font-size:12px;text-align:right;">${escapeHtml(c.songTitle)}</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scene</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
      <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px 0;">
        Bonjour ${safeJurorName} !
      </h1>
      <p style="color:#ffffff99;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Voici votre recap hebdomadaire pour <strong style="color:#ffffff;">${safeSessionName}</strong>.
      </p>

      <!-- Stats -->
      <div style="display:flex;gap:12px;margin:0 0 24px 0;">
        <div style="flex:1;background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
          <div style="color:#7ec850;font-size:28px;font-weight:bold;">${votedCount}</div>
          <div style="color:#ffffff50;font-size:11px;">votes effectues</div>
        </div>
        <div style="flex:1;background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
          <div style="color:${remainingCount > 0 ? '#f59e0b' : '#7ec850'};font-size:28px;font-weight:bold;">${remainingCount}</div>
          <div style="color:#ffffff50;font-size:11px;">en attente</div>
        </div>
        <div style="flex:1;background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
          <div style="color:#e91e8c;font-size:28px;font-weight:bold;">${totalCandidates}</div>
          <div style="color:#ffffff50;font-size:11px;">total</div>
        </div>
      </div>

      ${newCandidatesCount > 0 ? `
      <!-- New candidates -->
      <div style="background:#0d0b1a;border-radius:12px;padding:16px;margin:0 0 24px 0;">
        <p style="color:#f5a623;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">
          ${newCandidatesCount} nouveau${newCandidatesCount > 1 ? 'x' : ''} candidat${newCandidatesCount > 1 ? 's' : ''} cette semaine
        </p>
        <table style="width:100%;border-collapse:collapse;">
          ${candidateRows}
        </table>
        ${newCandidatesCount > 5 ? `<p style="color:#ffffff30;font-size:11px;margin:8px 0 0 0;">...et ${newCandidatesCount - 5} de plus</p>` : ''}
      </div>
      ` : ''}

      ${remainingCount > 0 ? `
      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 0 0;">
        <a href="${juryUrl}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
          Voter maintenant (${remainingCount} restant${remainingCount > 1 ? 's' : ''})
        </a>
      </div>
      ` : `
      <div style="background:rgba(126,200,80,0.1);border:1px solid rgba(126,200,80,0.25);border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#7ec850;font-size:14px;margin:0;">Tous les candidats ont ete evalues. Merci !</p>
      </div>
      `}
    </div>

    <!-- Footer -->
    <p style="color:#ffffff30;font-size:11px;text-align:center;margin-top:24px;line-height:1.5;">
      ChanteEnScene — Recap hebdomadaire jury
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

// ─── Admin report email ───

export function adminReportEmail({
  sessionName,
  sessionStatus,
  period,
  totalCandidates,
  newCandidates,
  totalVotes,
  newVotes,
  pwaInstalls,
  newPwaInstalls,
  pushSubscriptions,
  newPushSubs,
  emailSubscribers,
  newEmailSubs,
  newVisitors,
  totalPageViews,
  topPages,
  statusBreakdown,
  platformBreakdown,
  pushRoleBreakdown,
  recentCandidateNames,
  recentCommits,
  config,
  adminUrl,
  totalDonationsEuros,
  totalDonationsCount,
  newDonationsEuros,
  newDonationsCount,
  newDonationsList,
}: {
  sessionName: string
  sessionStatus: string
  period: string
  totalCandidates: number
  newCandidates: number
  totalVotes: number
  newVotes: number
  pwaInstalls: number
  newPwaInstalls: number
  pushSubscriptions: number
  newPushSubs: number
  emailSubscribers: number
  newEmailSubs: number
  newVisitors: number
  totalPageViews: number
  topPages: { path: string; count: number }[]
  statusBreakdown: Record<string, number>
  platformBreakdown: Record<string, number>
  pushRoleBreakdown: Record<string, number>
  recentCandidateNames: { name: string; category: string }[]
  recentCommits: string[]
  config: Record<string, unknown>
  adminUrl: string
  totalDonationsEuros?: string
  totalDonationsCount?: number
  newDonationsEuros?: string
  newDonationsCount?: number
  newDonationsList?: { name: string; amount: string; tier: string }[]
}) {
  const subject = `Briefing ${period} — ${sessionName}`
  const safeSessionName = escapeHtml(sessionName)
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

  // Status labels & colors
  const statusMeta: Record<string, { label: string; color: string }> = {
    draft: { label: 'Brouillon', color: '#94a3b8' },
    registration_open: { label: 'Inscriptions ouvertes', color: '#7ec850' },
    registration_closed: { label: 'Inscriptions fermées', color: '#f59e0b' },
    semifinal: { label: 'Demi-finale', color: '#3b82f6' },
    final: { label: 'Finale', color: '#e91e8c' },
    archived: { label: 'Archivé', color: '#6b7280' },
  }
  const status = statusMeta[sessionStatus] || { label: sessionStatus, color: '#94a3b8' }

  // Helper: delta badge
  const delta = (n: number) => n > 0 ? `<span style="color:#7ec850;font-size:11px;font-weight:bold;"> +${n}</span>` : ''

  // Helper: progress bar (for visual breakdowns)
  const bar = (pct: number, color: string) => `
    <div style="background:#0d0b1a;border-radius:4px;height:8px;width:100%;overflow:hidden;">
      <div style="background:${color};height:100%;width:${Math.min(pct, 100)}%;border-radius:4px;"></div>
    </div>`

  // Audience totale
  const totalAudience = (pwaInstalls || 0) + (pushSubscriptions || 0) + (emailSubscribers || 0)

  // Conversion rate: visitors → installs (sur les données J-1)
  const conversionRate = newVisitors > 0 && (newPwaInstalls || 0) > 0
    ? Math.round((newPwaInstalls || 0) / newVisitors * 100) : 0

  // Candidate status labels
  const statusCandidateLabels: Record<string, string> = {
    pending: 'En attente', approved: 'Approuvés', rejected: 'Refusés',
    semifinalist: 'Demi-finalistes', finalist: 'Finalistes', winner: 'Gagnant',
  }

  // Platform labels
  const platformLabels: Record<string, string> = {
    android: 'Android', ios: 'iOS', desktop: 'Desktop', unknown: 'Autre',
  }
  const platformColors: Record<string, string> = {
    android: '#7ec850', ios: '#3b82f6', desktop: '#f97316', unknown: '#94a3b8',
  }

  // Push role labels
  const pushRoleLabels: Record<string, string> = {
    public: 'Public', jury: 'Jury', admin: 'Admin',
  }
  const totalPushAll = Object.values(pushRoleBreakdown).reduce((a, b) => a + b, 0)

  // Build todo list
  const todos: string[] = []
  const prizes = config.prizes as { rank: string; description: string }[] | undefined
  if (!prizes || prizes.length === 0) todos.push('Configurer les dotations/prix')
  if (!config.registration_start) todos.push("Définir les dates d'inscription")
  if (!config.semifinal_date) todos.push('Définir la date de demi-finale')
  if (!config.final_date) todos.push('Définir la date de finale')
  if (sessionStatus === 'draft') todos.push('Passer la session en "Inscriptions ouvertes"')
  if (sessionStatus === 'registration_open' && totalCandidates === 0) todos.push('Communiquer pour attirer les premiers candidats')
  if (pwaInstalls > 0 && pushSubscriptions === 0) todos.push("Inciter les visiteurs à activer les notifications")

  // ── Build HTML ──
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span>
      </span>
    </div>

    <!-- Header Card -->
    <div style="background:linear-gradient(135deg,#1e1744,#2a1f5e);border:1px solid #3a3070;border-radius:16px;padding:24px;margin-bottom:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td>
            <h1 style="color:#ffffff;font-size:18px;margin:0 0 4px 0;">Briefing ${escapeHtml(period)}</h1>
            <p style="color:#ffffff60;font-size:12px;margin:0;">${today}</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <span style="display:inline-block;background:${status.color}22;color:${status.color};font-size:11px;font-weight:bold;padding:4px 10px;border-radius:20px;border:1px solid ${status.color}44;">
              ${status.label}
            </span>
          </td>
        </tr>
      </table>
      <p style="color:#ffffff50;font-size:12px;margin:10px 0 0 0;">${safeSessionName}</p>
    </div>

    <!-- ===== SECTION 1: Activité J-1 ===== -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <tr>
          <td><p style="color:#7ec850;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0;">Hier en un coup d'oeil</p></td>
          <td style="text-align:right;"><span style="color:#ffffff30;font-size:11px;">${totalPageViews} pages vues</span></td>
        </tr>
      </table>

      <!-- Activity summary bar -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#8b5cf6;font-size:22px;font-weight:bold;">${newVisitors}</div>
              <div style="color:#ffffff40;font-size:9px;">Visiteurs</div>
            </div>
          </td>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#e91e8c;font-size:22px;font-weight:bold;">${newCandidates}</div>
              <div style="color:#ffffff40;font-size:9px;">Inscriptions</div>
            </div>
          </td>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#3b82f6;font-size:22px;font-weight:bold;">${newVotes}</div>
              <div style="color:#ffffff40;font-size:9px;">Votes</div>
            </div>
          </td>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#10b981;font-size:22px;font-weight:bold;">${(newPwaInstalls || 0) + (newPushSubs || 0) + (newEmailSubs || 0)}</div>
              <div style="color:#ffffff40;font-size:9px;">Nouveaux abos</div>
            </div>
          </td>
        </tr>
      </table>

      ${conversionRate > 0 ? `
      <p style="color:#ffffff50;font-size:11px;margin:10px 0 0 0;text-align:center;">
        Taux de conversion visiteur → install : <strong style="color:#7ec850;">${conversionRate}%</strong>
      </p>` : ''}

      ${(newDonationsCount || 0) > 0 ? `
      <div style="background:#fbbf2415;border:1px solid #fbbf2430;border-radius:10px;padding:10px 12px;margin-top:12px;">
        <p style="color:#fbbf24;font-size:11px;font-weight:bold;margin:0 0 6px 0;">💰 ${newDonationsCount} don${(newDonationsCount || 0) > 1 ? 's' : ''} reçu${(newDonationsCount || 0) > 1 ? 's' : ''} — ${newDonationsEuros}€</p>
        ${(newDonationsList || []).map(d => `<p style="color:#ffffffcc;font-size:11px;margin:2px 0;">${escapeHtml(d.name)} — ${d.amount}€ (${d.tier})</p>`).join('')}
      </div>` : ''}
    </div>

    <!-- ===== SECTION 2: Totaux & Progression ===== -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Tableau de bord</p>

      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #2a2545;">
          <td style="padding:8px 0;color:#ffffff70;font-size:12px;">Candidats</td>
          <td style="padding:8px 0;text-align:right;color:#e91e8c;font-size:16px;font-weight:bold;">${totalCandidates}${delta(newCandidates)}</td>
        </tr>
        <tr style="border-bottom:1px solid #2a2545;">
          <td style="padding:8px 0;color:#ffffff70;font-size:12px;">Votes publics</td>
          <td style="padding:8px 0;text-align:right;color:#3b82f6;font-size:16px;font-weight:bold;">${totalVotes}${delta(newVotes)}</td>
        </tr>
        <tr style="border-bottom:1px solid #2a2545;">
          <td style="padding:8px 0;color:#ffffff70;font-size:12px;">Installations PWA</td>
          <td style="padding:8px 0;text-align:right;color:#10b981;font-size:16px;font-weight:bold;">${pwaInstalls}${delta(newPwaInstalls)}</td>
        </tr>
        <tr style="border-bottom:1px solid #2a2545;">
          <td style="padding:8px 0;color:#ffffff70;font-size:12px;">Abonnés push</td>
          <td style="padding:8px 0;text-align:right;color:#f97316;font-size:16px;font-weight:bold;">${pushSubscriptions}${delta(newPushSubs)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#ffffff70;font-size:12px;">Abonnés email</td>
          <td style="padding:8px 0;text-align:right;color:#ec4899;font-size:16px;font-weight:bold;">${emailSubscribers}${delta(newEmailSubs)}</td>
        </tr>
        ${(totalDonationsCount || 0) > 0 ? `<tr style="border-top:1px solid #2a2545;">
          <td style="padding:8px 0;color:#ffffff70;font-size:12px;">Dons reçus</td>
          <td style="padding:8px 0;text-align:right;color:#fbbf24;font-size:16px;font-weight:bold;">${totalDonationsEuros}€ <span style="color:#ffffff50;font-size:11px;">(${totalDonationsCount})</span>${delta(newDonationsCount || 0)}</td>
        </tr>` : ''}
      </table>

      <div style="border-top:1px solid #2a2545;margin-top:12px;padding-top:12px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#ffffff50;font-size:12px;">Audience totale</td>
            <td style="text-align:right;color:#ffffff;font-size:18px;font-weight:bold;">${totalAudience}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ===== SECTION 3: Analyse d'audience ===== -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Analyse d'audience</p>

      <!-- PWA Platform breakdown -->
      <p style="color:#ffffff60;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Plateformes (PWA)</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        ${Object.entries(platformBreakdown).map(([platform, count]) => {
          const pct = pwaInstalls > 0 ? Math.round(count / pwaInstalls * 100) : 0
          const color = platformColors[platform] || '#94a3b8'
          const label = platformLabels[platform] || platform
          return `<tr>
            <td style="padding:3px 0;color:#ffffffcc;font-size:12px;width:80px;">${label}</td>
            <td style="padding:3px 0;">${bar(pct, color)}</td>
            <td style="padding:3px 0;color:#ffffff80;font-size:11px;width:60px;text-align:right;">${count} (${pct}%)</td>
          </tr>`
        }).join('')}
      </table>

      <!-- Push role breakdown -->
      <p style="color:#ffffff60;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Abonnés push par rôle (${totalPushAll} total)</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
        ${Object.entries(pushRoleBreakdown).map(([role, count]) => {
          const pct = totalPushAll > 0 ? Math.round(count / totalPushAll * 100) : 0
          const label = pushRoleLabels[role] || role
          const colors: Record<string, string> = { public: '#e91e8c', jury: '#f59e0b', admin: '#6366f1' }
          return `<tr>
            <td style="padding:3px 0;color:#ffffffcc;font-size:12px;width:80px;">${label}</td>
            <td style="padding:3px 0;">${bar(pct, colors[role] || '#94a3b8')}</td>
            <td style="padding:3px 0;color:#ffffff80;font-size:11px;width:60px;text-align:right;">${count} (${pct}%)</td>
          </tr>`
        }).join('')}
      </table>
    </div>

    ${totalCandidates > 0 ? `
    <!-- ===== SECTION 4: Candidats ===== -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Candidats (${totalCandidates})</p>
      <table style="width:100%;border-collapse:collapse;">
        ${Object.entries(statusBreakdown).map(([s, count]) => {
          const pct = totalCandidates > 0 ? Math.round(count / totalCandidates * 100) : 0
          const label = statusCandidateLabels[s] || s
          const colors: Record<string, string> = { pending: '#f59e0b', approved: '#7ec850', rejected: '#ef4444', semifinalist: '#3b82f6', finalist: '#e91e8c', winner: '#fbbf24' }
          return `<tr>
            <td style="padding:3px 0;color:#ffffffcc;font-size:12px;width:110px;">${label}</td>
            <td style="padding:3px 0;">${bar(pct, colors[s] || '#94a3b8')}</td>
            <td style="padding:3px 0;color:#ffffff80;font-size:11px;width:50px;text-align:right;">${count}</td>
          </tr>`
        }).join('')}
      </table>

      ${recentCandidateNames.length > 0 ? `
      <div style="border-top:1px solid #2a2545;margin-top:12px;padding-top:12px;">
        <p style="color:#e91e8c;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px 0;">Nouvelles inscriptions</p>
        <table style="width:100%;border-collapse:collapse;">
          ${recentCandidateNames.slice(0, 5).map(c => `
          <tr>
            <td style="padding:3px 0;color:#ffffff;font-size:12px;">${escapeHtml(c.name)}</td>
            <td style="padding:3px 0;color:#e91e8c;font-size:11px;text-align:right;">${escapeHtml(c.category)}</td>
          </tr>`).join('')}
        </table>
        ${recentCandidateNames.length > 5 ? `<p style="color:#ffffff30;font-size:10px;margin:4px 0 0 0;">...et ${recentCandidateNames.length - 5} de plus</p>` : ''}
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${topPages.length > 0 ? `
    <!-- ===== SECTION 5: Pages populaires ===== -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Pages les plus visitées hier</p>
      <table style="width:100%;border-collapse:collapse;">
        ${topPages.map((p, i) => `
        <tr${i < topPages.length - 1 ? ' style="border-bottom:1px solid #1e1744;"' : ''}>
          <td style="padding:6px 0;color:#ffffff90;font-size:12px;font-family:monospace;">${escapeHtml(p.path)}</td>
          <td style="padding:6px 0;color:#8b5cf6;font-size:13px;font-weight:bold;text-align:right;width:50px;">${p.count}</td>
        </tr>`).join('')}
      </table>
    </div>
    ` : ''}

    ${recentCommits.length > 0 ? `
    <!-- ===== SECTION 6: Déploiements ===== -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#6366f1;font-size:13px;font-weight:bold;margin:0 0 12px 0;">Mises à jour du site (${recentCommits.length})</p>
      <table style="width:100%;border-collapse:collapse;">
        ${recentCommits.slice(0, 5).map(msg => `
        <tr><td style="padding:3px 0;color:#ffffffaa;font-size:12px;">• ${escapeHtml(msg)}</td></tr>`).join('')}
      </table>
      ${recentCommits.length > 5 ? `<p style="color:#ffffff30;font-size:10px;margin:4px 0 0 0;">...et ${recentCommits.length - 5} de plus</p>` : ''}
    </div>
    ` : ''}

    ${todos.length > 0 ? `
    <!-- ===== SECTION 7: Reste à faire ===== -->
    <div style="background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#f5a623;font-size:13px;font-weight:bold;margin:0 0 12px 0;">Prochaines actions</p>
      <table style="width:100%;border-collapse:collapse;">
        ${todos.map((t, i) => `
        <tr>
          <td style="padding:4px 0;color:#f5a623;font-size:12px;width:20px;vertical-align:top;">${i + 1}.</td>
          <td style="padding:4px 0;color:#ffffffcc;font-size:12px;">${t}</td>
        </tr>`).join('')}
      </table>
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin:20px 0 16px 0;">
      <a href="${adminUrl}" style="display:inline-block;padding:14px 40px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
        Ouvrir le dashboard
      </a>
    </div>

    <!-- Footer -->
    <p style="color:#ffffff25;font-size:10px;text-align:center;line-height:1.5;margin:0;">
      ChanteEnScène — Briefing automatique ${escapeHtml(period)}<br/>
      Généré le ${today}
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

// ─── Newsletter email ───

type NewsletterSection = {
  label?: string
  title?: string
  body: string
  imageUrl?: string | null
  color?: string
  ctaText?: string | null
  ctaUrl?: string | null
}

export function newsletterEmail({
  subject,
  body,
  imageUrl,
  sections,
  introText,
  footerTagline,
  unsubscribeUrl,
  ctaUrl,
  campaignNumber,
  campaignId,
  subscriberEmail,
}: {
  subject: string
  body?: string
  imageUrl?: string
  sections?: NewsletterSection[]
  introText?: string
  footerTagline?: string
  unsubscribeUrl: string
  ctaUrl?: string
  campaignNumber?: number
  campaignId?: string
  subscriberEmail?: string
}) {
  const siteUrl = ctaUrl || 'https://chantenscene.fr'
  const trackingBase = 'https://chantenscene.fr/api/track'

  // Wrap a URL through click tracking (if tracking params available)
  function trackUrl(url: string): string {
    if (!campaignId || !subscriberEmail) return url
    return `${trackingBase}/click?cid=${encodeURIComponent(campaignId)}&e=${encodeURIComponent(subscriberEmail)}&url=${encodeURIComponent(url)}`
  }
  const safeSubject = escapeHtml(subject)
  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
  const numStr = campaignNumber ? `NUM\u00c9RO ${campaignNumber}` : ''

  // Helper: blend a hex color with cream background to produce a solid 6-digit hex
  function blendWithBg(hex: string, alpha: number): string {
    const bgR = 245, bgG = 241, bgB = 235 // #f5f1eb cream background
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const blendR = Math.round(bgR * (1 - alpha) + r * alpha)
    const blendG = Math.round(bgG * (1 - alpha) + g * alpha)
    const blendB = Math.round(bgB * (1 - alpha) + b * alpha)
    return `#${blendR.toString(16).padStart(2, '0')}${blendG.toString(16).padStart(2, '0')}${blendB.toString(16).padStart(2, '0')}`
  }

  // Helper: convert text to HTML paragraphs
  function textToHtml(text: string): string {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="color:#3d3a45;font-size:15px;line-height:1.7;margin:0 0 16px 0;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
      .join('')
  }

  // Build sections HTML
  let contentHtml = ''

  if (sections && sections.length > 0) {
    contentHtml = sections.map((s, i) => {
      const sColor = s.color || '#e91e8c'
      const sectionBg = blendWithBg(sColor, 0.08)
      const borderColor = blendWithBg(sColor, 0.18)

      const sectionImage = s.imageUrl
        ? `<div style="margin-bottom:0;border-radius:16px 16px 0 0;overflow:hidden;">
            <a href="${escapeHtml(trackUrl(s.ctaUrl || siteUrl))}">
              <img src="${escapeHtml(s.imageUrl)}" alt="${escapeHtml(s.title || s.label || '')}" width="600" style="width:100%;max-width:600px;display:block;" />
            </a>
          </div>`
        : ''

      const sectionCta = s.ctaText && s.ctaUrl
        ? `<div style="text-align:center;margin:20px 0 0 0;">
            <a href="${escapeHtml(trackUrl(s.ctaUrl))}" style="display:inline-block;padding:14px 32px;background:${sColor};color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;letter-spacing:0.5px;">
              ${escapeHtml(s.ctaText)}
            </a>
          </div>`
        : ''

      const sectionLabel = s.label
        ? `<p style="color:${sColor};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">
            ${escapeHtml(s.label)}
          </p>`
        : ''

      const sectionTitle = s.title
        ? `<h2 style="color:#1a1533;font-size:20px;font-weight:bold;margin:0 0 16px 0;line-height:1.3;">
            ${escapeHtml(s.title)}
          </h2>`
        : ''

      const topRadius = s.imageUrl ? '0' : '16px'
      const textBlock = `
        <div style="background:${sectionBg};border:1px solid ${borderColor};border-radius:${topRadius} ${topRadius} 16px 16px;padding:24px 24px 28px 24px;">
          ${sectionLabel}${sectionTitle}
          <div style="background:#ffffff;border-radius:12px;padding:20px;">
            ${textToHtml(s.body)}
          </div>
          ${sectionCta}
        </div>`

      const spacing = i > 0 ? '<div style="height:24px;"></div>' : ''
      return `${spacing}${sectionImage}${textBlock}`
    }).join('')
  } else if (body) {
    contentHtml = `
      <h1 style="color:#e91e8c;font-size:20px;margin:0 0 20px 0;text-align:center;">
        ${safeSubject}
      </h1>
      ${textToHtml(body)}
      <div style="text-align:center;margin:24px 0 0 0;">
        <a href="${escapeHtml(trackUrl(siteUrl))}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
          Visiter le site
        </a>
      </div>`
  }

  // Intro paragraph (between header image and first section)
  const introHtml = introText
    ? `<div style="text-align:center;padding:0 16px 24px 16px;">
        <p style="color:#3d3a45;font-size:15px;line-height:1.7;margin:0;">${escapeHtml(introText).replace(/\n/g, '<br/>')}</p>
      </div>`
    : ''

  // Footer tagline (viral pink bar)
  const tagline = footerTagline || 'Vous aimez cette newsletter ? Transf\u00e9rez-la \u00e0 quelqu\u2019un qui chante sous la douche. On ne juge pas. On recrute. \ud83c\udfa4'
  const safeTagline = escapeHtml(tagline)

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f1eb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Top bar: date + links -->
    <div style="text-align:center;padding:24px 24px 16px 24px;">
      <p style="color:#999;font-size:11px;letter-spacing:1px;margin:0;">
        ${dateStr}${numStr ? ` &nbsp;\u2022&nbsp; ${numStr}` : ''}
        &nbsp;\u2022&nbsp; <a href="${escapeHtml(siteUrl)}" style="color:#999;text-decoration:none;">VISUALISER SUR LE WEB</a>
        &nbsp;\u2022&nbsp; <a href="${escapeHtml(siteUrl)}" style="color:#999;text-decoration:none;">S\u2019ABONNER</a>
      </p>
    </div>

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:28px;font-weight:bold;font-style:italic;">
        <span style="color:#1a1533;">Chante</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Sc\u00e8ne</span><span style="color:#1a1533;">.</span>
      </span>
      <p style="color:#999;font-size:12px;margin:4px 0 0 0;letter-spacing:2px;">LA NEWSLETTER</p>
    </div>

    ${imageUrl ? `
    <!-- Header image -->
    <div style="text-align:center;margin-bottom:24px;padding:0 24px;">
      <a href="${escapeHtml(siteUrl)}">
        <img src="${escapeHtml(imageUrl)}" alt="${safeSubject}" width="552" style="width:100%;max-width:552px;border-radius:16px;" />
      </a>
    </div>
    ` : ''}

    ${introHtml}

    <!-- Content -->
    <div style="padding:0 24px;">
      ${contentHtml}
    </div>

    <!-- Viral tagline bar -->
    <div style="margin:32px 24px 0 24px;background:#e91e8c;border-radius:12px;padding:20px 24px;">
      <p style="color:#ffffff;font-size:14px;font-weight:bold;line-height:1.6;margin:0;">
        ${safeTagline}
      </p>
    </div>

    <!-- Functional footer -->
    <div style="padding:32px 24px;text-align:center;">
      <p style="color:#3d3a45;font-size:13px;line-height:1.8;margin:0 0 16px 0;">
        Quelqu\u2019un vous a transf\u00e9r\u00e9 ce mail ? <a href="${escapeHtml(siteUrl)}" style="color:#1a1533;font-weight:bold;text-decoration:underline;">Inscrivez-vous \u00e0 notre newsletter ici</a>.
      </p>
      <p style="color:#3d3a45;font-size:13px;line-height:1.8;margin:0 0 24px 0;">
        Vous pouvez vous <a href="${escapeHtml(unsubscribeUrl)}" style="color:#1a1533;text-decoration:underline;">d\u00e9sabonner ici</a> (et briser nos c\u0153urs).
      </p>

      <!-- Social links -->
      <p style="color:#1a1533;font-size:14px;font-weight:bold;margin:0 0 24px 0;">
        <a href="https://www.facebook.com/chantenscene" style="color:#1a1533;text-decoration:none;">Facebook</a>
        &nbsp;&nbsp;\u2022&nbsp;&nbsp;
        <a href="https://www.instagram.com/chantenscene" style="color:#1a1533;text-decoration:none;">Instagram</a>
        &nbsp;&nbsp;\u2022&nbsp;&nbsp;
        <a href="https://chantenscene.fr" style="color:#e91e8c;text-decoration:none;">chantenscene.fr</a>
      </p>

      <!-- Separator -->
      <div style="border-top:1px solid #d5d0c8;margin:0 40px 24px 40px;"></div>

      <!-- Copyright -->
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        Cette newsletter est \u00e9dit\u00e9e par chantenscene.fr<br/>
        \u00a9 2026 ChanteEnSc\u00e8ne. Tous droits r\u00e9serv\u00e9s.
      </p>
    </div>

  </div>
${campaignId && subscriberEmail ? `<img src="${trackingBase}/open?cid=${encodeURIComponent(campaignId)}&e=${encodeURIComponent(subscriberEmail)}" width="1" height="1" style="display:none;" alt="" />` : ''}
</body>
</html>`

  return { subject, html }
}

// ─── Inscription reminder email (J-5 / Jour J) ───

export function inscriptionReminderEmail({
  sessionName,
  daysLeft,
  formattedDate,
  inscriptionUrl,
  siteUrl,
  unsubscribeUrl,
}: {
  sessionName: string
  daysLeft: number
  formattedDate: string
  inscriptionUrl: string
  siteUrl: string
  unsubscribeUrl: string
}) {
  const safeSessionName = escapeHtml(sessionName)
  const isOpenDay = daysLeft === 0

  const subject = isOpenDay
    ? `Les inscriptions sont ouvertes ! — ${safeSessionName}`
    : `Les inscriptions ouvrent dans ${daysLeft} jours ! — ${safeSessionName}`

  const headline = isOpenDay
    ? 'Les inscriptions sont ouvertes !'
    : `Plus que ${daysLeft} jours avant l\u2019ouverture !`

  const bodyText = isOpenDay
    ? `Les inscriptions pour <strong style="color:#ffffff;">${safeSessionName}</strong> sont officiellement ouvertes ! Vous pouvez d\u00e8s maintenant d\u00e9poser votre candidature.`
    : `Les inscriptions pour <strong style="color:#ffffff;">${safeSessionName}</strong> ouvrent le <strong style="color:#ffffff;">${escapeHtml(formattedDate)}</strong>. Pr\u00e9parez votre candidature !`

  const ctaText = isOpenDay ? "S'inscrire maintenant" : 'Visiter le site'
  const ctaUrl = isOpenDay ? inscriptionUrl : siteUrl

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Sc\u00e8ne</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
      <div style="text-align:center;font-size:40px;margin-bottom:16px;">${isOpenDay ? '\ud83c\udf89' : '\u23f3'}</div>
      <h1 style="color:#e91e8c;font-size:20px;margin:0 0 20px 0;text-align:center;">
        ${headline}
      </h1>

      <p style="color:#ffffffcc;font-size:14px;line-height:1.7;margin:0 0 16px 0;text-align:center;">
        ${bodyText}
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 0 0;">
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
          ${ctaText}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;">
      <p style="color:#ffffff33;font-size:11px;line-height:1.6;">
        Vous recevez cet email car vous \u00eates abonn\u00e9 aux actualit\u00e9s ChanteEnSc\u00e8ne.<br/>
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#e91e8c;">Se d\u00e9sinscrire</a>
      </p>
    </div>

  </div>
</body>
</html>`

  return { subject, html }
}

export function juryInvitationEmail({
  jurorName,
  role,
  sessionName,
  juryUrl,
  loginUrl,
}: {
  jurorName: string
  role: string
  sessionName: string
  juryUrl: string
  loginUrl: string
}) {
  const safeJurorName = escapeHtml(jurorName)
  const safeSessionName = escapeHtml(sessionName)
  const roleLabel = ROLE_LABELS[role] || role
  const safeRoleLabel = escapeHtml(roleLabel)

  const subject = `Vous êtes juré pour ${sessionName} — ChanteEnScène`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
      <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px 0;">
        Bonjour ${safeJurorName} !
      </h1>
      <p style="color:#ffffff99;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Vous avez été sélectionné(e) comme <strong style="color:#e91e8c;">${safeRoleLabel}</strong> pour le concours <strong style="color:#ffffff;">${safeSessionName}</strong>.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${juryUrl}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
          Accéder à mon espace jury
        </a>
      </div>

      <p style="color:#ffffff50;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
        Vous pouvez aussi vous connecter avec votre email sur :<br/>
        <a href="${loginUrl}" style="color:#e91e8c;">${loginUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <p style="color:#ffffff30;font-size:11px;text-align:center;margin-top:24px;line-height:1.5;">
      Ce lien est personnel, ne le partagez pas.<br/>
      En cas de problème, contactez l'organisateur.
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

// ─── Health check report email ───

export function healthCheckEmail({
  checks,
  summary,
  globalStatus,
  dbSizeBytes,
  dbLimitBytes,
  totalStorageBytes,
  storageLimitBytes,
  tables,
  buckets,
  pushByRole,
  emailCount,
  adminUrl,
}: {
  checks: { category: string; label: string; status: 'ok' | 'warn' | 'ko'; value: string; detail?: string }[]
  summary: { ok: number; warn: number; ko: number; total: number }
  globalStatus: 'ok' | 'warn' | 'ko'
  dbSizeBytes: number
  dbLimitBytes: number
  totalStorageBytes: number
  storageLimitBytes: number
  tables: { name: string; rows: number }[]
  buckets: { id: string; files: number; bytes: number }[]
  pushByRole: Record<string, number>
  emailCount: number
  adminUrl: string
}) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

  const statusMeta = {
    ok: { label: 'TOUT EST OK', color: '#7ec850', emoji: '\u2705' },
    warn: { label: 'ATTENTION', color: '#f59e0b', emoji: '\u26a0\ufe0f' },
    ko: { label: 'PROBL\u00c8MES', color: '#ef4444', emoji: '\u274c' },
  }
  const meta = statusMeta[globalStatus]

  const statusIcon = (s: 'ok' | 'warn' | 'ko') =>
    s === 'ok' ? '\u2705' : s === 'warn' ? '\u26a0\ufe0f' : '\u274c'

  const formatMB = (b: number) => (b / (1024 * 1024)).toFixed(1)
  const dbPct = (dbSizeBytes / dbLimitBytes * 100).toFixed(1)
  const storagePct = (totalStorageBytes / storageLimitBytes * 100).toFixed(1)

  const bar = (pct: number, color: string) => `
    <div style="background:#0d0b1a;border-radius:4px;height:8px;width:100%;overflow:hidden;">
      <div style="background:${color};height:100%;width:${Math.min(pct, 100)}%;border-radius:4px;"></div>
    </div>`

  const categories = [...new Set(checks.map(c => c.category))]

  const categoryRows = categories.map(cat => {
    const catChecks = checks.filter(c => c.category === cat)
    const catOk = catChecks.every(c => c.status === 'ok')
    const catKo = catChecks.some(c => c.status === 'ko')
    const catStatus: 'ok' | 'warn' | 'ko' = catKo ? 'ko' : catOk ? 'ok' : 'warn'
    const rows = catChecks.map(c => `
      <tr style="border-bottom:1px solid #2a2545;">
        <td style="padding:6px 0;color:#ffffffcc;font-size:12px;">${statusIcon(c.status)} ${escapeHtml(c.label)}</td>
        <td style="padding:6px 0;text-align:right;color:#ffffff80;font-size:12px;">${escapeHtml(c.value)}</td>
      </tr>`).join('')

    return `
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <tr>
          <td><p style="color:#ffffff;font-size:14px;font-weight:bold;margin:0;">${escapeHtml(cat)}</p></td>
          <td style="text-align:right;">
            <span style="background:${statusMeta[catStatus].color}22;color:${statusMeta[catStatus].color};font-size:11px;font-weight:bold;padding:3px 10px;border-radius:12px;">
              ${catChecks.filter(c => c.status === 'ok').length}/${catChecks.length} OK
            </span>
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        ${rows}
      </table>
    </div>`
  }).join('')

  const totalPush = Object.values(pushByRole).reduce((a, b) => a + b, 0)

  const subject = `${meta.emoji} Checkup site \u2014 ${meta.label}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0d0b1a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:bold;">
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Sc\u00e8ne</span>
      </span>
    </div>

    <div style="background:linear-gradient(135deg,#1e1744,#2a1f5e);border:1px solid #3a3070;border-radius:16px;padding:24px;margin-bottom:16px;">
      <h1 style="color:#ffffff;font-size:20px;margin:0 0 6px 0;">Checkup complet du site</h1>
      <p style="color:#ffffff60;font-size:13px;margin:0;">${today}</p>
      <div style="margin-top:16px;text-align:center;">
        <span style="display:inline-block;background:${meta.color}22;color:${meta.color};font-size:16px;font-weight:bold;padding:8px 20px;border-radius:24px;border:2px solid ${meta.color}44;">
          ${meta.emoji} ${meta.label}
        </span>
      </div>
    </div>

    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#7ec850;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">Synth\u00e8se</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#7ec850;font-size:24px;font-weight:bold;">${summary.ok}</div>
              <div style="color:#ffffff40;font-size:9px;">OK</div>
            </div>
          </td>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#f59e0b;font-size:24px;font-weight:bold;">${summary.warn}</div>
              <div style="color:#ffffff40;font-size:9px;">Warnings</div>
            </div>
          </td>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#ef4444;font-size:24px;font-weight:bold;">${summary.ko}</div>
              <div style="color:#ffffff40;font-size:9px;">Erreurs</div>
            </div>
          </td>
          <td style="width:25%;padding:4px;text-align:center;">
            <div style="background:#0d0b1a;border-radius:10px;padding:10px 4px;">
              <div style="color:#8b5cf6;font-size:24px;font-weight:bold;">${summary.total}</div>
              <div style="color:#ffffff40;font-size:9px;">Tests</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Quotas Supabase</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <tr>
          <td style="padding:3px 0;color:#ffffffcc;font-size:12px;width:50px;">BDD</td>
          <td style="padding:3px 0;">${bar(parseFloat(dbPct), parseFloat(dbPct) < 50 ? '#7ec850' : parseFloat(dbPct) < 80 ? '#f59e0b' : '#ef4444')}</td>
          <td style="padding:3px 0;color:#ffffff80;font-size:11px;width:120px;text-align:right;">${formatMB(dbSizeBytes)} / 500 MB</td>
        </tr>
        <tr>
          <td style="padding:3px 0;color:#ffffffcc;font-size:12px;">Storage</td>
          <td style="padding:3px 0;">${bar(parseFloat(storagePct), parseFloat(storagePct) < 50 ? '#3b82f6' : parseFloat(storagePct) < 80 ? '#f59e0b' : '#ef4444')}</td>
          <td style="padding:3px 0;color:#ffffff80;font-size:11px;text-align:right;">${formatMB(totalStorageBytes)} / 1 GB</td>
        </tr>
      </table>
      ${buckets.map(b => `
      <div style="padding:2px 0;font-size:11px;color:#ffffff60;">
        ${escapeHtml(b.id)} : ${b.files} fichiers \u2014 ${formatMB(b.bytes)} MB
      </div>`).join('')}
    </div>

    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Audience</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr style="border-bottom:1px solid #2a2545;">
          <td style="padding:6px 0;color:#ffffffcc;">Push total</td>
          <td style="text-align:right;color:#e91e8c;font-weight:bold;">${totalPush}</td>
        </tr>
        ${Object.entries(pushByRole).map(([role, count]) => `
        <tr style="border-bottom:1px solid #2a2545;">
          <td style="padding:4px 0 4px 16px;color:#ffffff80;font-size:11px;">${escapeHtml(role)}</td>
          <td style="text-align:right;color:#ffffff60;font-size:11px;">${count}</td>
        </tr>`).join('')}
        <tr>
          <td style="padding:6px 0;color:#ffffffcc;">Email actifs</td>
          <td style="text-align:right;color:#ec4899;font-weight:bold;">${emailCount}</td>
        </tr>
      </table>
    </div>

    ${categoryRows}

    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:20px;margin-bottom:12px;">
      <p style="color:#ffffff;font-size:13px;font-weight:bold;margin:0 0 14px 0;">Tables principales</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        ${tables.map(t => `
        <tr style="border-bottom:1px solid #1e1744;">
          <td style="padding:3px 0;color:#ffffff80;font-family:monospace;">${escapeHtml(t.name)}</td>
          <td style="padding:3px 0;color:#ffffff60;text-align:right;font-family:monospace;">${t.rows.toLocaleString('fr-FR')}</td>
        </tr>`).join('')}
      </table>
    </div>

    <div style="text-align:center;margin:20px 0 16px 0;">
      <a href="${adminUrl}" style="display:inline-block;padding:14px 40px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
        Ouvrir l'infra
      </a>
    </div>

    <p style="color:#ffffff25;font-size:10px;text-align:center;line-height:1.5;margin:0;">
      ChanteEnSc\u00e8ne \u2014 Checkup automatique<br/>
      G\u00e9n\u00e9r\u00e9 le ${today}
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}
