// Genere un identifiant unique. crypto.randomUUID n'existe que dans un contexte
// securise (HTTPS ou localhost) ; en repetition reseau local (HTTP), on retombe
// sur un fallback. En production (HTTPS), crypto.randomUUID est toujours utilise.
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function calculateAge(birthDate: string, referenceDate: string): number {
  const birth = new Date(birthDate)
  const ref = new Date(referenceDate)
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age
}

export function getCategory(
  birthDate: string,
  categories: { name: string; min_age: number; max_age: number }[],
  referenceDate: string
): string | null {
  const age = calculateAge(birthDate, referenceDate)
  const cat = categories.find((c) => age >= c.min_age && age <= c.max_age)
  return cat?.name ?? null
}
