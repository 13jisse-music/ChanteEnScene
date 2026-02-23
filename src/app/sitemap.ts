import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const baseUrl = 'https://www.chantenscene.fr'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/palmares`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${baseUrl}/editions`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/presse`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/mentions-legales`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/reglement`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Dynamic session pages
  const { data: sessions } = await supabase
    .from('sessions')
    .select('slug, updated_at')
    .in('status', ['registration_open', 'registration_closed', 'semifinal', 'final', 'archived'])

  const sessionPages: MetadataRoute.Sitemap = (sessions || []).flatMap((s) => [
    { url: `${baseUrl}/${s.slug}`, lastModified: s.updated_at ? new Date(s.updated_at) : new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/${s.slug}/candidats`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/${s.slug}/galerie`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/${s.slug}/inscription`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/${s.slug}/partenaires`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/${s.slug}/partenaires/dossier`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
  ])

  // Candidate profile pages
  const { data: candidates } = await supabase
    .from('candidates')
    .select('slug, session_id, updated_at, sessions:session_id (slug)')
    .eq('status', 'approved')

  const candidatePages: MetadataRoute.Sitemap = (candidates || [])
    .filter((c: any) => c.sessions?.slug)
    .map((c: any) => ({
      url: `${baseUrl}/${c.sessions.slug}/candidats/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  return [...staticPages, ...sessionPages, ...candidatePages]
}
