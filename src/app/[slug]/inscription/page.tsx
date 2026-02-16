import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InscriptionForm from '@/components/InscriptionForm'
import RegistrationCountdown from '@/components/RegistrationCountdown'
import Link from 'next/link'
import Image from 'next/image'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select('name')
    .eq('slug', slug)
    .single()

  return {
    title: session ? `Inscription — ${session.name}` : 'Inscription — ChanteEnScène',
  }
}

export default async function InscriptionPage({ params }: { params: Params }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!session) notFound()

  const config = session.config as Record<string, unknown>
  const regStart = config.registration_start as string | undefined
  const regEnd = config.registration_end as string | undefined

  const now = new Date()
  const startDate = regStart ? new Date(regStart) : null
  const endDate = regEnd ? new Date(regEnd) : null
  // End date should include the entire day
  if (endDate) endDate.setHours(23, 59, 59, 999)

  // Status is the authority: if status says registration_open, inscriptions are open
  const statusAllowsRegistration = session.status === 'registration_open' || session.status === 'draft'
  const isBeforeStart = statusAllowsRegistration && startDate && now < startDate
  const isOpen = statusAllowsRegistration && !isBeforeStart

  // Determine the reason for being closed (for the right message)
  const isPast = !statusAllowsRegistration && (session.status !== 'draft')

  return (
    <main className="relative min-h-screen py-8 px-4">
      {/* Hero background — z-1 to sit above BokehBackground (z-0) */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <Image
          src="/images/hero.png"
          alt=""
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-[#0a0618]/40" />
      </div>
      <div className="relative z-[2] max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-10 animate-fade-up">
          <h1
            className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl md:text-4xl text-white mt-2 sm:mt-6 mb-1 sm:mb-2"
            style={{ textShadow: '0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)' }}
          >
            <span className="text-gradient-gold" style={{ textShadow: 'none' }}>Inscription</span>
          </h1>
          <p
            className="text-white text-xs sm:text-sm"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
          >
            {session.name}
          </p>
        </div>

        {isOpen ? (
          <InscriptionForm session={session} />
        ) : isBeforeStart && regStart ? (
          <RegistrationCountdown targetDate={regStart} sessionSlug={session.slug} />
        ) : (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-5xl mb-4">{isPast ? '⏰' : '🔒'}</div>
            <p
              className="text-white text-lg font-medium"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
            >
              {isPast
                ? 'Les inscriptions sont closes.'
                : 'Les inscriptions ne sont pas disponibles.'}
            </p>
            {isPast && endDate && (
              <p
                className="text-white/70 text-sm mt-2"
                style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}
              >
                Les inscriptions ont ferm&eacute; le{' '}
                {endDate.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
            <Link
              href={`/${session.slug}`}
              className="inline-block mt-8 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all"
            >
              Retour &agrave; l&apos;accueil
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
