'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore, MOCK_ACTIVITIES } from '@/lib/store'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { TrendingUp, Calendar, Target, Award, ChevronDown, Plus, FileText } from 'lucide-react'

const PIE_DATA = [
  { name: '前端开发', value: 45, color: '#3B82F6' },
  { name: 'AI技术', value: 25, color: '#8B5CF6' },
  { name: '产品设计', value: 20, color: '#EC4899' },
  { name: '其他', value: 10, color: '#D1D5DB' },
]

const TREND_DATA = [
  { date: '1月1日', docs: 2 }, { date: '1月5日', docs: 5 }, { date: '1月10日', docs: 8 },
  { date: '1月15日', docs: 12 }, { date: '1月20日', docs: 20 }, { date: '1月25日', docs: 28 },
  { date: '1月30日', docs: 35 },
]

const RADAR_DATA = [
  { subject: '前端', A: 85 }, { subject: 'AI/ML', A: 70 }, { subject: '产品', A: 60 },
  { subject: '数据', A: 45 }, { subject: '系统', A: 30 }, { subject: '算法', A: 55 },
]

export default function InsightsPage() {
  const [period, setPeriod] = useState('最近7天')
  const { documents } = useMindNestStore()

  const stats = [
    { icon: TrendingUp, label: '本周新增', value: 15, sub: '+3 较上周', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Calendar,   label: '学习天数', value: 28, sub: '近30天内', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Target,     label: '目标完成', value: '85%', sub: '本月目标', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: Award,      label: '连续学习', value: '7天', sub: '打卡记录', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <AppLayout>
      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <input placeholder="搜索知识库..." className="w-80 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-300" />
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium"><Plus className="w-4 h-4" />新建文档</button>
      </div>

      <div className="p-6 max-w-6xl">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">学习洞察</h1>
            <p className="text-sm text-gray-500">分析你的学习进度和知识结构</p>
          </div>
          <select
            value={period} onChange={e => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 focus:outline-none focus:border-blue-300 bg-white"
          >
            {['最近7天', '最近30天', '最近3个月', '全部'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* 学习统计柱状图 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">本周学习统计</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_ACTIVITIES} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="docs_created" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 知识领域饼图 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">知识领域分布</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {PIE_DATA.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600">{name}</span>
                    <span className="text-xs font-semibold text-gray-800 ml-auto">{value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* 学习进度趋势 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">学习进度趋势</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="docs" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 知识雷达图 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">知识能力雷达</h2>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Radar name="知识掌握度" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI 日报 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">AI 智能日报</h2>
            <span className="text-xs text-gray-400">今日 · 2024年1月20日</span>
          </div>
          <div className="gradient-welcome rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold">今日小结：</span>
              今天你深入学习了 React Hooks 相关知识，新增了 2 篇文档，完成了 1 个研究任务。
              你的前端开发知识体系正在逐步完善，建议下一步探索 TypeScript 高级类型，与你现有的 React 知识高度关联。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '今日新增文档', value: '2 篇', icon: FileText },
              { label: 'AI 处理次数', value: '5 次', icon: TrendingUp },
              { label: '学习时长', value: '45 分钟', icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
