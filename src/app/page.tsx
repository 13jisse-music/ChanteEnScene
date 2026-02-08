import Link from "next/link";
import FloatingNotes from "@/components/FloatingNotes";
import LogoRing from "@/components/LogoRing";

export default function HomePage() {
  return (
    <>
      <FloatingNotes />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        {/* Background glow */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(233,30,140,0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(126,200,80,0.1) 0%, transparent 50%)
            `,
          }}
        />

        {/* Logo */}
        <div className="animate-fade-up mb-8">
          <LogoRing size={180} />
        </div>

        {/* Title */}
        <p
          className="font-[family-name:var(--font-montserrat)] font-bold text-xs sm:text-sm uppercase tracking-[0.4em] text-white/40 mb-4 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          Concours de chant
        </p>

        <h1
          className="font-[family-name:var(--font-montserrat)] font-black text-4xl sm:text-5xl md:text-7xl uppercase tracking-wider mb-2 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="text-white">Chant</span>
          <span className="text-[#7ec850]">En</span>
          <span className="text-gradient-pink">Scène</span>
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl font-light text-white/60 leading-relaxed max-w-md mx-auto mt-4 mb-10 animate-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          Libérez votre voix,
          <br />
          faites vibrer le public sur scène...
        </p>

        {/* Features pills */}
        <div
          className="flex flex-wrap gap-3 justify-center mb-10 animate-fade-up"
          style={{ animationDelay: "0.7s" }}
        >
          {[
            { emoji: "🎵", label: "Musiciens Live" },
            { emoji: "📱", label: "Votes du Public" },
            { emoji: "⭐", label: "Jury Pro" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-[#e91e8c]/10 hover:border-[#e91e8c] hover:-translate-y-0.5 transition-all"
            >
              <span>{f.emoji}</span> {f.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: "0.9s" }}
        >
          <Link
            href="/aubagne-2026/inscription"
            className="inline-block px-8 py-3.5 rounded-full font-semibold text-base bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all animate-pulse-glow"
          >
            Inscription bientôt ouverte
          </Link>
        </div>

        {/* Dates */}
        <div
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto animate-fade-up"
          style={{ animationDelay: "1.1s" }}
        >
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
              Demi-finale
            </p>
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-[#e91e8c]">
              17 juin 2026
            </p>
            <p className="text-xs text-white/40 mt-1">Espace Liberté, Aubagne</p>
          </div>
          <div className="bg-[#161228] border border-[#2a2545] rounded-xl p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
              Grande Finale
            </p>
            <p className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-[#7ec850]">
              16 juillet 2026
            </p>
            <p className="text-xs text-white/40 mt-1">Cours Foch, Aubagne</p>
          </div>
        </div>

        {/* Categories */}
        <div
          className="mt-8 flex gap-3 justify-center animate-fade-up"
          style={{ animationDelay: "1.3s" }}
        >
          {["Enfant", "Ado", "Adulte"].map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c]"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Status */}
        <div
          className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7ec850]/8 border border-[#7ec850]/25 text-xs text-[#7ec850] tracking-wider animate-fade-up"
          style={{ animationDelay: "1.5s" }}
        >
          <span className="w-2 h-2 bg-[#7ec850] rounded-full animate-pulse" />
          SITE EN CONSTRUCTION
        </div>
      </section>
    </>
  );
}
