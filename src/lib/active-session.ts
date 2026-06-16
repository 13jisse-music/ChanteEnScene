import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'

// Ciblage de la session pilotee par l'admin/regie.
//
// En production : aucune variable definie, comportement historique conserve
// (session active la plus recente, ou la plus recente par annee selon la page).
// En repetition locale grandeur nature : TEST_SESSION_ID est definie UNIQUEMENT
// dans l'environnement local, et force toute la regie a viser la session de test.
// La variable n'est jamais posee en prod ni sur un deploiement Vercel.

export function getTestSessionId(): string | null {
  return process.env.TEST_SESSION_ID || null
}

// Resout la session que la regie doit cibler, et renvoie la reponse Supabase
// .single() (data vaut null si aucune session trouvee).
// fallback : choix du critere quand TEST_SESSION_ID est absente.
//  - "active" (defaut) : session active la plus recente (is_active=true)
//  - "latest" : session la plus recente par annee (pages resultats / jury)
export async function getActiveSession<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  columns: string = '*',
  opts: { fallback?: 'active' | 'latest' } = {},
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const testId = getTestSessionId()
  const base = supabase.from('sessions').select(columns)

  const builder = testId
    ? base.eq('id', testId)
    : opts.fallback === 'latest'
      ? base.order('year', { ascending: false }).limit(1)
      : base.eq('is_active', true).order('year', { ascending: false }).limit(1)

  const { data, error } = await builder.single()

  // Supabase ne peut pas inferer le type des colonnes passees en chaine dynamique
  // (il renvoie GenericStringError). On caste vers le type attendu par l'appelant,
  // equivalent au typage permissif des requetes inline d'origine.
  return { data: (data as unknown as T) ?? null, error }
}
