"use client";

const SYMBOLS = ["♪", "♫", "♬", "♩", "🎵", "🎶"];

export default function FloatingNotes() {
  const notes = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    symbol: SYMBOLS[i % SYMBOLS.length],
    left: `${(i * 7.3 + 3) % 100}%`,
    duration: `${10 + (i * 1.7) % 15}s`,
    delay: `${(i * 1.3) % 12}s`,
    size: `${1 + (i * 0.3) % 1.5}rem`,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      {notes.map((n) => (
        <span
          key={n.id}
          className="absolute opacity-0 animate-float-note"
          style={{
            left: n.left,
            fontSize: n.size,
            animationDuration: n.duration,
            animationDelay: n.delay,
          }}
        >
          {n.symbol}
        </span>
      ))}
    </div>
  );
}
