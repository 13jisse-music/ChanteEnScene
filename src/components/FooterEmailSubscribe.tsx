'use client'

import EmailSubscribeForm from './EmailSubscribeForm'

export default function FooterEmailSubscribe({ sessionId }: { sessionId: string }) {
  return (
    <section className="relative z-10 py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        <h2
          className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white mb-2"
          style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}
        >
          Restez inform&eacute;
        </h2>
        <p
          className="text-white/40 text-sm mb-6"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}
        >
          Recevez les dates, r&eacute;sultats et actualit&eacute;s du concours par email.
        </p>
        <EmailSubscribeForm sessionId={sessionId} source="footer" />
      </div>
    </section>
  )
}
