'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore } from '@/lib/store'
import { generateId, formatDate } from '@/lib/utils'
import type { Block, BlockType } from '@/lib/types'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Save, Sparkles, Tag, Link2, FileText, Eye, Edit3,
  Bold, Italic, Code, Quote, List, ListOrdered, Minus, Image,
  ChevronDown, X, Send, Loader2, Languages, Hash,
} from 'lucide-react'

// ─── 初始块 ────────────────────────────────────────────────────
function createBlock(type: BlockType = 'paragraph', content = ''): Block {
  return { id: generateId(), type, content }
}

// ─── 块类型菜单 ──────────────────────────────────────────────
const BLOCK_TYPES: { type: BlockType; icon: React.ElementType; label: string }[] = [
  { type: 'paragraph',     icon: FileText,   label: '正文段落' },
  { type: 'heading1',      icon: Hash,       label: '一级标题' },
  { type: 'heading2',      icon: Hash,       label: '二级标题' },
  { type: 'heading3',      icon: Hash,       label: '三级标题' },
  { type: 'bulletList',    icon: List,       label: '无序列表' },
  { type: 'numberedList',  icon: ListOrdered,label: '有序列表' },
  { type: 'code',          icon: Code,       label: '代码块' },
  { type: 'quote',         icon: Quote,      label: '引用' },
  { type: 'divider',       icon: Minus,      label: '分割线' },
]

// ─── 单个块渲染 ──────────────────────────────────────────────
function BlockItem({ block, onChange, onKeyDown, onTypeChange, focused, onFocus }:
  { block: Block; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent) => void;
    onTypeChange: (t: BlockType) => void; focused: boolean; onFocus: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (focused && ref.current && document.activeElement !== ref.current) {
      ref.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      if (ref.current.lastChild) { range.setStartAfter(ref.current.lastChild); range.collapse(true) }
      else { range.setStart(ref.current, 0); range.collapse(true) }
      sel?.removeAllRanges(); sel?.addRange(range)
    }
  }, [focused])

  const styleMap: Record<BlockType, string> = {
    paragraph:    'text-base text-gray-700 leading-relaxed',
    heading1:     'text-3xl font-bold text-gray-900',
    heading2:     'text-2xl font-semibold text-gray-900',
    heading3:     'text-xl font-semibold text-gray-800',
    bulletList:   'text-base text-gray-700 pl-4 list-disc list-inside',
    numberedList: 'text-base text-gray-700 pl-4 list-decimal list-inside',
    code:         'font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl w-full',
    quote:        'text-base italic text-gray-500 border-l-4 border-blue-400 pl-4',
    divider:      '',
    image:        '',
  }

  if (block.type === 'divider') return <hr className="my-4 border-gray-200" />

  return (
    <div className={`group relative flex items-start gap-2 py-0.5 ${focused ? 'bg-blue-50/30 rounded-lg px-2 -mx-2' : ''}`}>
      {/* 块类型切换按钮 */}
      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity pt-1">
        <button
          onClick={() => setShowMenu(p => !p)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {showMenu && (
          <div className="absolute left-0 top-8 z-20 bg-white border border-gray-100 rounded-xl shadow-xl w-44 py-1 bubble-float">
            {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
              <button key={type} onClick={() => { onTypeChange(type); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="w-3.5 h-3.5 text-gray-400" />{label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 可编辑内容 */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={onFocus}
        onInput={(e) => onChange((e.target as HTMLElement).innerText)}
        onKeyDown={onKeyDown}
        className={`flex-1 min-h-[1.5em] outline-none ${styleMap[block.type]} focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300`}
        data-placeholder={block.type === 'heading1' ? '标题...' : block.type === 'code' ? '// 代码...' : '输入内容，键入 / 选择块类型...'}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    </div>
  )
}

// ─── Notion 式块编辑器 ───────────────────────────────────────
function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const [focusIdx, setFocusIdx] = useState(0)

  const update = (idx: number, content: string) => {
    const next = [...blocks]
    next[idx] = { ...next[idx], content }
    onChange(next)
  }

  const handleKey = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const next = [...blocks]
      next.splice(idx + 1, 0, createBlock('paragraph'))
      onChange(next)
      setFocusIdx(idx + 1)
    }
    if (e.key === 'Backspace' && blocks[idx].content === '' && blocks.length > 1) {
      e.preventDefault()
      const next = blocks.filter((_, i) => i !== idx)
      onChange(next)
      setFocusIdx(Math.max(0, idx - 1))
    }
  }

  return (
    <div className="block-editor-content space-y-1">
      {blocks.map((block, idx) => (
        <BlockItem
          key={block.id}
          block={block}
          focused={focusIdx === idx}
          onFocus={() => setFocusIdx(idx)}
          onChange={(v) => update(idx, v)}
          onKeyDown={handleKey(idx)}
          onTypeChange={(type) => {
            const next = [...blocks]
            next[idx] = { ...next[idx], type }
            onChange(next)
          }}
        />
      ))}
      <button
        onClick={() => { onChange([...blocks, createBlock()]); setFocusIdx(blocks.length) }}
        className="w-full text-left text-sm text-gray-300 hover:text-gray-400 py-2 pl-8 transition-colors"
      >
        点击添加新内容...
      </button>
    </div>
  )
}

// ─── AI 侧边栏 ───────────────────────────────────────────────
function AIPanel({ content, title, onClose }: { content: string; title: string; onClose: () => void }) {
  const [tab, setTab] = useState<'assistant' | 'summary' | 'translate'>('assistant')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [translated, setTranslated] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const askAI = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, context: content.slice(0, 2000), mode: 'document' }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '请配置 Claude API Key 后使用 AI 功能。' }])
    } finally { setLoading(false) }
  }

  const generateSummary = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `请为以下内容生成摘要（200字以内），并列出5个关键词：\n\n${content.slice(0, 3000)}`, mode: 'summary' }),
      })
      const data = await res.json()
      setSummary(data.reply)
    } catch { setSummary('请配置 Claude API Key 后使用 AI 摘要功能。') }
    finally { setLoading(false) }
  }

  const translate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `请将以下内容翻译为英文：\n\n${content.slice(0, 3000)}`, mode: 'translate' }),
      })
      const data = await res.json()
      setTranslated(data.reply)
    } catch { setTranslated('请配置 Claude API Key 后使用 AI 翻译功能。') }
    finally { setLoading(false) }
  }

  return (
    <div className="w-80 border-l border-gray-100 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">AI 助手</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { key: 'assistant', label: '对话', icon: Sparkles },
          { key: 'summary',   label: '摘要',  icon: FileText },
          { key: 'translate', label: '翻译',  icon: Languages },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              tab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'assistant' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400">
                  <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p>问 AI 任何关于这篇文档的问题</p>
                  <div className="mt-3 space-y-2">
                    {['总结这篇文档的要点', '这个主题有什么延伸阅读？', '帮我补充相关案例'].map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className="block w-full text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-500 rounded-lg px-3 py-2 text-left transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>{m.content}</div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-3 py-2 rounded-2xl">
                    <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-gray-100 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askAI()}
                placeholder="问点什么..." className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-300"
              />
              <button onClick={askAI} disabled={!input.trim() || loading}
                className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-700"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {tab === 'summary' && (
          <div className="p-4">
            {!summary ? (
              <button onClick={generateSummary} disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />生成中...</> : <><Sparkles className="w-4 h-4" />生成 AI 摘要</>}
              </button>
            ) : (
              <div>
                <div className="prose-mindnest text-xs text-gray-700 leading-relaxed mb-3">{summary}</div>
                <button onClick={() => setSummary('')} className="text-xs text-gray-400 hover:text-gray-600">重新生成</button>
              </div>
            )}
          </div>
        )}

        {tab === 'translate' && (
          <div className="p-4">
            {!translated ? (
              <button onClick={translate} disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />翻译中...</> : <><Languages className="w-4 h-4" />翻译为英文</>}
              </button>
            ) : (
              <div>
                <div className="text-xs text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">{translated}</div>
                <button onClick={() => setTranslated('')} className="text-xs text-gray-400 hover:text-gray-600">重新翻译</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 文档编辑器页面 ──────────────────────────────────────────
export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { documents, addDocument, updateDocument } = useMindNestStore()

  const isNew = params.id === 'new'
  const existing = !isNew ? documents.find(d => d.id === params.id) : null

  const [title, setTitle] = useState(existing?.title || '')
  const [tags, setTags] = useState<string[]>(existing?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (existing?.content) {
      return [{ id: generateId(), type: 'paragraph', content: existing.content.replace(/^#.*\n/, '') }]
    }
    return [createBlock('heading1'), createBlock('paragraph')]
  })
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [aiOpen, setAiOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isFile, setIsFile] = useState(!!existing?.file_url)

  const fullContent = blocks.map(b => b.content).join('\n\n')

  const save = async () => {
    if (!title.trim()) { toast.error('请输入文档标题'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    if (isNew) {
      const doc = {
        id: generateId(), title, content: fullContent, tags, keywords: [],
        source_type: 'manual' as const,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        word_count: fullContent.length, view_count: 0,
      }
      addDocument(doc)
      router.push(`/document/${doc.id}`)
    } else if (existing) {
      updateDocument(existing.id, { title, content: fullContent, tags, updated_at: new Date().toISOString() })
    }
    setSaving(false)
    toast.success('已保存')
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(t => [...t, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-screen bg-white">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 text-sm">
              <ArrowLeft className="w-4 h-4" />返回
            </button>
            <span className="text-gray-200">/</span>
            <span className="text-sm text-gray-500 truncate max-w-48">{title || '未命名文档'}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 编辑/预览切换 */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setMode('edit')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${mode === 'edit' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                <Edit3 className="w-3 h-3" />编辑
              </button>
              <button onClick={() => setMode('preview')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${mode === 'preview' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                <Eye className="w-3 h-3" />预览
              </button>
            </div>

            <button onClick={() => setAiOpen(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${aiOpen ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Sparkles className="w-3.5 h-3.5" />AI 助手
            </button>

            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              保存
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 编辑区 */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-12 py-10">
              {/* 标题 */}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="无标题文档"
                className="w-full text-4xl font-bold text-gray-900 border-none outline-none mb-2 placeholder-gray-200 bg-transparent"
              />

              {/* 元信息 */}
              <div className="flex items-center gap-4 mb-6 text-xs text-gray-400">
                {existing && <span>{formatDate(existing.updated_at)} 更新</span>}
                <span>{fullContent.length} 字</span>
              </div>

              {/* 标签 */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full">
                    {t}
                    <button onClick={() => setTags(ts => ts.filter(x => x !== t))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gray-300" />
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                    onBlur={addTag}
                    placeholder="添加标签..."
                    className="text-xs text-gray-400 outline-none bg-transparent w-24 placeholder-gray-300"
                  />
                </div>
              </div>

              <hr className="border-gray-100 mb-6" />

              {/* 文件预览 或 块编辑器 */}
              {isFile && existing?.file_type?.includes('pdf') ? (
                <div>
                  <iframe src={existing.file_url} className="w-full h-[600px] rounded-xl border border-gray-100" />
                </div>
              ) : mode === 'edit' ? (
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              ) : (
                <div className="prose-mindnest">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* AI 侧边栏 */}
          {aiOpen && <AIPanel content={fullContent} title={title} onClose={() => setAiOpen(false)} />}
        </div>
      </div>
    </AppLayout>
  )
}
