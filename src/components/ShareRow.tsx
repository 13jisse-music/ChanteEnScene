'use client'

const SITE_URL = 'https://www.chantenscene.fr'
const SHARE_TEXT = 'Découvre ChanteEnScène, le premier concours de chant live à Aubagne !'

export default function ShareRow() {
  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'copy') => {
    if (platform === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${SITE_URL}`)}`,
        '_blank'
      )
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}`,
        '_blank'
      )
    } else {
      try {
        await navigator.clipboard.writeText(SITE_URL)
        const el = document.getElementById('copy-feedback')
        if (el) {
          el.textContent = 'Copié !'
          setTimeout(() => { el.textContent = 'Copier' }, 2000)
        }
      } catch {
        // Fallback
        const input = document.createElement('input')
        input.value = SITE_URL
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
    }
  }

  return (
    <div
      className="flex items-center justify-center gap-4 pt-4 animate-fade-up"
      style={{ animationDelay: '0.5s' }}
    >
      <button
        onClick={() => handleShare('whatsapp')}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
        WhatsApp
      </button>
      <span className="text-white/15">·</span>
      <button
        onClick={() => handleShare('facebook')}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
      </button>
      <span className="text-white/15">·</span>
      <button
        onClick={() => handleShare('copy')}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        <span id="copy-feedback">Copier</span>
      </button>
    </div>
  )
}
