'use client'

import { useState } from 'react'
import {
  createFaqEntry,
  updateFaqEntry,
  toggleFaqEntry,
  deleteFaqEntry,
  seedDefaultFaqs,
} from '@/app/admin/chatbot/actions'

interface FaqEntry {
  id: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

interface Props {
  sessionId: string
  faqs: FaqEntry[]
}

export default function ChatbotAdmin({ sessionId, faqs: initialFaqs }: Props) {
  const [faqs, setFaqs] = useState(initialFaqs)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newQ.trim() || !newA.trim()) return
    setLoading(true)
    setError(null)
    const result = await createFaqEntry(sessionId, newQ.trim(), newA.trim())
    if (result.error) {
      setError(result.error)
    } else {
      setNewQ('')
      setNewA('')
      setShowCreate(false)
      window.location.reload()
    }
    setLoading(false)
  }

  async function handleUpdate(id: string, question: string, answer: string) {
    setLoading(true)
    const result = await updateFaqEntry(id, question, answer)
    if (result.error) setError(result.error)
    else {
      setEditingId(null)
      window.location.reload()
    }
    setLoading(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    await toggleFaqEntry(id, isActive)
    setFaqs((prev) => prev.map((f) => f.id === id ? { ...f, is_active: isActive } : f))
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette question ?')) return
    const result = await deleteFaqEntry(id)
    if (result.error) setError(result.error)
    else setFaqs((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            Chatbot FAQ
          </h1>
          <p className="text-white/40 text-sm">Gérez les questions/réponses du chatbot public</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (faqs.length > 0 && !confirm('Cela va remplacer toutes les FAQ actuelles par les 20 FAQ par défaut. Continuer ?')) return
              setLoading(true)
              setError(null)
              const result = await seedDefaultFaqs(sessionId)
              if (result.error) setError(result.error)
              else window.location.reload()
              setLoading(false)
            }}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loading ? 'Chargement...' : faqs.length > 0 ? 'Réinitialiser FAQ (20 Q/R)' : 'FAQ par défaut (20 Q/R)'}
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all"
          >
            + Nouvelle Q/R
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-base">Nouvelle question/réponse</h2>
          <div>
            <label className="text-white/40 text-xs block mb-1">Question</label>
            <input
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Comment s'inscrire au concours ?"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs block mb-1">Réponse</label>
            <textarea
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              placeholder="Pour vous inscrire, rendez-vous sur la page d'inscription..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-white/40 bg-white/5 border border-white/10"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !newQ.trim() || !newA.trim()}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] disabled:opacity-50"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* FAQ list */}
      <div className="space-y-3">
        {faqs.map((faq) => (
          <FaqItem
            key={faq.id}
            faq={faq}
            isEditing={editingId === faq.id}
            loading={loading}
            onEdit={() => setEditingId(faq.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(q, a) => handleUpdate(faq.id, q, a)}
            onToggle={(active) => handleToggle(faq.id, active)}
            onDelete={() => handleDelete(faq.id)}
          />
        ))}

        {faqs.length === 0 && (
          <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-12 text-center">
            <p className="text-white/30 text-sm">Aucune question/réponse. Ajoutez des FAQ pour le chatbot.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FaqItem({
  faq,
  isEditing,
  loading,
  onEdit,
  onCancelEdit,
  onSave,
  onToggle,
  onDelete,
}: {
  faq: FaqEntry
  isEditing: boolean
  loading: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (q: string, a: string) => void
  onToggle: (active: boolean) => void
  onDelete: () => void
}) {
  const [q, setQ] = useState(faq.question)
  const [a, setA] = useState(faq.answer)

  if (isEditing) {
    return (
      <div className="bg-[#161228] border border-[#e91e8c]/30 rounded-2xl p-5 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none"
        />
        <textarea
          value={a}
          onChange={(e) => setA(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white focus:border-[#e91e8c]/50 focus:outline-none resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg text-xs text-white/40 bg-white/5 border border-white/10">
            Annuler
          </button>
          <button
            onClick={() => onSave(q, a)}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#e91e8c] disabled:opacity-50"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#161228] border border-[#2a2545] rounded-2xl p-5 ${!faq.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white mb-1">{faq.question}</p>
          <p className="text-xs text-white/50 whitespace-pre-wrap">{faq.answer}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(!faq.is_active)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              faq.is_active
                ? 'bg-[#7ec850]/10 text-[#7ec850]'
                : 'bg-white/5 text-white/30'
            }`}
          >
            {faq.is_active ? 'Actif' : 'Inactif'}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 bg-white/5 border border-white/10"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded-lg text-xs text-red-400/50 hover:text-red-400 bg-white/5 border border-white/10"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

interface FaqEntry {
  id: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}
