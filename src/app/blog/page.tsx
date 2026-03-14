import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const revalidate = 600 // revalidate every 10 minutes

export const metadata = {
  title: 'Blog — ChanteEnScene',
  description:
    'Conseils chant, astuces scène, coulisses du concours ChanteEnScene. Retrouvez nos articles pour progresser et vivre votre passion.',
  openGraph: {
    title: 'Blog — ChanteEnScene',
    description:
      'Conseils chant, astuces scène, coulisses du concours ChanteEnScene.',
    url: 'https://www.chantenscene.fr/blog',
    siteName: 'ChanteEnScene',
    type: 'website',
  },
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  tags: string[]
  author: string
  created_at: string
}

export default async function BlogPage() {
  const supabase = createAdminClient()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, tags, author, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <section className="relative z-10 py-8 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-3"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          Blog
        </h1>
        <p className="text-[#a899c2] text-sm max-w-lg mx-auto">
          Conseils, astuces et coulisses du concours ChanteEnSc&egrave;ne
        </p>
      </div>

      {(!posts || posts.length === 0) ? (
        /* Empty state */
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#e91e8c]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[#e91e8c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </div>
          <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white mb-2">
            Articles &agrave; venir
          </h2>
          <p className="text-[#a899c2] text-sm max-w-md mx-auto">
            Nous pr&eacute;parons des articles sur le chant, la sc&egrave;ne et les coulisses du concours.
            Revenez bient&ocirc;t !
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-6 text-sm text-[#e91e8c] hover:text-[#ff6b9d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Retour &agrave; l&apos;accueil
          </Link>
        </div>
      ) : (
        /* Articles grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(posts as BlogPost[]).map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-[#161228]/80 border border-[#2a2545] rounded-2xl overflow-hidden hover:border-[#e91e8c]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#e91e8c]/5"
            >
              {/* Featured image */}
              {post.featured_image ? (
                <div className="aspect-video overflow-hidden bg-[#0d0b1a]">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-[#e91e8c]/20 to-[#7ec850]/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#e91e8c]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                  </svg>
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#e91e8c]/10 text-[#e91e8c]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white mb-2 line-clamp-2 group-hover:text-[#e91e8c] transition-colors">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="text-[#a899c2] text-sm line-clamp-3 mb-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-[#6b5d85]">
                  <span>{post.author}</span>
                  <time dateTime={post.created_at}>
                    {new Date(post.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
