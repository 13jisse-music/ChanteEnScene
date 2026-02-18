'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FaqEntry {
  id: string
  question: string
  answer: string
}

interface Message {
  role: 'user' | 'bot'
  text: string
}

export default function ChatbotWidget() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [faqs, setFaqs] = useState<FaqEntry[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])

  // Hide on admin/jury pages
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/jury') || pathname.startsWith('/upload-mp3')

  useEffect(() => {
    if (!open || loaded) return

    async function loadFaqs() {
      const supabase = createClient()

      // Try active session first, fallback to most recent
      let { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .order('year', { ascending: false })
        .limit(1)
        .single()

      if (!session) {
        const { data: fallback } = await supabase
          .from('sessions')
          .select('id')
          .order('year', { ascending: false })
          .limit(1)
          .single()
        session = fallback
      }

      if (!session) return

      const { data } = await supabase
        .from('chatbot_faq')
        .select('id, question, answer')
        .eq('session_id', session.id)
        .eq('is_active', true)
        .order('sort_order')

      setFaqs(data || [])
      setLoaded(true)
      setMessages([
        {
          role: 'bot',
          text: 'Bonjour ! Je suis l\'assistant ChanteEnScene. Posez-moi une question ou choisissez un sujet ci-dessous.',
        },
      ])
    }

    loadFaqs()
  }, [open, loaded])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, ' ')
  }

  // French stopwords to ignore
  const STOPWORDS = new Set([
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
    'ce', 'ca', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
    'son', 'sa', 'ses', 'qui', 'que', 'quoi', 'dont', 'ou',
    'et', 'ou', 'mais', 'donc', 'car', 'ni', 'ne', 'pas', 'plus',
    'dans', 'sur', 'sous', 'avec', 'pour', 'par', 'en',
    'est', 'suis', 'es', 'sont', 'etre', 'avoir', 'ai', 'as', 'avons',
    'fait', 'faire', 'dit', 'dire', 'jai', 'j', 'y', 'a',
    'bien', 'tres', 'aussi', 'tout', 'tous', 'toute', 'toutes',
    'comment', 'quand', 'combien', 'quel', 'quelle', 'quels', 'quelles',
    'oui', 'non', 'merci', 'svp', 'sil',
  ])

  // Synonym groups - any word maps to its group for matching
  const SYNONYMS: Record<string, string[]> = {
    inscrire: ['inscrire', 'inscription', 'inscrits', 'participer', 'participation', 'candidater', 'candidature', 'postuler'],
    prix: ['prix', 'gagner', 'recompense', 'lot', 'lots', 'cadeau'],
    voter: ['voter', 'vote', 'votes', 'encourager', 'soutenir', 'soutien'],
    video: ['video', 'videos', 'film', 'filmer', 'enregistrer', 'enregistrement', 'format', 'mp4', 'mov', 'webm', 'clip', 'fichier', 'telephone', 'camera'],
    audio: ['audio', 'mp3', 'wav', 'son', 'musique', 'instrumental', 'instrumentale', 'bande', 'piste', 'accompagnement'],
    transfert: ['transfert', 'transferer', 'envoyer', 'envoi', 'upload', 'telecharger', 'televerser', 'charger', 'soumettre'],
    lourd: ['lourd', 'lourde', 'poids', 'taille', 'trop', 'gros', 'grosse', 'volumineux', 'mega', 'compresser', 'compression', 'reduire', 'redimensionner'],
    echoue: ['echoue', 'echec', 'erreur', 'bug', 'plante', 'bloque', 'marche', 'fonctionne', 'impossible', 'passe', 'charge', 'envoie'],
    youtube: ['youtube', 'lien', 'url', 'ancien', 'ancienne', 'vieux', 'vieille'],
    conseil: ['conseil', 'conseils', 'astuce', 'astuces', 'aide', 'aider', 'tips', 'comment'],
    age: ['age', 'ans', 'enfant', 'enfants', 'ado', 'ados', 'adolescent', 'adulte', 'adultes', 'categorie', 'categories', 'mineur', 'mineurs'],
    autorisation: ['autorisation', 'parentale', 'parental', 'parent', 'parents', 'responsable', 'representant', 'legal', 'legale', 'tuteur', 'signature', 'signer', 'document', 'mineur', 'mineurs', 'enfant', 'enfants'],
    date: ['date', 'dates', 'quand', 'calendrier', 'planning', 'programme', 'horaire'],
    lieu: ['lieu', 'lieux', 'ou', 'adresse', 'aubagne', 'salle', 'endroit'],
    contact: ['contact', 'contacter', 'joindre', 'email', 'mail', 'telephone', 'tel'],
    payer: ['payer', 'payant', 'gratuit', 'cout', 'prix', 'argent', 'euro', 'euros', 'tarif'],
    profil: ['profil', 'modifier', 'changer', 'photo', 'bio', 'compte'],
    jury: ['jury', 'jure', 'jures', 'note', 'noter', 'notation', 'critere', 'criteres', 'score'],
    playback: ['playback', 'bande', 'mp3', 'musique', 'musicien', 'musiciens', 'accompagnement', 'live'],
    probleme: ['probleme', 'problemes', 'bug', 'erreur', 'marche', 'fonctionne', 'passe', 'bloque', 'impossible'],
  }

  function expandQuery(words: string[]): string[] {
    const expanded = new Set(words)
    for (const word of words) {
      for (const synonyms of Object.values(SYNONYMS)) {
        if (synonyms.includes(word)) {
          for (const s of synonyms) expanded.add(s)
        }
      }
    }
    return Array.from(expanded)
  }

  function findAnswer(query: string): string {
    if (faqs.length === 0) {
      return 'Le service de FAQ n\'est pas encore configuré. Contactez-nous à inscriptions@chantenscene.fr pour toute question.'
    }

    const q = normalize(query)

    // Handle greetings
    if (/^(bonjour|salut|hello|coucou|bonsoir|hey|hi)\b/.test(q)) {
      return 'Bonjour ! Comment puis-je vous aider ? Vous pouvez me poser une question sur le concours ChanteEnScène.'
    }

    const words = q.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
    const expandedWords = expandQuery(words)

    let bestMatch: FaqEntry | null = null
    let bestScore = 0

    for (const faq of faqs) {
      const faqQ = normalize(faq.question)
      const faqA = normalize(faq.answer)
      const faqText = faqQ + ' ' + faqA

      let score = 0

      // Check original words in FAQ question (high weight)
      for (const word of words) {
        if (faqQ.includes(word)) score += 2
      }

      // Check expanded synonyms in FAQ text (medium weight)
      for (const word of expandedWords) {
        if (faqText.includes(word)) score += 0.5
      }

      // Check original words in FAQ answer (lower weight)
      for (const word of words) {
        if (faqA.includes(word)) score += 0.5
      }

      // Bonus for partial stem matching (e.g. "inscri" matches "inscription" and "inscrire")
      for (const word of words) {
        if (word.length >= 4) {
          const stem = word.slice(0, Math.min(word.length - 1, 5))
          if (faqQ.includes(stem)) score += 1
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = faq
      }
    }

    if (bestMatch && bestScore >= 1.5) {
      return bestMatch.answer
    }

    return 'Désolé, je n\'ai pas trouvé de réponse précise. Essayez avec d\'autres mots-clés, ou contactez-nous à inscriptions@chantenscene.fr.'
  }

  function handleSend() {
    if (!input.trim()) return

    const userMsg = input.trim()
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setInput('')

    // Simulate thinking delay
    setTimeout(() => {
      const answer = findAnswer(userMsg)
      setMessages((prev) => [...prev, { role: 'bot', text: answer }])
    }, 400)
  }

  function handleFaqClick(faq: FaqEntry) {
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: faq.question },
      { role: 'bot', text: faq.answer },
    ])
  }

  if (hidden || !mounted) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#e91e8c] to-[#c4157a] shadow-lg shadow-[#e91e8c]/30 flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Chatbot"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-[#161228] border border-[#2a2545] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden" style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#e91e8c] to-[#c4157a] px-5 py-4 shrink-0">
            <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white">
              Assistant ChanteEnScene
            </h3>
            <p className="text-white/70 text-xs">Posez-moi vos questions !</p>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#e91e8c]/20 text-white rounded-br-none'
                      : 'bg-[#1a1533] text-white/80 rounded-bl-none border border-[#2a2545]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* FAQ suggestions */}
            {messages.length <= 1 && faqs.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-white/30 text-xs">Questions fréquentes :</p>
                {faqs.slice(0, 5).map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => handleFaqClick(faq)}
                    className="block w-full text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#2a2545] p-3 shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Votre question..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#e91e8c] text-white text-sm font-bold disabled:opacity-30 hover:bg-[#c4157a] transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
