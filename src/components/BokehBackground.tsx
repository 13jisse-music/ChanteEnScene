import Image from 'next/image'

const sparkles = Array.from({ length: 20 }, (_, i) => ({
  top: `${(i * 5.1 + 4) % 96}%`,
  left: `${(i * 7.3 + 2) % 98}%`,
  size: 2 + (i % 4),
  color: i % 5 === 0 ? 'rgba(233,30,140,0.5)' : i % 2 === 0 ? 'rgba(245,166,35,0.8)' : 'rgba(232,115,42,0.7)',
  duration: `${2 + (i * 0.6) % 3}s`,
  delay: `${(i * 0.4) % 7}s`,
}))

export default function BokehBackground() {
  return (
    <div className="bokeh-bg fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Background image covering entire site */}
      <Image
        src="/images/fd.png"
        alt=""
        fill
        className="object-cover"
        priority
        quality={85}
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-[#0a0618]/40" />

      {/* Subtle sparkles on top for extra life */}
      {sparkles.map((s, i) => (
        <div
          key={`s-${i}`}
          className="absolute rounded-full animate-sparkle"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: s.color,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  )
}
