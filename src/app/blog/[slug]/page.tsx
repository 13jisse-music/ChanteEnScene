import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import type { Metadata } from 'next'

export const revalidate = 600

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image: string | null
  tags: string[]
  author: string
  created_at: string
  updated_at: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, featured_image')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (!post) {
    return { title: 'Article introuvable — ChanteEnScene' }
  }

  return {
    title: `${post.title} — ChanteEnScene`,
    description: post.excerpt || `${post.title} — Blog ChanteEnScene`,
    openGraph: {
      title: post.title,
      description: post.excerpt || `${post.title} — Blog ChanteEnScene`,
      url: `https://www.chantenscene.fr/blog/${slug}`,
      siteName: 'ChanteEnScene',
      type: 'article',
      ...(post.featured_image && { images: [{ url: post.featured_image }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
      ...(post.featured_image && { images: [post.featured_image] }),
    },
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (!post) notFound()

  const article = post as BlogPost

  // Convert markdown content to HTML
  const htmlContent = await marked(article.content, { breaks: true })

  // Schema.org structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || undefined,
    image: article.featured_image || undefined,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ChanteEnScene',
      url: 'https://www.chantenscene.fr',
    },
    datePublished: article.created_at,
    dateModified: article.updated_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.chantenscene.fr/blog/${article.slug}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="relative z-10 py-8 px-4 max-w-3xl mx-auto sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-[#a899c2] hover:text-[#e91e8c] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour au blog
        </Link>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full bg-[#e91e8c]/10 text-[#e91e8c]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-2xl md:text-4xl text-white mb-4 leading-tight"
          style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}
        >
          {article.title}
        </h1>

        {/* Author & Date */}
        <div className="flex items-center gap-3 text-sm text-[#6b5d85] mb-8">
          <span className="text-[#a899c2]">{article.author}</span>
          <span>&mdash;</span>
          <time dateTime={article.created_at}>
            {new Date(article.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </div>

        {/* Featured image */}
        {article.featured_image && (
          <div className="rounded-2xl overflow-hidden mb-10 border border-[#2a2545]">
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Article content */}
        <div className="bg-[#161228]/40 border border-[#2a2545]/50 rounded-2xl p-6 sm:p-8 lg:p-10">
        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-[family-name:var(--font-montserrat)] prose-headings:font-bold
            prose-h2:text-2xl prose-h2:text-white prose-h2:mt-12 prose-h2:mb-5 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[#2a2545]
            prose-h3:text-xl prose-h3:text-white/90 prose-h3:mt-10 prose-h3:mb-4
            prose-p:text-[#c4b8d9] prose-p:leading-[1.9] prose-p:mb-6 prose-p:text-base prose-p:text-justify
            prose-a:text-[#e91e8c] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-semibold
            prose-ul:text-[#c4b8d9] prose-ul:my-6 prose-ul:space-y-2
            prose-ol:text-[#c4b8d9] prose-ol:my-6 prose-ol:space-y-2
            prose-li:text-[#c4b8d9] prose-li:leading-relaxed prose-li:marker:text-[#e91e8c]
            prose-blockquote:border-l-4 prose-blockquote:border-[#e91e8c] prose-blockquote:bg-[#161228]/60 prose-blockquote:text-[#a899c2] prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:my-8 prose-blockquote:italic
            prose-code:text-[#7ec850] prose-code:bg-[#161228] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-img:rounded-xl prose-img:border prose-img:border-[#2a2545]"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        </div>

        {/* Footer separator */}
        <div className="border-t border-[#2a2545] mt-12 pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-[#e91e8c] hover:text-[#ff6b9d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Voir tous les articles
          </Link>
        </div>
      </article>
    </>
  )
}
