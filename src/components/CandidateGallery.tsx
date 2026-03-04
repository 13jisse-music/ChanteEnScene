'use client'

import { useState, useEffect } from 'react'
import CandidateSwipeFeed from './CandidateSwipeFeed'
import CandidateDesktopFeed from './CandidateDesktopFeed'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  photo_url: string | null
  song_title: string
  song_artist: string
  category: string
  bio: string | null
  accent_color: string
  slug: string
  likes_count: number
  video_url: string | null
  video_public: boolean
  status: string
}

interface Props {
  candidates: Candidate[]
  sessionId: string
  categories: string[]
}

// Shuffle Fisher-Yates : ordre aléatoire à chaque chargement
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function CandidateGallery({ candidates, sessionId, categories }: Props) {
  const [shuffled, setShuffled] = useState<Candidate[] | null>(null)

  // Shuffle côté client uniquement (évite l'erreur d'hydratation SSR/client)
  // On attend que le shuffle soit fait avant d'afficher les feeds (évite le décalage scroll)
  useEffect(() => {
    setShuffled(shuffle(candidates))
  }, [candidates])

  // Tant que le shuffle n'est pas prêt, ne rien afficher (évite que le swipe feed se monte avec l'ancien ordre)
  if (!shuffled) return null

  return (
    <>
    {/* Mobile + Tablet: Swipe Feed (TikTok) */}
    <div className="lg:hidden">
      <CandidateSwipeFeed candidates={shuffled} sessionId={sessionId} categories={categories} />
    </div>

    {/* Desktop: Social Feed */}
    <div className="hidden lg:block animate-fade-up">
      <CandidateDesktopFeed candidates={shuffled} sessionId={sessionId} categories={categories} />
    </div>
    </>
  )
}
