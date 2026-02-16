import Image from 'next/image'

export default function LogoRing({ size = 180 }: { size?: number }) {
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
