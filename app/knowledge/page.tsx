'use client'
import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore, MOCK_FOLDERS } from '@/lib/store'
import { formatDate, generateId } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Plus, Upload, List, Grid3x3, Filter, Search, Folder, FolderOpen,
  FileText, Eye, Clock, Trash2, Edit3, MoreHorizontal, ChevronDown,
  ChevronRight, Settings, X, Link2,
} from 'lucide-react'

// ─── 文件夹树 ─────────────────────────────────────────────────
function FolderItem({ folder, level = 0 }: { folder: typeof MOCK_FOLDERS[0]; level?: number }) {
  const [open, setOpen] = useState(true)
  const { selectedFolderId, setSelectedFolderId } = useMindNestStore()
  const selected = selectedFolderId === folder.id

  return (
    <div>
      <button
        onClick={() => {
          if (folder.children?.length) setOpen(p => !p)
          // 再次点击已选文件夹则取消选中（显示全部）
          setSelectedFolderId(selected ? null : folder.id)
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
          selected ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${8 + level * 12}px` }}
      >
        {folder.children?.length ? (
          open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />
        ) : <span className="w-3" />}
        {open ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />}
        <span className="flex-1 text-left truncate">{folder.name}</span>
        <span className="text-xs text-gray-400">{folder.doc_count}</span>
      </button>
      {open && folder.children?.map(child => (
        <FolderItem key={child.id} folder={child} level={level + 1} />
      ))}
    </div>
  )
}

// ─── 上传 Modal ───────────────────────────────────────────────
// 读取文件内容为文本或 data URL
async function readFileContent(file: File): Promise<{ text: string; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      // PDF/图片读为 dataURL（可预览）
      const textReader = new FileReader()
      textReader.onload = () => {
        const dataReader = new FileReader()
        dataReader.onload = () => resolve({ text: '', dataUrl: dataReader.result as string })
        dataReader.readAsDataURL(file)
      }
      textReader.readAsText(file)
      // 直接走 dataURL
      const dr = new FileReader()
      dr.onload = () => resolve({ text: '', dataUrl: dr.result as string })
      dr.readAsDataURL(file)
    } else {
      // 文本类文件直接读内容
      reader.onload = (e) => resolve({ text: e.target?.result as string || '', dataUrl: '' })
      reader.readAsText(file, 'utf-8')
    }
  })
}

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

      // 构建可预览内容
      let content = ''
      if (isText && text) {
        content = text
      } else if (isPdf) {
        content = `# ${file.name.replace(/\.[^.]+$/, '')}\n\n> PDF 文件已上传，点击下方预览按钮查看原文\n\n文件大小：${(file.size / 1024).toFixed(0)} KB`
      } else if (isImage) {
        content = `# ${file.name.replace(/\.[^.]+$/, '')}\n\n> 图片文件已上传\n\n文件大小：${(file.size / 1024).toFixed(0)} KB`
      } else {
        content = `# ${file.name.replace(/\.[^.]+$/, '')}\n\n文件类型：${file.type || ext}\n文件大小：${(file.size / 1024).toFixed(0)} KB\n\n> 该文件格式暂不支持直接预览内容，可下载查看。`
      }

      // 尝试 AI 分析
      let summary = `从文件 ${file.name} 导入`
      let keywords: string[] = []
      let tags = ['文件导入']
      let category = '文件'
      try {
        const res = await fetch('/api/documents', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: (text || file.name).slice(0, 2000), title: file.name }),
        })
        const data = await res.json()
        if (data.summary) summary = data.summary
        if (data.keywords) keywords = data.keywords
        if (data.tags) tags = [...data.tags, '文件导入']
        if (data.category) category = data.category
      } catch { /* AI 分析失败不阻断上传 */ }

      const doc = {
        id: generateId(),
        title: file.name.replace(/\.[^.]+$/, ''),
        content,
        summary,
        keywords,
        tags,
        category,
        source_type: 'file' as const,
        file_type: file.type,
        file_name: file.name,
        file_data: dataUrl || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        word_count: text.length || 0,
        view_count: 0,
      }
      addDocument(doc)
      setProgress(p => ({ ...p, [file.name]: '✓ 已加入知识库' }))
      toast.success(`${file.name} 已加入知识库`)
    }
    setUploading(false)
    setTimeout(onClose, 800)
  }, [addDocument, onClose])

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md', '.markdown'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[520px] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">上传文件到知识库</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-700 font-medium mb-1">
              {isDragActive ? '松开以上传文件' : '拖拽文件到此处或点击选择文件'}
            </p>
            <button className="mt-3 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
              选择文件
            </button>
            <p className="text-xs text-gray-400 mt-3">支持 PDF、Word、Markdown、文本、图片等格式</p>
          </div>

          {acceptedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {acceptedFiles.map(f => (
                <div key={f.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="flex-1 truncate text-gray-700">{f.name}</span>
                  <span className="text-gray-400 mr-2">{(f.size / 1024).toFixed(0)}KB</span>
                  {progress[f.name] && (
                    <span className={`text-xs ${progress[f.name].startsWith('✓') ? 'text-green-500' : 'text-blue-500'}`}>
                      {progress[f.name]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="mt-4 flex items-center gap-3 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              正在处理文件并进行 AI 分析...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 文档卡片 ─────────────────────────────────────────────────
function DocumentCard({ doc, view }: { doc: import('@/lib/types').Document; view: 'list' | 'grid' }) {
  const { deleteDocument } = useMindNestStore()
  const [menu, setMenu] = useState(false)

  const tagColors: Record<string, string> = {
    'React': 'bg-blue-50 text-blue-600',
    '前端开发': 'bg-indigo-50 text-indigo-600',
    '机器学习': 'bg-orange-50 text-orange-600',
    'AI': 'bg-purple-50 text-purple-600',
    '产品设计': 'bg-pink-50 text-pink-600',
    'TypeScript': 'bg-cyan-50 text-cyan-600',
  }

  const sourceLabel: Record<string, string> = {
    manual: '手动创建', link: '链接导入', file: '文件导入', research: 'AI研究',
  }
  const sourceBg: Record<string, string> = {
    manual: 'bg-gray-100 text-gray-600', link: 'bg-pink-50 text-pink-600',
    file: 'bg-yellow-50 text-yellow-600', research: 'bg-purple-50 text-purple-600',
  }

  if (view === 'list') {
    return (
      <div className="doc-card flex items-start gap-4 group">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <Link href={`/document/${doc.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 truncate">
              {doc.title}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${sourceBg[doc.source_type]}`}>
              {sourceLabel[doc.source_type]}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate mb-2">{doc.summary}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {doc.tags.slice(0, 3).map(t => (
              <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${tagColors[t] || 'bg-gray-100 text-gray-500'}`}>{t}</span>
            ))}
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.word_count} 字</span>
              <span>{formatDate(doc.updated_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/document/${doc.id}`} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit3 className="w-3.5 h-3.5 text-gray-400" /></Link>
          <button onClick={() => { deleteDocument(doc.id); toast.success('已删除') }} className="p-1.5 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="doc-card group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
          <FileText className="w-4 h-4 text-gray-400" />
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${sourceBg[doc.source_type]}`}>
          {sourceLabel[doc.source_type]}
        </span>
      </div>
      <Link href={`/document/${doc.id}`}>
        <h3 className="text-sm font-semibold text-gray-800 hover:text-blue-600 mb-1.5 line-clamp-2">{doc.title}</h3>
      </Link>
      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{doc.summary}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {doc.tags.slice(0, 2).map(t => (
          <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${tagColors[t] || 'bg-gray-100 text-gray-500'}`}>{t}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count} 次查看</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.word_count} 字</span>
        <span>{formatDate(doc.updated_at)}</span>
      </div>
    </div>
  )
}

// ─── 知识库页面 ───────────────────────────────────────────────
export default function KnowledgePage() {
  const router = useRouter()
  const { documents, folders, selectedFolderId, setSelectedFolderId } = useMindNestStore()
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [autoByType, setAutoByType] = useState(true)
  const [autoByDate, setAutoByDate] = useState(false)
  // 多维筛选状态
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDateRange, setFilterDateRange] = useState<string>('all')
  const [showFilter, setShowFilter] = useState(false)

  // 收集所有分类
  const allCategories = Array.from(new Set(documents.map(d => d.category).filter(Boolean))) as string[]
  const allTags = Array.from(new Set(documents.flatMap(d => d.tags))).slice(0, 20)

  const filtered = documents.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.tags.some(t => t.includes(search)) && !d.summary?.includes(search)) return false
    if (selectedFolderId === '__unclassified__' && d.folder_id) return false
    else if (selectedFolderId && selectedFolderId !== '__unclassified__' && d.folder_id !== selectedFolderId) return false
    if (filterSource !== 'all' && d.source_type !== filterSource) return false
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (filterDateRange !== 'all') {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[filterDateRange] || 0
      const cutoff = Date.now() - days * 86400000
      if (new Date(d.created_at).getTime() < cutoff) return false
    }
    return true
  })

  return (
    <AppLayout>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索知识库..."
          className="w-80 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-all"
        />
        <Link href="/document/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />新建文档
        </Link>
      </div>

      <div className="flex flex-1">
        {/* 左侧：知识结构 */}
        <div className="w-64 border-r border-gray-100 bg-white p-4 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">知识结构</span>
              <button className="text-gray-400 hover:text-gray-600"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="搜索知识库..." className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300" />
            </div>
            <div className="space-y-0.5">
              {/* 全部文档 */}
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  !selectedFolderId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="w-3" />
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="flex-1 text-left">全部文档</span>
                <span className="text-xs text-gray-400">{documents.length}</span>
              </button>
              {/* 未归类 */}
              <button
                onClick={() => setSelectedFolderId('__unclassified__')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedFolderId === '__unclassified__' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="w-3" />
                <Link2 className="w-4 h-4 text-pink-400" />
                <span className="flex-1 text-left">未归类</span>
                <span className="text-xs text-gray-400">{documents.filter(d => !d.folder_id).length}</span>
              </button>
              {folders.map(f => <FolderItem key={f.id} folder={f} />)}
            </div>
          </div>

          {/* 自动整理 */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">自动整理</span>
              <Settings className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
            </div>
            <p className="text-xs text-gray-400 mb-3">智能分析并自动归类您的知识文档</p>
            <label className="flex items-start gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={autoByType} onChange={e => setAutoByType(e.target.checked)} className="mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-700">按文件类型整理</p>
                <p className="text-xs text-gray-400">根据文件扩展名自动分类到对应文件夹</p>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={autoByDate} onChange={e => setAutoByDate(e.target.checked)} className="mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-700">按日期整理</p>
                <p className="text-xs text-gray-400">根据创建或修改时间创建年月文件夹</p>
              </div>
            </label>
          </div>
        </div>

        {/* 右侧：文档列表 */}
        <div className="flex-1 p-6">
          {/* 工具栏 */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              知识库
              <span className="text-sm font-normal text-gray-400">({filtered.length})</span>
            </h1>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />上传文件
              </button>
              <Link href="/document/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />新建文档
              </Link>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 搜索 + 筛选栏 */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="搜索文档标题、内容、标签..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 bg-white"
                />
              </div>
              <button onClick={() => setShowFilter(p => !p)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-colors ${showFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Filter className="w-4 h-4" />筛选
                {(filterSource !== 'all' || filterCategory !== 'all' || filterDateRange !== 'all') && (
                  <span className="w-2 h-2 bg-orange-400 rounded-full" />
                )}
              </button>
            </div>

            {/* 快速筛选标签行 */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* 来源筛选 */}
              {[
                { key: 'all', label: '全部' },
                { key: 'manual', label: '📝 手动创建' },
                { key: 'link', label: '🔗 链接捕捉' },
                { key: 'file', label: '📁 文件导入' },
                { key: 'research', label: '🔬 AI研究' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFilterSource(key)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filterSource === key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}>
                  {label}
                </button>
              ))}

              {allCategories.length > 0 && (
                <>
                  <span className="text-gray-200 text-xs">|</span>
                  {allCategories.slice(0, 5).map(cat => (
                    <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        filterCategory === cat ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </>
              )}

              {/* 时间筛选 */}
              <span className="text-gray-200 text-xs">|</span>
              {[
                { key: 'all', label: '所有时间' },
                { key: '7d', label: '近7天' },
                { key: '30d', label: '近30天' },
                { key: '90d', label: '近3个月' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFilterDateRange(key)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filterDateRange === key ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}>
                  {label}
                </button>
              ))}

              {(filterSource !== 'all' || filterCategory !== 'all' || filterDateRange !== 'all') && (
                <button onClick={() => { setFilterSource('all'); setFilterCategory('all'); setFilterDateRange('all') }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X className="w-3 h-3" />清除筛选
                </button>
              )}
            </div>
          </div>

          {/* 文档列表 */}
          {view === 'list' ? (
            <div className="space-y-3">
              {filtered.map(doc => <DocumentCard key={doc.id} doc={doc} view="list" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filtered.map(doc => <DocumentCard key={doc.id} doc={doc} view="grid" />)}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">暂无文档</p>
              <button onClick={() => setShowUpload(true)} className="mt-3 text-blue-600 text-sm hover:underline">上传第一个文件</button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
