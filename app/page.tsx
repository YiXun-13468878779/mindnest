'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore, MOCK_ACTIVITIES } from '@/lib/store'
import { formatDate, truncate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  FileText, TrendingUp, BookMarked, Sparkles, Plus, Upload, FlaskConical,
  Network, Link2, Clock, Star, Zap, ArrowRight, Brain, Loader2, X,
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

// ─── 平台徽章 ────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { label: string; color: string }> = {
    bilibili:     { label: 'B站视频',  color: 'bg-pink-50 text-pink-600 border-pink-100' },
    xiaohongshu:  { label: '小红书',   color: 'bg-red-50 text-red-600 border-red-100' },
    arxiv:        { label: '学术论文', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    youtube:      { label: 'YouTube',  color: 'bg-red-50 text-red-600 border-red-100' },
    wechat:       { label: '微信公众号', color: 'bg-green-50 text-green-600 border-green-100' },
    zhihu:        { label: '知乎',     color: 'bg-blue-50 text-blue-600 border-blue-100' },
    juejin:       { label: '掘金',     color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
    general:      { label: '网页',     color: 'bg-gray-50 text-gray-600 border-gray-100' },
  }
  const cfg = map[platform] || map.general
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
}

// ─── 视频嵌入 ────────────────────────────────────────────────
function VideoEmbed({ platform, videoId, url }: { platform: string; videoId?: string; url: string }) {
  if (platform === 'bilibili' && videoId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`//player.bilibili.com/player.html?bvid=${videoId}&autoplay=0&high_quality=1`}
          scrolling="no" frameBorder="0" allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    )
  }
  if (platform === 'youtube' && videoId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          frameBorder="0" allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    )
  }
  return null
}

// ─── 智能链接捕捉面板 ────────────────────────────────────────
function LinkCapture() {
  const { addDocument, folders } = useMindNestStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'idle' | 'fetching' | 'analyzing' | 'done'>('idle')
  const [result, setResult] = useState<Record<string, any> | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'ai' | 'raw'>('ai')

  const STEP_LABELS = {
    idle: '', fetching: '正在抓取页面内容...', analyzing: 'AI 分析整理中...', done: '分析完成',
  }

  const doSave = (data: Record<string, any>, rawUrl: string) => {
    const docId = Math.random().toString(36).slice(2, 10)
    addDocument({
      id: docId,
      title: data.title || '链接内容',
      content: `# ${data.title || '链接内容'}\n\n## AI 整理结果\n\n${data.ai_analysis || data.summary || ''}\n\n---\n\n## 原始内容\n\n${data.raw_text || ''}`,
      summary: data.summary || '',
      keywords: data.keywords || [],
      tags: [...(data.tags || []), '链接捕捉'],
      category: data.category || '未分类',
      source_type: 'link',
      source_url: data.captured_url || rawUrl,
      captured_url: data.captured_url || rawUrl,
      platform: data.platform,
      video_id: data.videoId,
      raw_text: data.raw_text,
      ai_analysis: data.ai_analysis,
      folder_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      word_count: (data.ai_analysis || '').length,
      view_count: 0,
    })
    return docId
  }

  const capture = async () => {
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    setStep('fetching')
    try {
      await new Promise(r => setTimeout(r, 400))
      setStep('analyzing')
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!res.ok) throw new Error('服务器错误 ' + res.status)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // 自动保存到知识库
      doSave(data, url.trim())

      setResult(data)
      setStep('done')
      toast.success(`✓ 已捕捉并保存：${(data.title || '页面内容').slice(0, 20)}`)
    } catch (e: any) {
      toast.error(e.message || '捕捉失败，请检查链接或确认服务器运行中')
      setStep('idle')
    } finally {
      setLoading(false)
    }
  }

  const save = () => {
    // 已在 capture 时自动保存，此函数保留用于再次保存（去重由 id 保证）
    toast.success('已保存到知识库')
    setResult(null)
    setUrl('')
    setStep('idle')
  }

  const EXAMPLES = [
    { label: 'B站视频', url: 'https://www.bilibili.com/video/BV1GJ411x7h7' },
    { label: '知乎文章', url: 'https://www.zhihu.com/question/12345' },
    { label: 'arXiv论文', url: 'https://arxiv.org/abs/2303.08774' },
  ]

  return (
    <div className="max-w-3xl">
      {/* 输入框 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-pink-500" />
          <h2 className="font-semibold text-gray-800">智能链接捕捉</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          支持 B站、小红书、YouTube、知乎、arXiv 等平台，AI 自动识别内容类型并差异化整理
        </p>
        <div className="flex gap-3 mb-3">
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && capture()}
            placeholder="粘贴任意链接 https://..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-400 bg-gray-50 focus:bg-white transition-all"
          />
          <button
            onClick={capture} disabled={!url.trim() || loading}
            className="px-6 bg-pink-500 text-white rounded-xl text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 transition-colors flex items-center gap-2 min-w-[90px] justify-center"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{step === 'fetching' ? '抓取' : 'AI分析'}</>
            ) : (
              <><Sparkles className="w-4 h-4" />捕捉</>
            )}
          </button>
        </div>

        {/* 进度提示 */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-pink-600">
            <div className="flex gap-1">
              {['fetching','analyzing'].map((s, i) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                  step === s ? 'bg-pink-500 scale-125' : (step === 'done' || (step === 'analyzing' && s === 'fetching')) ? 'bg-pink-300' : 'bg-gray-200'
                }`} />
              ))}
            </div>
            {STEP_LABELS[step]}
          </div>
        )}

        {/* 示例链接 */}
        {!loading && !result && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">示例：</span>
            {EXAMPLES.map(e => (
              <button key={e.label} onClick={() => setUrl(e.url)}
                className="text-xs bg-gray-50 hover:bg-pink-50 hover:text-pink-600 text-gray-400 border border-gray-100 rounded-lg px-2.5 py-1 transition-colors">
                {e.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 结果展示 */}
      {result && (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm bubble-float overflow-hidden">
          {/* 标题栏 */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <PlatformBadge platform={result.platform || 'general'} />
                {result.category && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">{result.category}</span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{result.title}</h3>
              <a href={result.captured_url || url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-pink-500 hover:underline truncate block max-w-lg">
                {result.captured_url || url}
              </a>
            </div>
            <button onClick={() => { setResult(null); setStep('idle') }} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 视频嵌入 */}
          {(result.platform === 'bilibili' || result.platform === 'youtube') && result.videoId && (
            <div className="px-5 pt-4">
              <VideoEmbed platform={result.platform} videoId={result.videoId} url={url} />
            </div>
          )}

          {/* 内容标签页 */}
          <div className="flex border-b border-gray-100 px-5 mt-4">
            {[
              { key: 'ai', label: 'AI 整理结果' },
              { key: 'summary', label: '摘要' },
              { key: 'raw', label: '原始内容' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
                className={`pb-2 mr-5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 max-h-80 overflow-y-auto">
            {activeTab === 'ai' && (
              <div className="prose-mindnest text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.ai_analysis || result.summary || '暂无 AI 分析结果'}</ReactMarkdown>
              </div>
            )}
            {activeTab === 'summary' && (
              <p className="text-sm text-gray-700 leading-relaxed">{result.summary || '暂无摘要'}</p>
            )}
            {activeTab === 'raw' && (
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-mono">
                {result.raw_text || '未能抓取原始内容'}
              </p>
            )}
          </div>

          {/* 关键词 */}
          {result.keywords?.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-1.5">
              {result.keywords.map((k: string) => (
                <span key={k} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{k}</span>
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-1.5 flex-1 text-xs text-green-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              已自动保存到知识库 · 分类：{result.folder_suggestion || result.category || '链接捕捉'}
            </div>
            <Link href="/knowledge"
              className="flex items-center gap-2 px-5 py-2 bg-pink-500 text-white rounded-xl text-sm font-semibold hover:bg-pink-600 transition-colors">
              <ArrowRight className="w-4 h-4" />查看知识库
            </Link>
            <button onClick={() => { setResult(null); setUrl(''); setStep('idle') }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-white transition-colors">
              继续捕捉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
