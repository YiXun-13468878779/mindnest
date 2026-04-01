'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore } from '@/lib/store'
import { generateId } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { ResearchTask } from '@/lib/types'
import {
  FlaskConical, CheckCircle2, Clock, XCircle, ArrowRight, Plus,
  Loader2, Sparkles, RotateCcw, ExternalLink,
} from 'lucide-react'

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: '已完成', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  running:   { icon: Clock,        label: '研究中',  color: 'text-blue-600',    bg: 'bg-blue-50',    dot: 'bg-blue-500 animate-pulse' },
  pending:   { icon: Clock,        label: '等待中',  color: 'text-gray-600',    bg: 'bg-gray-100',   dot: 'bg-gray-400' },
  failed:    { icon: XCircle,      label: '失败',    color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500' },
}

function ResearchCard({ task }: { task: ResearchTask }) {
  const { updateResearchTask, documents } = useMindNestStore()
  const cfg = STATUS_CONFIG[task.status]
  const Icon = cfg.icon
  const doc = task.result_doc_id ? documents.find(d => d.id === task.result_doc_id) : null

  const retry = () => {
    updateResearchTask(task.id, { status: 'running', error: undefined })
    setTimeout(() => updateResearchTask(task.id, { status: 'completed' }), 3000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <p className="text-sm font-semibold text-gray-800 truncate">{task.query}</p>
            <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color} flex-shrink-0`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
          </div>

          {task.status === 'running' && (
            <p className="text-xs text-gray-500">AI正在搜索相关资料，预计2分钟后完成</p>
          )}
          {task.status === 'completed' && doc && (
            <p className="text-xs text-gray-500">AI已完成研究，生成了包含核心知识的文档</p>
          )}
          {task.status === 'failed' && (
            <p className="text-xs text-red-500">{task.error}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>开始时间：{new Date(task.created_at).toLocaleString('zh-CN')}</span>
            {task.completed_at && <span>完成时间：{new Date(task.completed_at).toLocaleString('zh-CN')}</span>}
          </div>

          {doc && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <span>生成文档：</span>
              <Link href={`/document/${doc.id}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                {doc.title}<ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {task.status === 'completed' && doc && (
            <Link href={`/document/${doc.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
            >
              查看结果<ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {task.status === 'failed' && (
            <button onClick={retry} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              <RotateCcw className="w-3 h-3" />重新研究
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResearchPage() {
  const { researchTasks, addResearchTask, addDocument } = useMindNestStore()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const startResearch = async () => {
    if (!query.trim()) return
    const task: ResearchTask = {
      id: generateId(), query: query.trim(), status: 'running',
      created_at: new Date().toISOString(),
    }
    addResearchTask(task)
    setQuery('')
    setLoading(false)
    toast.success('研究任务已启动，完成后将通知你')

    // 模拟研究过程
    setTimeout(() => {
      const docId = generateId()
      addDocument({
        id: docId, title: `研究：${task.query}`,
        content: `# ${task.query}\n\n## 概述\n\nAI 已完成对该主题的深度研究，以下是综合分析结果。\n\n## 核心概念\n\n- 关键概念 1\n- 关键概念 2\n- 关键概念 3\n\n## 主要发现\n\n根据多源信息综合分析...\n\n## 延伸阅读\n\n- 推荐资源 1\n- 推荐资源 2`,
        summary: `AI 深度研究报告：${task.query}`,
        keywords: [task.query], tags: ['AI研究'],
        source_type: 'research',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        word_count: 500, view_count: 0,
      })
      // 更新任务状态（通过重新渲染时 store 已更新）
      toast.success(`「${task.query}」研究完成！`)
    }, 8000)
  }

  const SUGGESTIONS = [
    'React 18 并发特性详解', 'LLM 大语言模型原理', 'Product-Led Growth 增长策略',
    'TypeScript 装饰器模式', 'CSS 动画性能优化',
  ]

  return (
    <AppLayout>
      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <input placeholder="搜索知识库..." className="w-80 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-300" />
        <Link href="/document/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />新建文档
        </Link>
      </div>

      <div className="p-6 max-w-4xl">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-orange-500" />AI研究助手
          </h1>
          <p className="text-sm text-gray-500 mt-1">让AI帮你深入研究任何知识点</p>
        </div>

        {/* 研究输入框 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">研究主题</label>
          <div className="flex gap-3 mb-3">
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startResearch()}
              placeholder="例如：帮我研究一下TypeScript的高级类型系统..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
            />
            <button
              onClick={startResearch} disabled={!query.trim() || loading}
              className="px-6 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              开始研究
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />AI将自动搜索相关资料并生成结构化知识文档
          </p>

          {/* 快捷建议 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">热门研究主题：</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setQuery(s)}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-lg hover:bg-orange-100 transition-colors border border-orange-100">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 研究历史 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">研究历史</h2>
          <div className="space-y-3">
            {researchTasks.map(task => <ResearchCard key={task.id} task={task} />)}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
