"use client";

import { useState, useEffect } from 'react'

const SYMBOLS = ["♪", "♫", "♬", "♩", "🎵", "🎶"];
const COLORS = ['#e91e8c', '#ff6b9d', '#7ec850', '#a8e063', '#e91e8c', '#7ec850'];

export default function FloatingNotes() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const notes = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    symbol: SYMBOLS[i % SYMBOLS.length],
    left: `${(i * 7.3 + 3) % 100}%`,
    duration: `${10 + (i * 1.7) % 15}s`,
    delay: `${(i * 1.3) % 12}s`,
    size: `${1 + (i * 0.3) % 1.5}rem`,
    color: COLORS[i % COLORS.length],
  }));

  if (!mounted) return <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />

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
            color: n.color,
          }}
        >
          {n.symbol}
        </span>
      ))}
    </div>
  );
}
