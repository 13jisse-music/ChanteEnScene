'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogoRing from '@/components/LogoRing'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error('Email ou mot de passe incorrect.')
      }

      // Verify admin access
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('email', email.toLowerCase())
        .single()

      if (!adminUser) {
        await supabase.auth.signOut()
        throw new Error('Accès non autorisé.')
      }

      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block">
            <LogoRing size={60} />
          </div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl mt-4 text-white/80">
            Administration
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c] focus:ring-1 focus:ring-[#e91e8c]/30 transition-colors"
              placeholder="admin@chantenscene.fr"
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1.5">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1533] border border-[#2a2545] rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e91e8c] focus:ring-1 focus:ring-[#e91e8c]/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}
