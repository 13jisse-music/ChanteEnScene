import Image from 'next/image'

export default function LogoRing({ size = 180, animated = false }: { size?: number; animated?: boolean }) {
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
