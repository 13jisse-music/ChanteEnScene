'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function LogoRing({
  size = 180,
  animated = false,
  pulse = false,
  pulseInterval = 30000,
}: {
  size?: number
  animated?: boolean
  pulse?: boolean
  pulseInterval?: number
}) {
  // Animated: video loops continuously
  if (animated) {
    return (
      <div
        className="relative mx-auto overflow-hidden"
        style={{ width: size, height: size }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          width={size}
          height={size}
          className="object-contain w-full h-full"
          poster="/images/logo2.png"
        >
          <source src="/images/logo-alpha.webm" type="video/webm" />
        </video>
      </div>
    )
  }

  // Pulse: static image, video plays once every pulseInterval
  if (pulse) {
    return <LogoPulse size={size} interval={pulseInterval} />
  }

  // Static: just the PNG
  return (
    <div
      className="relative mx-auto rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/logo2.png"
        alt="ChanteEnScene — Concours de chant"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}

function LogoPulse({ size, interval }: { size: number; interval: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // Play once on mount after a short delay
    const initialTimeout = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play().catch(() => {})
        setPlaying(true)
      }
    }, 2000)

    // Then replay periodically
    const timer = setInterval(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play().catch(() => {})
        setPlaying(true)
      }
    }, interval)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(timer)
    }
  }, [interval])

  const handleEnded = () => setPlaying(false)

  return (
    <div
      className="relative mx-auto overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* Static image underneath */}
      <Image
        src="/images/logo2.png"
        alt="ChanteEnScene — Concours de chant"
        width={size}
        height={size}
        className="absolute inset-0 object-contain"
        priority
      />
      {/* Video on top, visible only when playing */}
      <video
        ref={videoRef}
        muted
        playsInline
        onEnded={handleEnded}
        width={size}
        height={size}
        className={`absolute inset-0 object-contain w-full h-full transition-opacity duration-300 ${
          playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src="/images/logo-alpha.webm" type="video/webm" />
      </video>
    </div>
  )
}
