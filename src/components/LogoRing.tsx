export default function LogoRing({ size = 180 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
    >
      {/* Animated gradient ring */}
      <div
        className="w-full h-full rounded-full animate-ring"
        style={{
          border: "6px solid transparent",
          background:
            "conic-gradient(from 180deg, #e91e8c, #ff6b9d, #7ec850, #a8e063, #e91e8c) border-box",
          WebkitMask:
            "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {/* Inner text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center font-display font-black leading-tight">
          <span className="text-xs tracking-wider text-white/70">Concours</span>
          <br />
          <span className="text-base">
            CHANT<span className="text-[#7ec850]">EN</span>SCÈNE
          </span>
        </div>
      </div>
    </div>
  );
}
