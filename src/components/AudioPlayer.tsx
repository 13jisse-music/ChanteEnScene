'use client'

import { useRef, useState, useEffect } from 'react'

interface Props {
  src: string
  candidateName?: string
}

export default function AudioPlayer({ src, candidateName }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  // Reset when src changes
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [src])

  function handlePlay() {
    audioRef.current?.play()
    setIsPlaying(true)
  }

  function handlePause() {
    audioRef.current?.pause()
    setIsPlaying(false)
  }

  function handleStop() {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    audio.currentTime = percent * duration
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      {candidateName && (
        <p className="text-white/40 text-xs mb-3 truncate">🎵 {candidateName}</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#e91e8c] to-[#c4157a] flex items-center justify-center text-white hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all active:scale-95"
          >
            ▶
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="w-10 h-10 rounded-full bg-[#e91e8c]/20 border border-[#e91e8c]/40 flex items-center justify-center text-[#e91e8c] hover:bg-[#e91e8c]/30 transition-all active:scale-95"
          >
            ⏸
          </button>
        )}

        <button
          onClick={handleStop}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all active:scale-95"
        >
          ⏹
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-3">
          <div
            className="flex-1 h-2 bg-[#2a2545] rounded-full cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-[#e91e8c] to-[#7ec850] rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-white/30 text-xs tabular-nums min-w-[70px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
