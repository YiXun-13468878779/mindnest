import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'MindNest - 智能个人知识库',
  description: 'AI驱动的轻量级个人知识库工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
