'use client'

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

export default function CandidateGallery({ candidates, sessionId, categories }: Props) {
  return (
    <>
    {/* Mobile: Swipe Feed (TikTok) */}
    <div className="md:hidden">
      <CandidateSwipeFeed candidates={candidates} sessionId={sessionId} categories={categories} />
    </div>

    {/* Desktop: Social Feed */}
    <div className="hidden md:block animate-fade-up">
      <CandidateDesktopFeed candidates={candidates} sessionId={sessionId} categories={categories} />
    </div>
    </>
  )
}
