'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent } from '@/app/admin/events/actions'

export default function CreateEventButton({ sessionId, eventType, label }: {
  sessionId: string
  eventType: string
  label: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    const result = await createEvent(sessionId, eventType)
    if (result?.error) alert(result.error)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
    >
      {loading ? 'Création en cours...' : label}
    </button>
  )
}
