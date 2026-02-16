'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Toast {
  id: string
  message: string
  emoji?: string
  type?: 'info' | 'success' | 'warning'
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="animate-slide-in-right bg-[#161228] border border-[#2a2545] rounded-xl px-4 py-3 shadow-xl"
              >
                <p className="text-sm text-white/80">
                  {toast.emoji && <span className="mr-2">{toast.emoji}</span>}
                  {toast.message}
                </p>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}
