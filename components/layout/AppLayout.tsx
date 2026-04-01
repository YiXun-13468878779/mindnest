'use client'
import Sidebar from './Sidebar'
import PixelPet from '../pet/PixelPet'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-[220px] min-h-screen flex flex-col">
        {children}
      </main>
      <PixelPet />
    </div>
  )
}
