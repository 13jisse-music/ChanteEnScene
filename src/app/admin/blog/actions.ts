'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/security'

/**
 * Generate a URL-friendly slug from a French title.
 * Removes accents, lowercases, replaces spaces/special chars with dashes.
 */
function generateSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
    .replace(/-{2,}/g, '-') // collapse multiple dashes
}

export async function createPost(
  title: string,
  excerpt: string | null,
  content: string,
  tags: string[],
  featuredImage: string | null,
  published: boolean
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const slug = generateSlug(title)

  const { error } = await supabase.from('blog_posts').insert({
    title,
    slug,
    excerpt: excerpt || null,
    content,
    tags,
    featured_image: featuredImage || null,
    published,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath('/sitemap.xml')
  return { success: true }
}

export async function updatePost(
  id: string,
  title: string,
  excerpt: string | null,
  content: string,
  tags: string[],
  featuredImage: string | null,
  published: boolean
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const slug = generateSlug(title)

  const { error } = await supabase
    .from('blog_posts')
    .update({
      title,
      slug,
      excerpt: excerpt || null,
      content,
      tags,
      featured_image: featuredImage || null,
      published,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath('/sitemap.xml')
  return { success: true }
}

export async function deletePost(id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('blog_posts').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath('/sitemap.xml')
  return { success: true }
}

export async function togglePublish(id: string, published: boolean) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('blog_posts')
    .update({ published, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath('/sitemap.xml')
  return { success: true }
}
