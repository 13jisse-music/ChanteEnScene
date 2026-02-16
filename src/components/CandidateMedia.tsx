'use client'

import { useState } from 'react'
import LogoRing from '@/components/LogoRing'

interface Props {
  photoUrl: string | null
  displayName: string
  videoUrl: string | null
  embedUrl: string | null
}

export default function CandidateMedia({ photoUrl, displayName, videoUrl, embedUrl }: Props) {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1a1232] border border-[#2e2555] shadow-sm">
        {showVideo && embedUrl ? (
          <iframe
            src={embedUrl + '?autoplay=1'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : showVideo && videoUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl text-white/20">
                🎤
              </div>
            )}
            {/* Logo watermark */}
            <div className="absolute bottom-4 right-4 drop-shadow-lg">
              <LogoRing size={80} />
            </div>
          </>
        )}
      </div>

      {/* Toggle photo/video buttons */}
      {videoUrl && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowVideo(false)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              !showVideo
                ? 'bg-[#e91e8c]/10 text-[#e91e8c] border border-[#e91e8c]/25'
                : 'bg-white/5 text-[#a899c2] border border-[#2e2555] hover:bg-white/10'
            }`}
          >
            📸 Photo
          </button>
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              showVideo
                ? 'bg-[#e91e8c]/10 text-[#e91e8c] border border-[#e91e8c]/25'
                : 'bg-white/5 text-[#a899c2] border border-[#2e2555] hover:bg-white/10'
            }`}
          >
            🎬 Vidéo
          </button>
        </div>
      )}
    </div>
  )
}
