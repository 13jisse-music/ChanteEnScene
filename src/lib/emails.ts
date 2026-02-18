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
}: {
  candidateName: string
  sessionName: string
  profileUrl: string
}) {
  const safeName = escapeHtml(candidateName)
  const safeSession = escapeHtml(sessionName)
  const subject = `Candidature validée — ${sessionName}`

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
      <h1 style="color:#7ec850;font-size:20px;margin:0 0 8px 0;text-align:center;">
        Candidature validée !
      </h1>
      <p style="color:#ffffff99;font-size:14px;line-height:1.6;margin:0 0 24px 0;text-align:center;">
        Félicitations <strong style="color:#ffffff;">${safeName}</strong> !<br/>
        Votre candidature pour <strong style="color:#ffffff;">${safeSession}</strong> a été approuvée.
      </p>

      <div style="background:rgba(126,200,80,0.1);border:1px solid rgba(126,200,80,0.25);border-radius:12px;padding:16px;margin:0 0 24px 0;">
        <p style="color:#7ec850;font-size:13px;line-height:1.6;margin:0;text-align:center;">
          Votre profil est maintenant visible sur le site.<br/>
          Le public et le jury en ligne peuvent voter pour vous !
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:24px 0 0 0;">
        <a href="${profileUrl}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
          Voir mon profil
        </a>
      </div>

      <p style="color:#ffffff50;font-size:12px;line-height:1.6;margin:24px 0 0 0;text-align:center;">
        N'hésitez pas à partager votre profil avec vos proches pour récolter un maximum de votes !
      </p>
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
  period,
  totalCandidates,
  newCandidates,
  totalVotes,
  newVotes,
  pwaInstalls,
  pushSubscriptions,
  recentCandidateNames,
  adminUrl,
}: {
  sessionName: string
  period: string
  totalCandidates: number
  newCandidates: number
  totalVotes: number
  newVotes: number
  pwaInstalls: number
  pushSubscriptions: number
  recentCandidateNames: { name: string; category: string }[]
  adminUrl: string
}) {
  const subject = `Rapport ${period} — ${sessionName}`

  const safeSessionName = escapeHtml(sessionName)
  const safePeriod = escapeHtml(period)

  const candidateRows = recentCandidateNames.slice(0, 5).map((c) => `
    <tr>
      <td style="padding:6px 0;color:#ffffff;font-size:13px;">${escapeHtml(c.name)}</td>
      <td style="padding:6px 0;color:#e91e8c;font-size:12px;text-align:right;">${escapeHtml(c.category)}</td>
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
        <span style="color:#ffffff;">Chant</span><span style="color:#7ec850;">En</span><span style="color:#e91e8c;">Scène</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#161228;border:1px solid #2a2545;border-radius:16px;padding:32px;">
      <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px 0;">
        Rapport ${safePeriod}
      </h1>
      <p style="color:#ffffff99;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Voici les chiffres pour <strong style="color:#ffffff;">${safeSessionName}</strong>.
      </p>

      <!-- Stats Grid -->
      <div style="margin:0 0 24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:50%;padding:8px;">
              <div style="background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
                <div style="color:#e91e8c;font-size:28px;font-weight:bold;">${totalCandidates}</div>
                <div style="color:#ffffff50;font-size:11px;">Candidats</div>
                ${newCandidates > 0 ? `<div style="color:#7ec850;font-size:11px;">+${newCandidates} nouveau${newCandidates > 1 ? 'x' : ''}</div>` : ''}
              </div>
            </td>
            <td style="width:50%;padding:8px;">
              <div style="background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
                <div style="color:#3b82f6;font-size:28px;font-weight:bold;">${totalVotes}</div>
                <div style="color:#ffffff50;font-size:11px;">Votes</div>
                ${newVotes > 0 ? `<div style="color:#7ec850;font-size:11px;">+${newVotes} nouveau${newVotes > 1 ? 'x' : ''}</div>` : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td style="width:50%;padding:8px;">
              <div style="background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
                <div style="color:#10b981;font-size:28px;font-weight:bold;">${pwaInstalls}</div>
                <div style="color:#ffffff50;font-size:11px;">Installations PWA</div>
              </div>
            </td>
            <td style="width:50%;padding:8px;">
              <div style="background:#0d0b1a;border-radius:12px;padding:16px;text-align:center;">
                <div style="color:#f97316;font-size:28px;font-weight:bold;">${pushSubscriptions}</div>
                <div style="color:#ffffff50;font-size:11px;">Notifications</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      ${recentCandidateNames.length > 0 ? `
      <!-- Recent candidates -->
      <div style="background:#0d0b1a;border-radius:12px;padding:16px;margin:0 0 24px 0;">
        <p style="color:#f5a623;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">
          Dernières inscriptions
        </p>
        <table style="width:100%;border-collapse:collapse;">
          ${candidateRows}
        </table>
        ${recentCandidateNames.length > 5 ? `<p style="color:#ffffff30;font-size:11px;margin:8px 0 0 0;">...et ${recentCandidateNames.length - 5} de plus</p>` : ''}
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 0 0;">
        <a href="${adminUrl}" style="display:inline-block;padding:14px 32px;background:#e91e8c;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:bold;">
          Voir le dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="color:#ffffff30;font-size:11px;text-align:center;margin-top:24px;line-height:1.5;">
      ChanteEnScène — Rapport automatique ${safePeriod}
    </p>
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
