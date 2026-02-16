'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  url: string
  jurorName: string
  role: string
}

export default function JuryQRCode({ url, jurorName, role }: Props) {
  const [show, setShow] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (show && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1a1533',
          light: '#ffffff',
        },
      })
    }
  }, [show, url])

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>QR Code - ${jurorName}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:Arial,sans-serif;">
        <h2 style="margin-bottom:8px;">ChanteEnScene</h2>
        <p style="color:#666;margin-bottom:24px;">Jury - ${role}</p>
        <img src="${dataUrl}" width="280" height="280" />
        <p style="font-weight:bold;font-size:18px;margin-top:16px;">${jurorName}</p>
        <p style="color:#999;font-size:12px;margin-top:8px;word-break:break-all;max-width:400px;text-align:center;">${url}</p>
        <script>setTimeout(()=>window.print(),200)</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `QR_Jury_${jurorName.replace(/\s+/g, '_')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
        title="Afficher le QR code"
      >
        QR
      </button>

      {show && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setShow(false)}
        >
          <div
            className="bg-[#161228] border border-[#2a2545] rounded-2xl p-8 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="font-[family-name:var(--font-montserrat)] font-bold text-base text-white mb-1">
                {jurorName}
              </h3>
              <p className="text-white/40 text-xs mb-6">{role}</p>

              <div className="bg-white rounded-xl p-4 inline-block mb-6">
                <canvas ref={canvasRef} />
              </div>

              <p className="text-white/20 text-[10px] mb-6 break-all px-4">{url}</p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white/90 transition-colors"
                >
                  Telecharger PNG
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#e91e8c]/10 border border-[#e91e8c]/25 text-[#e91e8c] hover:bg-[#e91e8c]/20 transition-colors"
                >
                  Imprimer
                </button>
              </div>

              <button
                onClick={() => setShow(false)}
                className="mt-4 text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
