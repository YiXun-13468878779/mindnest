'use client'
import { useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore } from '@/lib/store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Plus, FileText, Flame, BookOpen, Zap, ArrowRight, Minus, Brain, Loader2, RefreshCw, RotateCcw } from 'lucide-react'

// ─── AI 知识洞察 ─────────────────────────────────────────────
function AIInsightsCard() {
  const { documents } = useMindNestStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const generate = async () => {
    if (loading || documents.length === 0) return
    setLoading(true); setText(''); setDone(false)
    try {
      const catMap: Record<string, number> = {}
      documents.forEach(d => { if (d.category) catMap[d.category] = (catMap[d.category] || 0) + 1 })
      const tagMap: Record<string, number> = {}
      documents.forEach(d => d.tags?.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1 }))
      const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)
      const recentTitles = documents.slice(0, 8).map(d => d.title)

      const res = await fetch('/api/ai-insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total: documents.length, categories: catMap, topTags, recentTitles }) })
      if (!res.ok || !res.body) throw new Error('AI 请求失败')
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let full = ''
      while (true) { const { done: d, value } = await reader.read(); if (d) break; full += decoder.decode(value, { stream: true }); setText(full) }
      setDone(true)
    } catch (e: any) {
      setText(`生成失败：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">AI 知识洞察</h2>
            <p className="text-xs text-gray-400">基于你的知识库生成个性化分析</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading || documents.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? '分析中...' : done ? '重新生成' : '生成洞察'}
        </button>
      </div>

      {!text && !loading && (
        <div className="text-center py-6">
          <Brain className="w-10 h-10 text-indigo-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{documents.length === 0 ? '先添加一些文档，再来获取洞察' : '点击「生成洞察」获取 AI 对你知识库的深度分析'}</p>
        </div>
      )}

      {loading && !text && (
        <div className="flex items-center gap-2 text-sm text-indigo-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />正在分析你的知识库...
        </div>
      )}

      {text && (
        <div className="prose prose-sm max-w-none prose-headings:text-indigo-800 prose-p:text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

// ─── 数据 ─────────────────────────────────────────────────────
function getDayKey(date: Date) { return date.toISOString().slice(0, 10) }

function useInsightsData() {
  const { documents } = useMindNestStore()
  return useMemo(() => {
    const now = new Date()

    const heatmapDays: { date: string; count: number; label: string }[] = []
    for (let i = 111; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      heatmapDays.push({ date: getDayKey(d), count: 0, label: `${d.getMonth()+1}/${d.getDate()}` })
    }
    const dayMap = new Map(heatmapDays.map((d, i) => [d.date, i]))
    for (const doc of documents) {
      const idx = dayMap.get(getDayKey(new Date(doc.created_at)))
      if (idx !== undefined) heatmapDays[idx].count++
    }

    let streak = 0
    const todayKey = getDayKey(now)
    const yesterdayKey = getDayKey(new Date(now.getTime() - 86400000))
    const activeDays = new Set(documents.map(d => getDayKey(new Date(d.created_at))))
    const startKey = activeDays.has(todayKey) ? todayKey : activeDays.has(yesterdayKey) ? yesterdayKey : null
    if (startKey) {
      const cursor = new Date(startKey)
      while (activeDays.has(getDayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
    }

    const weekDays = ['周一','周二','周三','周四','周五','周六','周日']
    const weekData = weekDays.map(d => ({ date: d, count: 0 }))
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    weekStart.setHours(0,0,0,0)
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    for (const doc of documents) {
      const d = new Date(doc.created_at)
      if (d >= weekStart) weekData[(d.getDay() + 6) % 7].count++
    }

    const categoryMap: Record<string, number> = {}
    for (const doc of documents) {
      const cat = doc.category || '未分类'
      categoryMap[cat] = (categoryMap[cat] || 0) + 1
    }
    const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#ef4444','#8b5cf6','#94a3b8']
    const pieData = Object.entries(categoryMap).sort((a,b)=>b[1]-a[1]).slice(0,7)
      .map(([name, value], i) => ({
        name, value,
        pct: Math.round((value / documents.length) * 100),
        color: COLORS[i % COLORS.length],
      }))

    const trendData: { date: string; total: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(23,59,59)
      trendData.push({ date: `${d.getMonth()+1}/${d.getDate()}`, total: documents.filter(doc => new Date(doc.created_at) <= d).length })
    }

    const radarData = Object.entries(categoryMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
      .map(([subject, count]) => ({
        subject: subject.length > 4 ? subject.slice(0,4) : subject,
        value: Math.min(100, Math.round((count / documents.length) * 100) + 20),
      }))

    const thisWeekCount = documents.filter(d => new Date(d.created_at) >= weekStart).length
    const lastWeekCount = documents.filter(d => { const t = new Date(d.created_at); return t >= lastWeekStart && t < weekStart }).length
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthCount = documents.filter(d => new Date(d.created_at) >= monthStart).length

    return { heatmapDays, streak, weekData, pieData, trendData, radarData,
      thisWeekCount, lastWeekCount, monthCount, totalActiveDays: activeDays.size, totalDocs: documents.length }
  }, [documents])
}

// ─── 热力图 ───────────────────────────────────────────────────
const LEVELS = [
  { bg: '#e2e8f0', border: '#cbd5e1' },
  { bg: '#bfdbfe', border: '#93c5fd' },
  { bg: '#60a5fa', border: '#3b82f6' },
  { bg: '#2563eb', border: '#1d4ed8' },
  { bg: '#1e3a8a', border: '#1e3a8a' },
]

function HeatmapCell({ count, label, date, isToday }: { count: number; label: string; date: string; isToday: boolean }) {
  const [hovered, setHovered] = useState(false)
  const c = LEVELS[count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4]
  const wd = ['日','一','二','三','四','五','六'][new Date(date + 'T12:00:00').getDay()]
  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{
        width: 13, height: 13, borderRadius: 4,
        backgroundColor: c.bg,
        border: `1px solid ${isToday ? '#f59e0b' : c.border}`,
        boxShadow: isToday ? '0 0 0 1.5px #fbbf24' : count > 0 ? `0 1px 3px ${c.border}60` : undefined,
        transform: hovered ? 'scale(1.5)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(.34,1.56,.64,1)',
        cursor: 'default', position: 'relative', zIndex: hovered ? 20 : 1,
      }} />
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, whiteSpace: 'nowrap', background: '#0f172a', color: '#f8fafc',
          fontSize: 11, borderRadius: 8, padding: '6px 10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', pointerEvents: 'none',
          border: '1px solid #1e293b',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{label} (周{wd})</div>
          <div style={{ color: count > 0 ? '#93c5fd' : '#64748b' }}>
            {count > 0 ? `新增 ${count} 篇` : '暂无记录'}
          </div>
          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #0f172a' }} />
        </div>
      )}
    </div>
  )
}

function ActivityHeatmap({ days, streak }: { days: { date: string; count: number; label: string }[]; streak: number }) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const firstDayOfWeek = (new Date(days[0].date).getDay() + 6) % 7
  const padded = [...Array(firstDayOfWeek).fill(null), ...days]
  const weeks: (typeof days[0] | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i+7))

  const monthLabels: (string | null)[] = weeks.map(week => {
    const first = week.find(d => d !== null); if (!first) return null
    const d = new Date(first.date), prev = new Date(d); prev.setDate(prev.getDate() - 7)
    return d.getMonth() !== prev.getMonth() ? `${d.getMonth()+1}月` : null
  })

  const totalDocs = days.reduce((s, d) => s + d.count, 0)
  const activeDays = days.filter(d => d.count > 0).length
  const nextMilestone = streak < 7 ? 7 : streak < 14 ? 14 : streak < 30 ? 30 : streak < 100 ? 100 : null
  const streakPct = nextMilestone ? Math.min(100, Math.round((streak / nextMilestone) * 100)) : 100

  return (
    <div>
      {/* 顶部摘要 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-gray-900">{totalDocs}</span>
            <span className="text-xs text-gray-400 ml-1.5">篇文档</span>
          </div>
          <div className="w-px h-6 bg-gray-100" />
          <div>
            <span className="text-2xl font-bold text-gray-900">{activeDays}</span>
            <span className="text-xs text-gray-400 ml-1.5">活跃天</span>
          </div>
          {nextMilestone && (
            <>
              <div className="w-px h-6 bg-gray-100" />
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">距 {nextMilestone} 天还差 {nextMilestone - streak} 天</span>
                  </div>
                  <div className="w-28 h-1.5 bg-gray-100 rounded-full mt-1">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all" style={{ width: `${streakPct}%` }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 月份标签 */}
      <div className="flex gap-[3px] mb-1.5" style={{ paddingLeft: 22 }}>
        {weeks.map((_, wi) => (
          <div key={wi} style={{ width: 13, flexShrink: 0 }}>
            {monthLabels[wi] && <span className="text-gray-400 font-medium" style={{ fontSize: 10 }}>{monthLabels[wi]}</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-[3px]">
        {/* 星期 */}
        <div className="flex flex-col gap-[3px] mr-2" style={{ width: 14 }}>
          {['一','二','三','四','五','六','日'].map((d, i) => (
            <div key={d} style={{ width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[0, 2, 4, 6].includes(i) && <span className="text-gray-400" style={{ fontSize: 9 }}>{d}</span>}
            </div>
          ))}
        </div>
        {/* 格子 */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array(7).fill(0).map((_, di) => {
              const cell = week[di]
              return cell
                ? <HeatmapCell key={di} count={cell.count} label={cell.label} date={cell.date} isToday={cell.date === todayKey} />
                : <div key={di} style={{ width: 13, height: 13 }} />
            })}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs text-gray-400">少</span>
        {LEVELS.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.bg, border: `1px solid ${c.border}` }} />)}
        <span className="text-xs text-gray-400">多</span>
        <span className="mx-1.5 text-gray-200 text-xs">|</span>
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#fef3c7', border: '1.5px solid #fbbf24' }} />
        <span className="text-xs text-gray-400">今天</span>
      </div>
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function InsightsPage() {
  const [period, setPeriod] = useState('最近30天')
  const data = useInsightsData()

  const weekDiff = data.thisWeekCount - data.lastWeekCount
  const TrendIcon = weekDiff > 0 ? TrendingUp : weekDiff < 0 ? TrendingDown : Minus
  const trendColor = weekDiff > 0 ? 'text-emerald-600' : weekDiff < 0 ? 'text-red-500' : 'text-gray-400'
  const trendLabel = weekDiff > 0 ? `+${weekDiff} 较上周` : weekDiff < 0 ? `${weekDiff} 较上周` : '与上周持平'

  const stats = [
    {
      label: '连续打卡', value: data.streak, unit: '天',
      sub: data.streak >= 7 ? '势头很好 🔥' : data.streak === 0 ? '今天开始吧' : '继续保持 💪',
      gradient: 'from-orange-500 to-amber-400',
      light: 'bg-orange-50', text: 'text-orange-600',
      icon: Flame,
    },
    {
      label: '本周新增', value: data.thisWeekCount, unit: '篇',
      sub: trendLabel, trendIcon: TrendIcon, trendColor,
      gradient: 'from-blue-600 to-indigo-500',
      light: 'bg-blue-50', text: 'text-blue-600',
      icon: TrendingUp,
    },
    {
      label: '累计学习', value: data.totalActiveDays, unit: '天',
      sub: `共 ${data.totalDocs} 篇文档`,
      gradient: 'from-emerald-500 to-teal-400',
      light: 'bg-emerald-50', text: 'text-emerald-600',
      icon: Calendar,
    },
    {
      label: '本月新增', value: data.monthCount, unit: '篇',
      sub: `${data.pieData.length} 个知识领域`,
      gradient: 'from-violet-500 to-purple-400',
      light: 'bg-violet-50', text: 'text-violet-600',
      icon: BookOpen,
    },
  ]

  const tooltipStyle = {
    borderRadius: 12, border: 'none',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    fontSize: 12, padding: '8px 12px',
  }

  return (
    <AppLayout>
      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-base font-bold text-gray-900">学习洞察</h1>
        <Link href="/knowledge" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />新建文档
        </Link>
      </div>

      <div className="min-h-screen bg-gray-50/60">
        <div className="p-6 max-w-6xl space-y-5">
          {/* AI 洞察卡（置顶） */}
          <AIInsightsCard />

          {/* 页头 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">学习洞察</h1>
              <p className="text-sm text-gray-500 mt-0.5">洞察你的知识成长轨迹</p>
            </div>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 focus:outline-none focus:border-blue-300 shadow-sm">
              {['最近7天','最近30天','最近3个月','全部'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map(({ label, value, unit, sub, gradient, light, icon: Icon, trendIcon: TIcon, trendColor: tc }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
                {/* 渐变装饰条 */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className={`w-9 h-9 ${light} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-4.5 h-4.5 ${label === '连续打卡' ? 'text-orange-500' : label === '本周新增' ? 'text-blue-500' : label === '累计学习' ? 'text-emerald-500' : 'text-violet-500'} w-5 h-5`} />
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">{value}</span>
                  <span className="text-sm text-gray-400">{unit}</span>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
                <div className="flex items-center gap-1">
                  {TIcon && <TIcon className={`w-3 h-3 ${tc}`} />}
                  <p className={`text-xs ${tc || 'text-gray-400'}`}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 热力图 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">学习活跃度</h2>
                <p className="text-xs text-gray-400 mt-0.5">过去 16 周每日记录</p>
              </div>
              {data.streak > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <Flame className="w-3.5 h-3.5" />
                  连续 {data.streak} 天
                </div>
              )}
            </div>
            <ActivityHeatmap days={data.heatmapDays} streak={data.streak} />
          </div>

          {/* 图表区 */}
          <div className="grid grid-cols-2 gap-5">
            {/* 柱状图 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-0.5">本周学习统计</h2>
              <p className="text-xs text-gray-400 mb-4">每日新增文档数</p>
              {data.weekData.every(d => d.count === 0) ? (
                <div className="flex flex-col items-center justify-center h-[200px] gap-2">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">本周暂无记录</p>
                  <Link href="/document/new" className="text-xs text-blue-500 flex items-center gap-1 hover:gap-2 transition-all">
                    立即创建 <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.weekData} barSize={22} barCategoryGap="30%">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                    <Tooltip formatter={(v: number) => [`${v} 篇`, '新增文档']} contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[6,6,2,2]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 饼图 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-0.5">知识领域分布</h2>
              <p className="text-xs text-gray-400 mb-4">按分类统计文档占比</p>
              {data.pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] gap-2">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">暂无分类数据</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <defs>
                        {data.pieData.map((entry, i) => (
                          <filter key={i} id={`shadow${i}`}>
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={entry.color} floodOpacity="0.3" />
                          </filter>
                        ))}
                      </defs>
                      <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                        {data.pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip formatter={(_v, _n, p) => [`${p.payload.pct}%`, p.payload.name]} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1 min-w-0">
                    {data.pieData.map(({ name, pct, color }) => (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-gray-600 truncate max-w-[80px]">{name}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* 折线图 (Area) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-0.5">知识库增长趋势</h2>
              <p className="text-xs text-gray-400 mb-4">过去 30 天累计文档数</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.trendData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                  <Tooltip formatter={(v: number) => [`${v} 篇`, '累计文档']} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 雷达图 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-0.5">知识能力雷达</h2>
              <p className="text-xs text-gray-400 mb-4">基于文档分布自动生成</p>
              {data.radarData.length < 3 ? (
                <div className="flex flex-col items-center justify-center h-[180px] gap-2">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">至少需要 3 个领域</p>
                  <p className="text-xs text-gray-300">继续添加不同领域的内容</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={data.radarData}>
                    <defs>
                      <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Radar dataKey="value" stroke="#6366f1" fill="url(#radarGrad)" strokeWidth={2} />
                    <Tooltip formatter={(v: number) => [`${v}`, '相对比重']} contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 底部成就条 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-800">知识库概览</h2>
              <Link href="/knowledge" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
                查看全部 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: '总文档', value: data.totalDocs, color: '#6366f1', bg: '#eef2ff' },
                { label: '本月新增', value: data.monthCount, color: '#10b981', bg: '#ecfdf5' },
                { label: '知识领域', value: data.pieData.length, color: '#f59e0b', bg: '#fffbeb' },
                { label: '学习天数', value: data.totalActiveDays, color: '#ec4899', bg: '#fdf2f8' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ backgroundColor: bg }}>
                  <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: color + 'aa' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* 成就/激励条 */}
            {data.streak > 0 ? (
              <div className="flex items-center gap-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
                <div className="text-3xl">
                  {data.streak >= 30 ? '🏆' : data.streak >= 14 ? '🥇' : data.streak >= 7 ? '🔥' : '⭐'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {data.streak >= 30 ? `连续 ${data.streak} 天，你是真正的知识猎人！`
                      : data.streak >= 14 ? `连续 ${data.streak} 天，坚持是最好的老师！`
                      : data.streak >= 7  ? `连续打卡一周，好习惯正在形成！`
                      : `已连续学习 ${data.streak} 天，继续保持！`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {data.streak < 7 ? `再坚持 ${7 - data.streak} 天解锁「一周达人」🎯`
                      : data.streak < 14 ? `再坚持 ${14 - data.streak} 天解锁「两周猛将」💪`
                      : data.streak < 30 ? `再坚持 ${30 - data.streak} 天解锁「月度霸主」👑`
                      : '已解锁所有成就，继续创造纪录！'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-orange-500">{data.streak}</span>
                  <p className="text-xs text-orange-400">连续天</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-dashed border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                    <Flame className="w-5 h-5 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">今天还没有记录</p>
                    <p className="text-xs text-gray-400 mt-0.5">每天一点，知识慢慢积累</p>
                  </div>
                </div>
                <Link href="/document/new"
                  className="px-4 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5">
                  立即记录 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
