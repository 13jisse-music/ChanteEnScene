'use client'

import { useState } from 'react'

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
          <img
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl brightness-[0.3] opacity-60"
            aria-hidden="true"
          />
          <img
            src={src}
            alt={alt}
            className="absolute inset-x-0 top-0 w-full object-cover"
            style={{ height: '55%', objectPosition: 'center center' }}
          />
        </>
      ) : (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 20%' }}
        />
      )}
      {/* Image cachée pour détecter le ratio */}
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
