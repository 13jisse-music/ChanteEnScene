'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPost, updatePost, deletePost, togglePublish } from './actions'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image: string | null
  published: boolean
  author: string
  tags: string[]
  created_at: string
  updated_at: string
}

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  tags: '',
  featured_image: '',
  published: false,
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function loadPosts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })

    setPosts((data as BlogPost[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPosts()
  }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  function startEdit(post: BlogPost) {
    setForm({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      tags: post.tags.join(', '),
      featured_image: post.featured_image || '',
      published: post.published,
    })
    setEditingId(post.id)
    setShowForm(true)
    setError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    let result
    if (editingId) {
      result = await updatePost(
        editingId,
        form.title,
        form.excerpt || null,
        form.content,
        tags,
        form.featured_image || null,
        form.published
      )
    } else {
      result = await createPost(
        form.title,
        form.excerpt || null,
        form.content,
        tags,
        form.featured_image || null,
        form.published
      )
    }

    setSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(editingId ? 'Article mis a jour' : 'Article cree')
      resetForm()
      loadPosts()
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  async function handleDelete(id: string) {
    const result = await deletePost(id)
    setDeleteConfirm(null)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Article supprime')
      loadPosts()
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  async function handleTogglePublish(id: string, currentlyPublished: boolean) {
    const result = await togglePublish(id, !currentlyPublished)
    if (result.error) {
      setError(result.error)
    } else {
      loadPosts()
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl text-white">
            Blog
          </h1>
          <p className="text-[#6b5d85] text-sm mt-0.5">
            {posts.length} article{posts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 bg-[#e91e8c] hover:bg-[#d4177f] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvel article
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[#7ec850]/10 border border-[#7ec850]/30 text-[#7ec850] text-sm px-4 py-3 rounded-xl mb-4">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-6 mb-6 space-y-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white">
              {editingId ? 'Modifier l\u2019article' : 'Nouvel article'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-[#6b5d85] hover:text-white text-sm transition-colors"
            >
              Annuler
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-[#a899c2] mb-1.5">Titre *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titre de l'article"
              className="w-full bg-[#0d0b1a] border border-[#2a2545] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#e91e8c] transition-colors placeholder:text-[#6b5d85]"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs text-[#a899c2] mb-1.5">
              Extrait <span className="text-[#6b5d85]">(affiché dans la liste)</span>
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Résumé court de l'article..."
              rows={2}
              className="w-full bg-[#0d0b1a] border border-[#2a2545] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#e91e8c] transition-colors placeholder:text-[#6b5d85] resize-y"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-[#a899c2] mb-1.5">
              Contenu * <span className="text-[#6b5d85]">(HTML autorisé : &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;a&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;blockquote&gt;, &lt;img&gt;)</span>
            </label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="<h2>Introduction</h2>&#10;<p>Le contenu de votre article...</p>"
              rows={12}
              className="w-full bg-[#0d0b1a] border border-[#2a2545] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#e91e8c] transition-colors placeholder:text-[#6b5d85] resize-y font-mono"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-[#a899c2] mb-1.5">
              Tags <span className="text-[#6b5d85]">(séparés par des virgules)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="chant, technique, concours"
              className="w-full bg-[#0d0b1a] border border-[#2a2545] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#e91e8c] transition-colors placeholder:text-[#6b5d85]"
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-xs text-[#a899c2] mb-1.5">
              Image de couverture <span className="text-[#6b5d85]">(URL)</span>
            </label>
            <input
              type="url"
              value={form.featured_image}
              onChange={(e) => setForm({ ...form, featured_image: e.target.value })}
              placeholder="https://..."
              className="w-full bg-[#0d0b1a] border border-[#2a2545] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#e91e8c] transition-colors placeholder:text-[#6b5d85]"
            />
          </div>

          {/* Publish toggle + Submit */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="w-4 h-4 rounded border-[#2a2545] bg-[#0d0b1a] text-[#e91e8c] focus:ring-[#e91e8c] focus:ring-offset-0"
              />
              <span className="text-sm text-[#a899c2]">Publier immédiatement</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#e91e8c] hover:bg-[#d4177f] disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enregistrement...
                </>
              ) : editingId ? (
                'Mettre a jour'
              ) : (
                'Creer l\u2019article'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="text-center py-12 text-[#6b5d85]">Chargement...</div>
      ) : posts.length === 0 ? (
        <div className="bg-[#161228]/80 border border-[#2a2545] rounded-2xl p-12 text-center">
          <p className="text-[#6b5d85]">Aucun article pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-[#161228]/80 border border-[#2a2545] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {/* Thumbnail */}
              {post.featured_image && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0d0b1a] shrink-0 hidden sm:block">
                  <img
                    src={post.featured_image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-white truncate">
                    {post.title}
                  </h3>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      post.published
                        ? 'bg-[#7ec850]/15 text-[#7ec850]'
                        : 'bg-[#f5a623]/15 text-[#f5a623]'
                    }`}
                  >
                    {post.published ? 'Publie' : 'Brouillon'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6b5d85]">
                  <span>/blog/{post.slug}</span>
                  <span>
                    {new Date(post.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {post.tags.length > 0 && (
                    <span className="text-[#e91e8c]/60">
                      {post.tags.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTogglePublish(post.id, post.published)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    post.published
                      ? 'bg-[#f5a623]/10 text-[#f5a623] hover:bg-[#f5a623]/20'
                      : 'bg-[#7ec850]/10 text-[#7ec850] hover:bg-[#7ec850]/20'
                  }`}
                  title={post.published ? 'Depublier' : 'Publier'}
                >
                  {post.published ? 'Depublier' : 'Publier'}
                </button>

                <button
                  onClick={() => startEdit(post)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-[#a899c2] hover:text-white hover:bg-white/10 transition-colors"
                >
                  Modifier
                </button>

                {deleteConfirm === post.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1.5 text-[#6b5d85] hover:text-white transition-colors"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(post.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Supprimer
                  </button>
                )}

                {post.published && (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1.5 text-[#6b5d85] hover:text-[#e91e8c] transition-colors"
                    title="Voir l'article"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
