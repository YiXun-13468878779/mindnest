'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Network, BarChart2, FlaskConical, BrainCircuit,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',          label: '仪表盘',   icon: LayoutDashboard },
  { href: '/knowledge', label: '知识库',   icon: BookOpen },
  { href: '/graph',     label: '知识图谱', icon: Network },
  { href: '/insights',  label: '洞察',     icon: BarChart2 },
  { href: '/research',  label: '研究助手', icon: FlaskConical },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-white border-r border-gray-100 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-lg tracking-tight">MindNest</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-blue-600' : 'text-gray-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* 底部用户信息 */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
            我
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">我的知识库</p>
            <p className="text-xs text-gray-400">本地模式</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
