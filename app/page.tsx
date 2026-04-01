'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore, MOCK_ACTIVITIES } from '@/lib/store'
import { formatDate, truncate } from '@/lib/utils'
import {
  FileText, TrendingUp, BookMarked, Sparkles, Plus, Upload, FlaskConical,
  Network, Link2, Clock, Star, Zap, ArrowRight, Brain,
} from 'lucide-react'

// ─── TopBar ──────────────────────────────────────────────────
function TopBar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
      <input
        placeholder="搜索知识库..."
        className="w-80 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-all"
      />
      <Link
        href="/document/new"
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        新建文档
      </Link>
    </div>
  )
}

// ─── Stats ───────────────────────────────────────────────────
function StatsCards({ docCount, weekNew, taskCount }: { docCount: number; weekNew: number; taskCount: number }) {
  const stats = [
    { icon: FileText, label: '总文档数', value: docCount, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: '本周新增', value: weekNew, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: BookMarked, label: '知识领域', value: 8, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Brain, label: '研究任务', value: taskCount, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
          <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Quick Actions ───────────────────────────────────────────
function QuickActions() {
  const actions = [
    { icon: Plus,         label: '新建文档',     sub: '创建新的知识文档', color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/document/new' },
    { icon: Upload,       label: '导入资源',     sub: '上传文件或链接资源', color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/knowledge?upload=1' },
    { icon: FlaskConical, label: '开始研究',     sub: '让AI帮你研究新知识', color: 'text-orange-600', bg: 'bg-orange-50', href: '/research' },
    { icon: Network,      label: '查看图谱',     sub: '探索知识关联网络',   color: 'text-purple-600', bg: 'bg-purple-50', href: '/graph' },
    { icon: Link2,        label: '智能链接捕捉', sub: '一键捕捉网页链接资源', color: 'text-pink-600', bg: 'bg-pink-50', href: '/knowledge?tab=capture' },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">快速操作</h2>
      <div className="grid grid-cols-5 gap-3">
        {actions.map(({ icon: Icon, label, sub, color, bg, href }) => (
          <Link key={label} href={href}
            className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-sm font-medium ${color}`}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── AI Features Banner ──────────────────────────────────────
function AIFeatures() {
  const features = [
    { icon: Sparkles, label: 'AI 自动整理', desc: '自动提取摘要、关键词和标签' },
    { icon: Network,  label: '知识关联',   desc: '自动发现文档之间的语义关联' },
    { icon: Zap,      label: '深度研究',   desc: '多源搜索，生成结构化知识文档' },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-700">AI智能功能</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="gradient-welcome rounded-xl p-4">
            <Icon className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Recent + Recommend ──────────────────────────────────────
function RecentAndRecommend() {
  const { documents } = useMindNestStore()
  const recent = documents.slice(0, 3)
  const recommended = [
    { icon: FlaskConical, label: '建议研究：TypeScript 高级类型', sub: '基于你的React知识，建议深入学习TypeScript的高级类型系统', badge: '知识关联度高', color: 'text-orange-500' },
    { icon: Clock, label: '回顾提醒：机器学习基础', sub: '你上次学习机器学习概念是7天前，建议复习巩固', badge: '遗忘曲线提醒', color: 'text-blue-500' },
    { icon: TrendingUp, label: '热门话题：AI Agent 开发', sub: 'AI Agent是当前热门话题，与你现有的AI知识高度相关', badge: '趋势分析', color: 'text-emerald-500' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 最近文档 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">最近文档</h2>
          <Link href="/knowledge" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            查看全部 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {recent.map((doc) => (
            <Link key={doc.id} href={`/document/${doc.id}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50">
                <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{truncate(doc.summary || '', 36)}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {doc.tags.slice(0, 2).map(t => (
                    <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">{t}</span>
                  ))}
                  <span className="text-xs text-gray-400 ml-auto">{formatDate(doc.updated_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 今日推荐 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">今日推荐</h2>
          <span className="text-xs text-gray-400">AI智能推荐</span>
        </div>
        <div className="space-y-3">
          {recommended.map(({ icon: Icon, label, sub, badge, color }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{truncate(sub, 40)}</p>
                <span className={`text-xs ${color} mt-1 block`}>{badge}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard 主页面 ────────────────────────────────────────
export default function DashboardPage() {
  const { documents, researchTasks } = useMindNestStore()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'capture'>('dashboard')

  const weekNew = documents.filter(d => {
    const days = (Date.now() - new Date(d.created_at).getTime()) / 86400000
    return days <= 7
  }).length

  return (
    <AppLayout>
      <TopBar />
      <div className="p-6 flex-1">
        {/* 欢迎横幅 */}
        <div className="gradient-welcome rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">欢迎回来！</h1>
          <p className="text-gray-500 text-sm mb-4">继续你的知识探索之旅，让AI帮你构建更完整的知识体系。</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" />上次活跃：2小时前</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500" />连续学习：7天</span>
            <span className="flex items-center gap-1.5"><Link2 className="w-4 h-4 text-pink-500" />已捕捉链接：45个</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-500" />AI处理：128次</span>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {[
            { key: 'dashboard', label: '仪表盘', icon: TrendingUp },
            { key: 'capture',   label: '智能链接捕捉', icon: Link2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-5">
            <StatsCards docCount={documents.length} weekNew={weekNew} taskCount={researchTasks.length} />
            <QuickActions />
            <AIFeatures />
            <RecentAndRecommend />
          </div>
        ) : (
          <LinkCapture />
        )}
      </div>
    </AppLayout>
  )
}

// ─── 智能链接捕捉面板 ────────────────────────────────────────
function LinkCapture() {
  const { addDocument } = useMindNestStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [captured, setCaptured] = useState<{ title: string; summary: string; url: string } | null>(null)

  const capture = async () => {
    if (!url.trim()) return
    setLoading(true)
    // 模拟抓取
    await new Promise(r => setTimeout(r, 1500))
    const result = {
      title: '从链接捕捉的知识内容',
      summary: 'AI 已自动提取该页面的核心内容并生成摘要，内容涵盖主要观点、关键信息和上下文关联。',
      url: url.trim(),
    }
    setCaptured(result)
    setLoading(false)
  }

  const save = () => {
    if (!captured) return
    addDocument({
      id: Math.random().toString(36).slice(2),
      title: captured.title,
      content: `# ${captured.title}\n\n来源：${captured.url}\n\n${captured.summary}`,
      summary: captured.summary,
      tags: ['链接捕捉'],
      keywords: [],
      source_type: 'link',
      source_url: captured.url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      word_count: 200,
      view_count: 0,
    })
    setCaptured(null)
    setUrl('')
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-1">粘贴链接，AI 自动捕捉</h2>
        <p className="text-sm text-gray-400 mb-4">支持普通网页、小红书、论文、B站视频等，AI 会根据内容类型差异化处理</p>
        <div className="flex gap-3">
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="粘贴任意链接 https://..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={capture} disabled={!url.trim() || loading}
            className="px-5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '分析中...' : '捕捉'}
          </button>
        </div>
      </div>

      {captured && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 bubble-float">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-gray-800">{captured.title}</p>
              <p className="text-xs text-blue-500 truncate">{captured.url}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{captured.summary}</p>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              加入知识库
            </button>
            <button onClick={() => setCaptured(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
