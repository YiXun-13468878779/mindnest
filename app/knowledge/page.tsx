'use client'
import { useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore, MOCK_FOLDERS } from '@/lib/store'
import { formatDate, generateId } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  Plus, Upload, List, Grid3x3, Search, Folder, FolderOpen,
  FileText, Eye, Clock, Trash2, Edit3, X, Link2,
  ChevronDown, ChevronRight, Settings, Filter,
  Sparkles, Loader2, Zap, Brain, ArrowRight, Tag,
} from 'lucide-react'

// ─── 文件夹树 ─────────────────────────────────────────────────
function FolderItem({ folder, level = 0 }: { folder: typeof MOCK_FOLDERS[0]; level?: number }) {
  const [open, setOpen] = useState(true)
  const { selectedFolderId, setSelectedFolderId } = useMindNestStore()
  const selected = selectedFolderId === folder.id
  return (
    <div>
      <button
        onClick={() => { if (folder.children?.length) setOpen(p => !p); setSelectedFolderId(selected ? null : folder.id) }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${selected ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        style={{ paddingLeft: `${8 + level * 12}px` }}
      >
        {folder.children?.length ? (open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />) : <span className="w-3" />}
        {open ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />}
        <span className="flex-1 text-left truncate">{folder.name}</span>
        <span className="text-xs text-gray-400">{folder.doc_count}</span>
      </button>
      {open && folder.children?.map(child => <FolderItem key={child.id} folder={child} level={level + 1} />)}
    </div>
  )
}

// ─── 文件读取 ─────────────────────────────────────────────────
async function readFileContent(file: File): Promise<{ text: string; dataUrl: string }> {
  return new Promise((resolve) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isText = ['md', 'txt', 'markdown'].includes(ext) || file.type.startsWith('text/')
    if (isText) {
      const r = new FileReader()
      r.onload = e => resolve({ text: e.target?.result as string || '', dataUrl: '' })
      r.readAsText(file, 'utf-8')
    } else {
      const r = new FileReader()
      r.onload = () => resolve({ text: '', dataUrl: r.result as string })
      r.readAsDataURL(file)
    }
  })
}

// ─── 上传 Modal ───────────────────────────────────────────────
function UploadModal({ onClose }: { onClose: () => void }) {
  const { addDocument } = useMindNestStore()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<Record<string, string>>({})

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      setProgress(p => ({ ...p, [file.name]: '读取中...' }))
      const { text, dataUrl } = await readFileContent(file)
      setProgress(p => ({ ...p, [file.name]: 'AI分析中...' }))
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const isPdf = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')
      const isText = ['md', 'txt', 'markdown'].includes(ext) || file.type.startsWith('text/')
      let content = isText && text ? text
        : isPdf ? `# ${file.name.replace(/\.[^.]+$/, '')}\n\n> PDF 已上传\n\n文件大小：${(file.size / 1024).toFixed(0)} KB`
        : isImage ? `# ${file.name.replace(/\.[^.]+$/, '')}\n\n> 图片已上传\n\n文件大小：${(file.size / 1024).toFixed(0)} KB`
        : `# ${file.name.replace(/\.[^.]+$/, '')}\n\n文件类型：${file.type}\n文件大小：${(file.size / 1024).toFixed(0)} KB`
      let summary = `从文件 ${file.name} 导入`, keywords: string[] = [], tags = ['文件导入'], category = '文件'
      try {
        const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: (text || file.name).slice(0, 2000), title: file.name }) })
        const data = await res.json()
        if (data.summary) summary = data.summary
        if (data.keywords) keywords = data.keywords
        if (data.tags) tags = [...data.tags, '文件导入']
        if (data.category) category = data.category
      } catch { /* AI 分析失败不阻断上传 */ }
      addDocument({ id: generateId(), title: file.name.replace(/\.[^.]+$/, ''), content, summary, keywords, tags, category, source_type: 'file', file_type: file.type, file_name: file.name, file_data: dataUrl || undefined, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), word_count: text.length || 0, view_count: 0 })
      setProgress(p => ({ ...p, [file.name]: '✓ 已加入知识库' }))
      toast.success(`${file.name} 已加入知识库`)
    }
    setUploading(false)
    setTimeout(onClose, 800)
  }, [addDocument, onClose])

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.txt'], 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] } })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[520px] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">上传文件到知识库</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
            <input {...getInputProps()} />
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Upload className="w-6 h-6 text-gray-400" /></div>
            <p className="text-gray-700 font-medium mb-1">{isDragActive ? '松开以上传文件' : '拖拽文件到此处或点击选择文件'}</p>
            <button className="mt-3 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">选择文件</button>
            <p className="text-xs text-gray-400 mt-3">支持 PDF、Word、Markdown、文本、图片等格式</p>
          </div>
          {acceptedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {acceptedFiles.map(f => (
                <div key={f.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="flex-1 truncate text-gray-700">{f.name}</span>
                  <span className="text-gray-400 mr-2">{(f.size / 1024).toFixed(0)}KB</span>
                  {progress[f.name] && <span className={`text-xs ${progress[f.name].startsWith('✓') ? 'text-green-500' : 'text-blue-500'}`}>{progress[f.name]}</span>}
                </div>
              ))}
            </div>
          )}
          {uploading && <div className="mt-4 flex items-center gap-3 text-sm text-blue-600"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />正在处理文件并进行 AI 分析...</div>}
        </div>
      </div>
    </div>
  )
}

// ─── 文档卡片 ─────────────────────────────────────────────────
function DocumentCard({ doc, view }: { doc: import('@/lib/types').Document; view: 'list' | 'grid' }) {
  const { deleteDocument } = useMindNestStore()
  const sourceLabel: Record<string, string> = { manual: '手动创建', link: '链接导入', file: '文件导入', research: 'AI研究' }
  const sourceBg: Record<string, string> = { manual: 'bg-gray-100 text-gray-600', link: 'bg-pink-50 text-pink-600', file: 'bg-yellow-50 text-yellow-600', research: 'bg-purple-50 text-purple-600' }

  if (view === 'list') {
    return (
      <div className="doc-card flex items-start gap-4 group">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-gray-400" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <Link href={`/document/${doc.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 truncate">{doc.title}</Link>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${sourceBg[doc.source_type]}`}>{sourceLabel[doc.source_type]}</span>
            {doc.enrichment_status === 'done' && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex-shrink-0">已研究</span>}
          </div>
          <p className="text-xs text-gray-400 truncate mb-2">{doc.summary}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {doc.tags.slice(0, 3).map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t}</span>)}
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.word_count} 字</span>
              <span>{formatDate(doc.updated_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/document/${doc.id}`} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit3 className="w-3.5 h-3.5 text-gray-400" /></Link>
          <button onClick={() => { deleteDocument(doc.id); toast.success('已删除') }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
        </div>
      </div>
    )
  }
  return (
    <div className="doc-card group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center"><FileText className="w-4 h-4 text-gray-400" /></div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${sourceBg[doc.source_type]}`}>{sourceLabel[doc.source_type]}</span>
      </div>
      <Link href={`/document/${doc.id}`}><h3 className="text-sm font-semibold text-gray-800 hover:text-blue-600 mb-1.5 line-clamp-2">{doc.title}</h3></Link>
      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{doc.summary}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">{doc.tags.slice(0, 2).map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t}</span>)}</div>
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count} 次查看</span>
        <span>{formatDate(doc.updated_at)}</span>
      </div>
    </div>
  )
}

// ─── 平台徽章 ─────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { label: string; color: string }> = {
    bilibili: { label: 'B站视频', color: 'bg-pink-50 text-pink-600 border-pink-100' },
    arxiv: { label: '学术论文', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    youtube: { label: 'YouTube', color: 'bg-red-50 text-red-600 border-red-100' },
    wechat: { label: '微信公众号', color: 'bg-green-50 text-green-600 border-green-100' },
    zhihu: { label: '知乎', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    general: { label: '网页', color: 'bg-gray-50 text-gray-600 border-gray-100' },
  }
  const cfg = map[platform] || map.general
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
}

// ─── 链接捕捉 Tab ─────────────────────────────────────────────
function LinkCaptureTab() {
  const { addDocument, updateDocument } = useMindNestStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'idle' | 'fetching' | 'analyzing' | 'done'>('idle')
  const [result, setResult] = useState<Record<string, any> | null>(null)
  const [activeTab, setActiveTab] = useState<'ai' | 'enrich'>('ai')
  const [enrichmentText, setEnrichmentText] = useState('')
  const [enriching, setEnriching] = useState(false)
  const [enrichmentDone, setEnrichmentDone] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<string | null>(null)
  const [enrichMode, setEnrichMode] = useState<'summarize' | 'research' | null>(null)
  const [enrichSuggestion, setEnrichSuggestion] = useState<'summarize' | 'research'>('research')
  const [depthReason, setDepthReason] = useState('')

  const STEP_LABELS = { idle: '', fetching: '正在抓取页面内容...', analyzing: 'AI 分析整理中...', done: '分析完成' }

  const doSave = (data: Record<string, any>, rawUrl: string) => {
    const docId = generateId()
    addDocument({ id: docId, title: data.title || '链接内容', content: `# ${data.title}\n\n${data.ai_analysis || data.summary || ''}`, summary: data.summary || '', keywords: data.keywords || [], tags: [...(data.tags || []), '链接捕捉'], category: data.category || '未分类', source_type: 'link', source_url: data.captured_url || rawUrl, captured_url: data.captured_url || rawUrl, platform: data.platform, video_id: data.videoId, raw_text: data.raw_text, ai_analysis: data.ai_analysis, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), word_count: (data.ai_analysis || '').length, view_count: 0 })
    return docId
  }

  const startEnrichment = async (docId: string, data: Record<string, any>, mode: 'summarize' | 'research') => {
    setEnrichMode(mode); setEnriching(true); setEnrichmentDone(false); setEnrichmentText(''); setActiveTab('enrich')
    updateDocument(docId, { enrichment_status: 'running' })
    try {
      const res = await fetch('/api/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: data.title, summary: data.summary, ai_analysis: data.ai_analysis, raw_text: data.raw_text, platform: data.platform, url: data.captured_url, category: data.category, mode }) })
      if (!res.ok || !res.body) throw new Error('深度研究请求失败')
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let fullText = ''
      while (true) { const { done, value } = await reader.read(); if (done) break; fullText += decoder.decode(value, { stream: true }); setEnrichmentText(fullText) }
      updateDocument(docId, { enrichment: fullText, enrichment_status: 'done' })
      setEnrichmentDone(true)
      toast.success(mode === 'summarize' ? '智能总结完成' : '深度研究完成')
    } catch { updateDocument(docId, { enrichment_status: 'error' }) }
    finally { setEnriching(false) }
  }

  const capture = async () => {
    if (!url.trim()) return
    setLoading(true); setResult(null); setStep('fetching')
    try {
      await new Promise(r => setTimeout(r, 400)); setStep('analyzing')
      const res = await fetch('/api/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) })
      if (!res.ok) throw new Error('服务器错误 ' + res.status)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const savedDocId = doSave(data, url.trim())
      setCurrentDocId(savedDocId)
      setResult(data)
      setEnrichSuggestion(data.enrich_suggestion || 'research')
      setDepthReason(data.depth_reason || '')
      setStep('done')
      toast.success('已保存到知识库')
    } catch (e: any) { toast.error(e.message); setStep('idle') }
    finally { setLoading(false) }
  }

  const reset = () => { setUrl(''); setResult(null); setStep('idle'); setEnrichmentText(''); setEnrichmentDone(false); setCurrentDocId(null); setEnrichMode(null) }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* 输入区 */}
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center"><Link2 className="w-4 h-4 text-pink-500" /></div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">智能链接捕捉</h2>
              <p className="text-xs text-gray-400">支持 B站、知乎、arXiv、微信公众号、YouTube 等</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && capture()} placeholder="粘贴链接地址..." className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-300 focus:bg-white bg-gray-50 transition-all" disabled={loading} />
            <button onClick={capture} disabled={loading || !url.trim()} className="px-5 py-3 bg-pink-500 text-white rounded-xl text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? STEP_LABELS[step] : '捕捉'}
            </button>
          </div>
        </div>

        {/* 结果区 */}
        {result && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <PlatformBadge platform={result.platform || 'general'} />
              <h3 className="text-base font-semibold text-gray-900 flex-1 truncate">{result.title}</h3>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>

            {/* AI 建议卡 */}
            {!enrichMode && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800 mb-1">AI 建议：{enrichSuggestion === 'summarize' ? '智能总结' : '深度研究'}</p>
                    <p className="text-xs text-blue-600 mb-3">{depthReason || (enrichSuggestion === 'summarize' ? '内容已足够完整，结构化总结即可' : '内容较短，建议补充背景知识和延伸研究')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => currentDocId && startEnrichment(currentDocId, result, 'summarize')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${enrichSuggestion === 'summarize' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}>智能总结</button>
                      <button onClick={() => currentDocId && startEnrichment(currentDocId, result, 'research')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${enrichSuggestion === 'research' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}>深度研究</button>
                      <Link href={currentDocId ? `/document/${currentDocId}` : '#'} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 ml-auto">查看文档 <ArrowRight className="w-3 h-3 inline" /></Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab */}
            <div className="flex gap-1 mb-4 bg-gray-50 rounded-xl p-1">
              {(['ai', 'enrich'] as const).filter(t => t === 'ai' || enrichMode).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t === 'ai' ? 'AI 整理' : enrichMode === 'summarize' ? '智能总结' : '深度研究'}
                  {t === 'enrich' && enriching && <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />}
                  {t === 'enrich' && enrichmentDone && <span className="ml-1 text-green-500">✓</span>}
                </button>
              ))}
            </div>

            <div className="prose prose-sm max-w-none">
              {activeTab === 'ai' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.ai_analysis || result.summary || ''}</ReactMarkdown>}
              {activeTab === 'enrich' && (
                enriching && !enrichmentText ? <div className="flex items-center gap-2 text-sm text-gray-400 py-4"><Loader2 className="w-4 h-4 animate-spin" />AI 正在研究中...</div>
                  : <ReactMarkdown remarkPlugins={[remarkGfm]}>{enrichmentText}</ReactMarkdown>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 闪念笔记 Tab ─────────────────────────────────────────────
function FlashNotesTab() {
  const { addDocument, documents, deleteDocument } = useMindNestStore()
  const [text, setText] = useState('')
  const [tag, setTag] = useState('闪念')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const save = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const title = trimmed.split('\n')[0].slice(0, 60) || '快速笔记'
    addDocument({ id: generateId(), title, content: trimmed, summary: trimmed.slice(0, 120), keywords: [], tags: [tag || '闪念'], source_type: 'manual', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), word_count: trimmed.length, view_count: 0 })
    setText('')
    toast.success(`已记录：${title.slice(0, 18)}${title.length > 18 ? '…' : ''}`)
    textareaRef.current?.focus()
  }

  const flashDocs = documents.filter(d => d.source_type === 'manual').slice(0, 20)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 输入区 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-amber-500" /></div>
          <span className="text-sm font-semibold text-gray-700">闪念胶囊</span>
          <span className="text-xs text-gray-400">· Enter 保存，Shift+Enter 换行</span>
        </div>
        <div className="px-5 pb-4">
          <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }} placeholder="记录一个想法、观点或问题..." rows={3} className="w-full resize-none bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all leading-relaxed" />
          {text.trim() && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <input value={tag} onChange={e => setTag(e.target.value)} placeholder="标签" className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-20 focus:outline-none focus:border-amber-300" />
              </div>
              <button onClick={save} className="ml-auto px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors">保存闪念</button>
            </div>
          )}
        </div>
      </div>

      {/* 历史闪念 */}
      {flashDocs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-700">历史笔记 <span className="text-gray-400 font-normal text-xs">({flashDocs.length})</span></p>
          </div>
          <div className="divide-y divide-gray-50">
            {flashDocs.map(doc => (
              <div key={doc.id} className="px-5 py-3 group flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <Link href={`/document/${doc.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate block">{doc.title}</Link>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{doc.summary?.slice(0, 60)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">{t}</span>)}
                    <span className="text-[10px] text-gray-400 ml-auto">{formatDate(doc.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => { deleteDocument(doc.id); toast.success('已删除') }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI 批量整理 ──────────────────────────────────────────────
function AIOrganizeButton() {
  const { documents, updateDocument } = useMindNestStore()
  const [organizing, setOrganizing] = useState(false)
  const [done, setDone] = useState(false)

  const organize = async () => {
    if (organizing || documents.length === 0) return
    setOrganizing(true); setDone(false)
    try {
      const res = await fetch('/api/organize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: documents.map(d => ({ id: d.id, title: d.title, tags: d.tags, summary: d.summary, category: d.category })) }) })
      const data = await res.json()
      if (data.updates) {
        data.updates.forEach((u: any) => updateDocument(u.id, { category: u.category, tags: u.tags }))
        toast.success(`AI 已整理 ${data.updates.length} 篇文档`)
        setDone(true)
      }
    } catch { toast.error('整理失败，请重试') }
    finally { setOrganizing(false) }
  }

  return (
    <button onClick={organize} disabled={organizing || documents.length === 0} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-md disabled:opacity-50 transition-all">
      {organizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
      {organizing ? 'AI 整理中...' : done ? '重新整理' : 'AI 批量整理'}
    </button>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────
const TABS = [
  { key: 'docs', label: '文档库', icon: FileText },
  { key: 'capture', label: '链接捕捉', icon: Link2 },
  { key: 'flash', label: '闪念笔记', icon: Zap },
] as const

function KnowledgePageInner() {
  const searchParams = useSearchParams()
  const initTab = (searchParams.get('tab') as typeof TABS[number]['key']) || 'docs'
  const { documents, folders, selectedFolderId, setSelectedFolderId } = useMindNestStore()
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>(initTab)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDateRange, setFilterDateRange] = useState<string>('all')

  const allCategories = Array.from(new Set(documents.map(d => d.category).filter(Boolean))) as string[]

  const filtered = documents.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.tags.some(t => t.includes(search)) && !d.summary?.includes(search)) return false
    if (selectedFolderId === '__unclassified__' && d.folder_id) return false
    else if (selectedFolderId && selectedFolderId !== '__unclassified__' && d.folder_id !== selectedFolderId) return false
    if (filterSource !== 'all' && d.source_type !== filterSource) return false
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (filterDateRange !== 'all') {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[filterDateRange] || 0
      if (new Date(d.created_at).getTime() < Date.now() - days * 86400000) return false
    }
    return true
  })

  return (
    <AppLayout>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索知识库..." className="w-80 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-all" />
        <div className="flex items-center gap-3">
          <AIOrganizeButton />
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"><Upload className="w-4 h-4" />上传文件</button>
          <Link href="/document/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />新建文档</Link>
        </div>
      </div>

      <div className="flex flex-1">
        {/* 左侧：知识结构 */}
        <div className="w-56 border-r border-gray-100 bg-white p-4 flex flex-col gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">知识结构</span>
              <button className="text-gray-400 hover:text-gray-600"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-0.5">
              <button onClick={() => setSelectedFolderId(null)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${!selectedFolderId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span className="w-3" /><FileText className="w-4 h-4 text-blue-400" /><span className="flex-1 text-left">全部文档</span><span className="text-xs text-gray-400">{documents.length}</span>
              </button>
              <button onClick={() => setSelectedFolderId('__unclassified__')} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${selectedFolderId === '__unclassified__' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span className="w-3" /><Link2 className="w-4 h-4 text-pink-400" /><span className="flex-1 text-left">未归类</span><span className="text-xs text-gray-400">{documents.filter(d => !d.folder_id).length}</span>
              </button>
              {folders.map(f => <FolderItem key={f.id} folder={f} />)}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">自动整理</span>
              <Settings className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
            </div>
            <p className="text-xs text-gray-400">点击顶部「AI 批量整理」自动分类所有文档</p>
          </div>
        </div>

        {/* 右侧主区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab 切换 */}
          <div className="flex items-center gap-1 px-6 pt-5 pb-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-medium transition-colors border-b-2 ${activeTab === key ? 'text-blue-700 border-blue-500 bg-blue-50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          <div className="border-b border-gray-100 mx-0" />

          <div className="flex-1 overflow-y-auto p-6">
            {/* 文档库 Tab */}
            {activeTab === 'docs' && (
              <>
                {/* 工具栏 */}
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-base font-bold text-gray-900">知识库 <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h1>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}><List className="w-4 h-4" /></button>
                    <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}><Grid3x3 className="w-4 h-4" /></button>
                  </div>
                </div>
                {/* 筛选 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[{ key: 'all', label: '全部' }, { key: 'manual', label: '📝 手动' }, { key: 'link', label: '🔗 链接' }, { key: 'file', label: '📁 文件' }, { key: 'research', label: '🔬 AI研究' }].map(({ key, label }) => (
                    <button key={key} onClick={() => setFilterSource(key)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterSource === key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>{label}</button>
                  ))}
                  {allCategories.slice(0, 4).map(cat => (
                    <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterCategory === cat ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>{cat}</button>
                  ))}
                  {(filterSource !== 'all' || filterCategory !== 'all') && (
                    <button onClick={() => { setFilterSource('all'); setFilterCategory('all') }} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><X className="w-3 h-3" />清除</button>
                  )}
                </div>
                {/* 文档列表 */}
                {view === 'list' ? (
                  <div className="space-y-3">{filtered.map(doc => <DocumentCard key={doc.id} doc={doc} view="list" />)}</div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">{filtered.map(doc => <DocumentCard key={doc.id} doc={doc} view="grid" />)}</div>
                )}
                {filtered.length === 0 && (
                  <div className="text-center py-20">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">暂无文档</p>
                    <button onClick={() => setActiveTab('capture')} className="mt-3 text-blue-600 text-sm hover:underline">去捕捉第一个链接</button>
                  </div>
                )}
              </>
            )}

            {/* 链接捕捉 Tab */}
            {activeTab === 'capture' && <LinkCaptureTab />}

            {/* 闪念笔记 Tab */}
            {activeTab === 'flash' && <FlashNotesTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>}>
      <KnowledgePageInner />
    </Suspense>
  )
}
