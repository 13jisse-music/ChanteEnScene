export const SESSION_STATUSES = [
  'draft',
  'registration_open',
  'registration_closed',
  'semifinal',
  'final',
  'archived',
] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export const STATUS_CONFIG: Record<
  SessionStatus,
  {
    label: string
    color: string
    icon: string
    description: string
    nextLabel?: string
  }
> = {
  draft: {
    label: 'Brouillon',
    color: '#9ca3af',
    icon: '📝',
    description: 'Session en préparation',
    nextLabel: 'Ouvrir les inscriptions',
  },
  registration_open: {
    label: 'Inscriptions ouvertes',
    color: '#7ec850',
    icon: '📋',
    description: "Les candidats peuvent s'inscrire",
    nextLabel: 'Clôturer les inscriptions',
  },
  registration_closed: {
    label: 'Inscriptions fermées',
    color: '#f59e0b',
    icon: '🔒',
    description: 'Inscriptions terminées, évaluations jury en cours',
    nextLabel: 'Passer en demi-finale',
  },
  semifinal: {
    label: 'Demi-finale',
    color: '#8b5cf6',
    icon: '🎤',
    description: 'Demi-finale en cours',
    nextLabel: 'Passer à la finale',
  },
  final: {
    label: 'Finale',
    color: '#e91e8c',
    icon: '🏟️',
    description: 'Grande finale en cours',
    nextLabel: 'Archiver la session',
  },
  archived: {
    label: 'Archivée',
    color: '#6b7280',
    icon: '📦',
    description: 'Session terminée et archivée',
  },
}

export function getStatusIndex(status: string): number {
  return SESSION_STATUSES.indexOf(status as SessionStatus)
}

export function getNextStatus(current: string): SessionStatus | null {
  const idx = getStatusIndex(current)
  if (idx < 0 || idx >= SESSION_STATUSES.length - 1) return null
  return SESSION_STATUSES[idx + 1]
}

export function isStatusAtOrPast(current: string, target: SessionStatus): boolean {
  return getStatusIndex(current) >= getStatusIndex(target)
}

export function isStatusBefore(current: string, target: SessionStatus): boolean {
  return getStatusIndex(current) < getStatusIndex(target)
}

/**
 * Default push notification messages sent automatically when a phase transition occurs.
 * These can be overridden per-session via config.custom_phase_notifications[phase].
 */
export const PHASE_PUSH_MESSAGES: Partial<Record<SessionStatus, { title: string; body: string }>> = {
  registration_open: {
    title: 'Les inscriptions sont ouvertes !',
    body: 'Inscrivez-vous dès maintenant au concours ChanteEnScène 🎤',
  },
  registration_closed: {
    title: 'Inscriptions fermées — Votes ouverts !',
    body: 'Découvrez les candidats et votez pour vos favoris ❤️',
  },
  semifinal: {
    title: 'La demi-finale commence !',
    body: 'Suivez la demi-finale en direct sur l\'app 🌟',
  },
  final: {
    title: 'C\'est la finale !',
    body: 'Qui sera le grand gagnant ? Suivez la finale en direct 🏆',
  },
}

/**
 * Maps session status to homepage timeline step index (0-4).
 * 0 = avant inscriptions, 1 = inscriptions, 2 = sélections/jury,
 * 3 = demi-finale, 4 = grande finale
 */
export function statusToTimelineStep(status: string): number {
  switch (status) {
    case 'draft':
      return 0
    case 'registration_open':
      return 1
    case 'registration_closed':
      return 2
    case 'semifinal':
      return 3
    case 'final':
    case 'archived':
      return 4
    default:
      return 0
  }
}
