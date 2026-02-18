import AdminSidebar from '@/components/AdminSidebar'
import ToastProvider from '@/components/ToastProvider'

export const metadata = {
  title: 'Admin — ChanteEnScène',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="relative z-50 flex min-h-screen bg-[#0d0b1a] text-white">
        <AdminSidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </div>
    </ToastProvider>
  )
}
