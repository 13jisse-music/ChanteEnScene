'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  src: string
  alt: string
}

export default function ProfilePhoto({ src, alt }: Props) {
  const [isLandscape, setIsLandscape] = useState(false)

  return (
    <>
      {isLandscape ? (
        <>
          {/* Paysage : bandeau en haut (55% hauteur) + fond flou derrière */}
          <div className="absolute inset-0 bg-[#0d0b1a]" />
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover scale-110 blur-3xl brightness-[0.3] opacity-60"
            aria-hidden={true}
          />
          <div className="absolute inset-x-0 top-0" style={{ height: '55%' }}>
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: 'center center' }}
            />
          </div>
        </>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover"
          style={{ objectPosition: 'center 20%' }}
          priority
        />
      )}
      {/* Image cachée pour détecter le ratio — garde <img> natif pour onLoad + naturalWidth */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="hidden"
        onLoad={(e) => {
          const img = e.currentTarget
          if (img.naturalWidth > img.naturalHeight) {
            setIsLandscape(true)
          }
        }}
      />
    </>
  )
}
