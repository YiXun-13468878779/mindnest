'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore } from '@/lib/store'
import {
  Search, Filter, Maximize2, Network, RefreshCw,
  TreePine, X, ChevronUp, ChevronRight, ChevronDown, FileText, ExternalLink,
} from 'lucide-react'

// ─── Mock 图谱数据 ───────────────────────────────────────────
const NODES = [
  { id: 'ai',       name: '人工智能',   category: '技术', type: 'concept',     size: 60, color: '#4F46E5' },
  { id: 'ml',       name: '机器学习',   category: '技术', type: 'technology',  size: 45, color: '#7C3AED' },
  { id: 'dl',       name: '深度学习',   category: '技术', type: 'technology',  size: 40, color: '#9333EA' },
  { id: 'react',    name: 'React',      category: '前端开发', type: 'technology', size: 50, color: '#2563EB' },
  { id: 'ts',       name: 'TypeScript', category: '前端开发', type: 'skill',    size: 38, color: '#1D4ED8' },
  { id: 'hooks',    name: 'React Hooks',category: '前端开发', type: 'method',   size: 32, color: '#3B82F6' },
  { id: 'product',  name: '产品设计',   category: '设计', type: 'method',      size: 42, color: '#EC4899' },
  { id: 'ux',       name: 'UX设计',     category: '设计', type: 'skill',       size: 35, color: '#F472B6' },
  { id: 'agent',    name: 'AI Agent',   category: '技术', type: 'concept',     size: 36, color: '#6366F1' },
  { id: 'data',     name: '数据分析',   category: '分析', type: 'skill',       size: 30, color: '#10B981' },
]

const EDGES = [
  { source: 'ai', target: 'ml', weight: 0.9 },
  { source: 'ml', target: 'dl', weight: 0.8 },
  { source: 'ai', target: 'agent', weight: 0.7 },
  { source: 'react', target: 'hooks', weight: 0.95 },
  { source: 'react', target: 'ts', weight: 0.7 },
  { source: 'product', target: 'ux', weight: 0.85 },
  { source: 'ml', target: 'data', weight: 0.6 },
  { source: 'ai', target: 'dl', weight: 0.75 },
]

const CATEGORY_COLORS: Record<string, string> = {
  '技术': '#4F46E5', '前端开发': '#2563EB', '设计': '#EC4899', '分析': '#10B981', '管理': '#F59E0B',
}

// ─── 节点详情面板 ─────────────────────────────────────────────
function NodeDetail({ node, onClose }: { node: typeof NODES[0]; onClose: () => void }) {
  const { documents } = useMindNestStore()
  const related = documents.filter(d => d.tags.some(t => t.includes(node.name)) || d.title.includes(node.name))
  const connected = EDGES
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => NODES.find(n => n.id === (e.source === node.id ? e.target : e.source)))
    .filter(Boolean)

  return (
    <div className="bubble-float absolute right-4 top-16 z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100" style={{ background: node.color + '11' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: node.color + '22', border: `2px solid ${node.color}` }}>
          <span className="text-sm font-bold" style={{ color: node.color }}>{node.name.slice(0, 2)}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{node.name}</p>
          <p className="text-xs text-gray-400">{node.category} · {node.type}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-4">
        {/* 连接节点 */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">关联节点 ({connected.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {connected.map(n => n && (
              <span key={n.id} className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: n.color + '44', color: n.color, background: n.color + '11' }}>
                {n.name}
              </span>
            ))}
            {connected.length === 0 && <p className="text-xs text-gray-400">暂无关联</p>}
          </div>
        </div>
        {/* 相关文档 */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">相关文档 ({related.length})</p>
          {related.length > 0 ? (
            <div className="space-y-1.5">
              {related.slice(0, 3).map(doc => (
                <Link key={doc.id} href={`/document/${doc.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 group-hover:text-blue-600 truncate flex-1">{doc.title}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">知识库中暂无相关文档</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── D3 力导向图 ──────────────────────────────────────────────
function ForceGraph({ onNodeClick }: { onNodeClick: (node: typeof NODES[0]) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const { width, height } = svgRef.current.getBoundingClientRect()

    const sim = d3.forceSimulation(NODES as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(EDGES).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size / 2 + 20))

    const g = svg.append('g')
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on('zoom', (e) => g.attr('transform', e.transform)) as any)

    const link = g.append('g').selectAll('line').data(EDGES).enter().append('line')
      .attr('stroke', '#e2e8f0').attr('stroke-width', (d) => d.weight * 2).attr('stroke-opacity', 0.8)

    const node = g.append('g').selectAll('g').data(NODES).enter().append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, any>()
          .on('start', (e, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d: any) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d: any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }) as any
      )
      .on('click', (_e: any, d: any) => { onNodeClick(d) })

    node.append('circle')
      .attr('r', (d) => d.size / 2)
      .attr('fill', (d) => d.color + '33')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 2)
      .on('mouseover', function() { d3.select(this).attr('fill', (d: any) => d.color + '66').attr('stroke-width', 3) })
      .on('mouseout', function() { d3.select(this).attr('fill', (d: any) => d.color + '33').attr('stroke-width', 2) })

    node.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d) => Math.max(10, d.size / 5))
      .attr('fill', (d) => d.color)
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })
  }, [onNodeClick])

  return <svg ref={svgRef} className="w-full h-full" />
}

// ─── 树状图视图 ───────────────────────────────────────────────
function TreeView({ onNodeClick }: { onNodeClick: (node: typeof NODES[0]) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['技术', '前端开发', '设计']))

  // 按分类分组
  const groups: Record<string, typeof NODES> = {}
  NODES.forEach(n => {
    if (!groups[n.category]) groups[n.category] = []
    groups[n.category].push(n)
  })

  const toggle = (cat: string) => setExpanded(s => {
    const next = new Set(s)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    return next
  })

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-2">
        {Object.entries(groups).map(([cat, nodes]) => {
          const color = CATEGORY_COLORS[cat] || '#64748b'
          const open = expanded.has(cat)
          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => toggle(cat)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium text-gray-800 flex-1 text-left">{cat}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{nodes.length}</span>
              </button>
              {open && (
                <div className="border-t border-gray-100">
                  {nodes.map(n => (
                    <button key={n.id} onClick={() => onNodeClick(n)}
                      className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-blue-50 transition-colors group">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: n.color + '22' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
                      </div>
                      <span className="text-sm text-gray-700 group-hover:text-blue-700 flex-1 text-left">{n.name}</span>
                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">{n.type}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AI 分析面板 ──────────────────────────────────────────────
function AIAnalysisPanel() {
  const topics = [
    { name: '人工智能技术', pct: 85, color: 'bg-blue-500' },
    { name: '前端开发', pct: 65, color: 'bg-indigo-500' },
    { name: '设计思维', pct: 45, color: 'bg-pink-500' },
    { name: '数据分析', pct: 35, color: 'bg-emerald-500' },
  ]
  const entities = ['人工智能', 'React', '机器学习', 'TypeScript', '产品设计']

  return (
    <div className="w-72 border-l border-gray-100 bg-white overflow-y-auto p-4 space-y-5">
      {/* 图谱概览 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">AI 智能分析</span>
          <span className="ml-auto text-xs text-gray-400">实时分析知识图谱结构与内容</span>
          <RefreshCw className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-blue-500" />
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <Network className="w-3 h-3" />图谱概览
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            当前知识图谱展示了技术领域的核心概念网络，以人工智能为中心，辐射出机器学习、深度学习等关键技术分支，同时连接前端开发和设计方法论。
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[['节点数量', '10'], ['连接密度', '22%'], ['聚类数量', '3'], ['中心性', '65%']].map(([k, v]) => (
              <div key={k} className="text-center">
                <p className="text-lg font-bold text-gray-900">{v}</p>
                <p className="text-xs text-gray-400">{k}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 核心主题 */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1">
            <ChevronUp className="w-3 h-3" />核心主题
          </p>
          <div className="space-y-2">
            {topics.map(({ name, pct, color }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{name}</span>
                  <span className="text-gray-400">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 关键实体 */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">关键实体</p>
          <div className="flex flex-wrap gap-1.5">
            {entities.map(e => (
              <span key={e} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg cursor-pointer hover:bg-blue-100">{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 知识薄弱点 */}
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <p className="text-xs font-semibold text-amber-700 mb-1">发现知识薄弱点</p>
        <p className="text-xs text-amber-600">「数据库设计」和「系统架构」与你现有知识关联紧密，但覆盖较少，建议补充。</p>
        <button className="mt-2 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
          AI 自动补充
        </button>
      </div>
    </div>
  )
}

// ─── 图谱页面 ─────────────────────────────────────────────────
export default function GraphPage() {
  const [showFilter, setShowFilter] = useState(false)
  const [graphMode, setGraphMode] = useState<'force' | 'tree'>('force')
  const [selectedNode, setSelectedNode] = useState<typeof NODES[0] | null>(null)
  const NODE_TYPES = ['概念', '技术', '方法论', '技能', '人物', '事件']
  const CATEGORIES = Object.keys(CATEGORY_COLORS)

  const handleNodeClick = (node: typeof NODES[0]) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }

  return (
    <AppLayout>
      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <input placeholder="搜索知识库..."
          className="w-80 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-all" />
        <Link href="/document/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          新建文档
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 图谱区域 */}
        <div className="flex-1 relative bg-gray-50">
          {/* 工具栏 */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
            <h1 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-600" />知识图谱
            </h1>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1">
              <input placeholder="搜索节点..." className="text-xs border-none outline-none w-28 text-gray-600 placeholder-gray-400 bg-transparent" />
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* 图谱控件 */}
          <div className="absolute top-4 right-80 z-10 flex items-center gap-2">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button onClick={() => setGraphMode('force')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${graphMode === 'force' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Network className="w-3.5 h-3.5" />力导向
              </button>
              <button onClick={() => setGraphMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${graphMode === 'tree' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <TreePine className="w-3.5 h-3.5" />树状图
              </button>
            </div>
            <button onClick={() => setShowFilter(p => !p)} className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs shadow-sm transition-colors ${showFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Filter className="w-3.5 h-3.5" />筛选
            </button>
            <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 节点详情浮窗 */}
          {selectedNode && (
            <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}

          {/* 图例 */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2">图例</p>
            {Object.entries(CATEGORY_COLORS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v + '44', border: `2px solid ${v}` }} />
                <span className="text-xs text-gray-500">{k}概念</span>
              </div>
            ))}
          </div>

          {/* 状态栏 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 px-4 py-2 shadow-sm flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Network className="w-3 h-3" />节点: 10</span>
            <span>连接: 8</span>
            <span>缩放: 100%</span>
            <span>选中: 0</span>
          </div>

          {/* 筛选面板 */}
          {showFilter && (
            <div className="absolute top-16 right-80 z-20 bg-white rounded-2xl border border-gray-100 shadow-xl w-56 p-4 bubble-float">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">图谱筛选</p>
                <div className="flex items-center gap-2">
                  <button className="text-xs text-blue-600 hover:underline">清除</button>
                  <button onClick={() => setShowFilter(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-2">节点类型</p>
              {NODE_TYPES.map((t, i) => {
                const colors = ['#4F46E5', '#10B981', '#7C3AED', '#F59E0B', '#EF4444', '#06B6D4']
                return (
                  <label key={t} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
                    <span className="text-xs text-gray-600">{t}</span>
                  </label>
                )
              })}
              <p className="text-xs font-medium text-gray-500 mb-2 mt-3">知识分类</p>
              {CATEGORIES.map((c, i) => (
                <label key={c} className="flex items-center justify-between mb-1.5 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-xs text-gray-600">{c}</span>
                  </div>
                  <span className="text-xs text-gray-400">({[15, 8, 6, 5, 4, 3][i]})</span>
                </label>
              ))}
              <p className="text-xs font-medium text-gray-500 mb-2 mt-3">时间范围</p>
              <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                <option>全部时间</option><option>最近7天</option><option>最近30天</option>
              </select>
              <p className="text-xs font-medium text-gray-500 mb-2 mt-3">连接强度阈值</p>
              <input type="range" min="0" max="100" className="w-full" />
            </div>
          )}

          {/* 图谱渲染（力导向 / 树状图切换）*/}
          <div className="w-full h-full">
            {graphMode === 'force'
              ? <ForceGraph onNodeClick={handleNodeClick} />
              : <TreeView onNodeClick={handleNodeClick} />
            }
          </div>
        </div>

        {/* 右侧 AI 分析 */}
        <AIAnalysisPanel />
      </div>
    </AppLayout>
  )
}
