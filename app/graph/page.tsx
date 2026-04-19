'use client'
import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import * as d3 from 'd3'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore } from '@/lib/store'
import {
  Network, TreePine, X, FileText, ExternalLink,
  ChevronDown, ChevronRight, BookOpen, Search,
  Maximize2, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react'

// ─── 颜色方案 ─────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#ec4899',
  '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
  '#a855f7', '#14b8a6',
]

// ─── 构建图谱数据 ─────────────────────────────────────────────
function useGraphData(hiddenCats: Set<string>) {
  const { documents } = useMindNestStore()
  return useMemo(() => {
    if (documents.length === 0) return { nodes: [], edges: [], categoryColors: {}, stats: null }

    const tagCount: Record<string, number> = {}
    const catCount: Record<string, number> = {}
    documents.forEach(doc => {
      if (hiddenCats.has(doc.category || '')) return
      doc.tags?.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 })
      if (doc.category) catCount[doc.category] = (catCount[doc.category] || 0) + 1
    })

    const allCats = Array.from(new Set(documents.map(d => d.category).filter(Boolean))) as string[]
    const categoryColors: Record<string, string> = {}
    allCats.forEach((c, i) => { categoryColors[c] = PALETTE[i % PALETTE.length] })

    const nodes: any[] = [
      ...Object.entries(catCount).map(([name, count]) => ({
        id: `cat:${name}`, name, type: 'category',
        size: 34 + Math.min(count * 5, 30),
        color: categoryColors[name] || '#64748b', count,
      })),
      ...Object.entries(tagCount).filter(([t]) => !catCount[t]).map(([name, count]) => ({
        id: `tag:${name}`, name, type: 'tag',
        size: 20 + Math.min(count * 4, 20),
        color: '#94a3b8', count,
      })),
    ]

    const edgeMap: Record<string, number> = {}
    documents.forEach(doc => {
      if (hiddenCats.has(doc.category || '')) return
      const tags = (doc.tags || []).filter(t => tagCount[t])
      const cat = doc.category && catCount[doc.category] ? `cat:${doc.category}` : null
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = [`tag:${tags[i]}`, `tag:${tags[j]}`].sort().join('--')
          edgeMap[key] = (edgeMap[key] || 0) + 1
        }
        if (cat) { const key = `${cat}--tag:${tags[i]}`; edgeMap[key] = (edgeMap[key] || 0) + 1 }
      }
    })

    const edges = Object.entries(edgeMap).map(([key, weight]) => {
      const [source, target] = key.split('--')
      return { source, target, weight: Math.min(weight, 5) }
    })

    // 计算每个节点的连接度
    const degree: Record<string, number> = {}
    edges.forEach(e => {
      degree[e.source] = (degree[e.source] || 0) + 1
      degree[e.target] = (degree[e.target] || 0) + 1
    })
    nodes.forEach(n => { n.degree = degree[n.id] || 0 })

    const topNodes = [...nodes].sort((a, b) => b.degree - a.degree).slice(0, 5)
    const stats = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      catCount: Object.keys(catCount).length,
      avgDegree: nodes.length > 0 ? (edges.length * 2 / nodes.length).toFixed(1) : '0',
      topNodes,
    }

    return { nodes, edges, categoryColors, stats, allCats }
  }, [documents, hiddenCats])
}

// ─── D3 力导向图（深色画布）────────────────────────────────────
function ForceGraph({
  nodes, edges, searchQuery, selectedNodeId, onNodeClick, zoomRef,
}: {
  nodes: any[]; edges: any[]; searchQuery: string; selectedNodeId: string | null
  onNodeClick: (n: any) => void; zoomRef: React.MutableRefObject<any>
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<any>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const { width, height } = svgRef.current.getBoundingClientRect()

    // defs: glow filter + gradients
    const defs = svg.append('defs')
    defs.append('filter').attr('id', 'glow').html(`
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    `)

    const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(edges).id((d: any) => d.id).distance((d: any) => {
        const s = nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source))
        return s?.type === 'category' ? 120 : 80
      }))
      .force('charge', d3.forceManyBody().strength((d: any) => d.type === 'category' ? -400 : -200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size / 2 + 18))
    simRef.current = sim

    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom as any)
    zoomRef.current = { svg: svg.node(), zoom }

    // 边
    const link = g.append('g').selectAll('line').data(edges).enter().append('line')
      .attr('stroke', '#334155').attr('stroke-width', (d: any) => 0.8 + d.weight * 0.4)
      .attr('stroke-opacity', 0.6)

    // 节点组
    const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, any>()
        .on('start', (e, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d: any) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d: any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }) as any)
      .on('click', (_e: any, d: any) => onNodeClick(d))

    // 外圈光晕（仅分类节点）
    node.filter((d: any) => d.type === 'category').append('circle')
      .attr('r', (d: any) => d.size / 2 + 6)
      .attr('fill', (d: any) => d.color + '15')
      .attr('stroke', 'none')

    // 主圆
    node.append('circle')
      .attr('r', (d: any) => d.size / 2)
      .attr('fill', (d: any) => d.type === 'category' ? d.color + '40' : d.color + '25')
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-width', (d: any) => d.type === 'category' ? 2 : 1.2)
      .attr('filter', (d: any) => d.type === 'category' ? 'url(#glow)' : null)
      .on('mouseover', function(this: any, _e: any, d: any) {
        d3.select(this).attr('fill', d.color + '70').attr('stroke-width', d.type === 'category' ? 3 : 2)
        // 高亮邻居
        const neighbors = new Set<string>([d.id])
        edges.forEach((e: any) => {
          const s = typeof e.source === 'object' ? e.source.id : e.source
          const t = typeof e.target === 'object' ? e.target.id : e.target
          if (s === d.id) neighbors.add(t)
          if (t === d.id) neighbors.add(s)
        })
        node.style('opacity', (n: any) => neighbors.has(n.id) ? 1 : 0.15)
        link.style('opacity', (e: any) => {
          const s = typeof e.source === 'object' ? e.source.id : e.source
          const t = typeof e.target === 'object' ? e.target.id : e.target
          return neighbors.has(s) && neighbors.has(t) ? 1 : 0.05
        })
      })
      .on('mouseout', function(this: any, _e: any, d: any) {
        d3.select(this).attr('fill', d.type === 'category' ? d.color + '40' : d.color + '25').attr('stroke-width', d.type === 'category' ? 2 : 1.2)
        node.style('opacity', 1); link.style('opacity', 0.6)
      })

    // 文字标签
    node.append('text')
      .text((d: any) => d.name.length > 7 ? d.name.slice(0, 6) + '…' : d.name)
      .attr('text-anchor', 'middle').attr('dy', (d: any) => d.type === 'category' ? '0.35em' : d.size / 2 + 12)
      .attr('font-size', (d: any) => d.type === 'category' ? 12 : 10)
      .attr('fill', (d: any) => d.type === 'category' ? '#e2e8f0' : '#94a3b8')
      .attr('font-weight', (d: any) => d.type === 'category' ? '700' : '400')
      .attr('pointer-events', 'none')

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [nodes, edges])

  // 搜索高亮
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    if (!searchQuery) {
      svg.selectAll('g g').style('opacity', 1)
      return
    }
    svg.selectAll('g g').style('opacity', (d: any) =>
      d?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.1
    )
  }, [searchQuery])

  return (
    <svg ref={svgRef} className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }} />
  )
}

// ─── 树状图（含文档列表）─────────────────────────────────────
function TreeView({ nodes, categoryColors, onNodeClick }: { nodes: any[]; categoryColors: Record<string, string>; onNodeClick: (n: any) => void }) {
  const { documents } = useMindNestStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const categories = nodes.filter(n => n.type === 'category')
  const tags = nodes.filter(n => n.type === 'tag')

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-3">
        {categories.map(cat => {
          const open = expanded.has(cat.id)
          const catDocs = documents.filter(d => d.category === cat.name)
          const color = cat.color
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <button
                onClick={() => { setExpanded(s => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n }); onNodeClick(cat) }}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="font-semibold text-gray-800 flex-1 text-left">{cat.name}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: color + '18', color }}>{cat.count} 篇</span>
              </button>
              {open && (
                <div className="border-t border-gray-50">
                  {catDocs.slice(0, 6).map(doc => (
                    <Link key={doc.id} href={`/document/${doc.id}`}
                      className="flex items-center gap-3 px-6 py-2.5 hover:bg-blue-50 transition-colors group">
                      <FileText className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-600 group-hover:text-blue-600 flex-1 truncate">{doc.title}</span>
                      <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                    </Link>
                  ))}
                  {catDocs.length > 6 && (
                    <p className="text-xs text-gray-400 px-6 py-2">…还有 {catDocs.length - 6} 篇</p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {tags.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">标签云</p>
            <div className="flex flex-wrap gap-2">
              {tags.sort((a, b) => b.count - a.count).map(t => (
                <button key={t.id} onClick={() => onNodeClick(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs">
                  {t.name}
                  <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full text-[10px]">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 右侧信息面板 ─────────────────────────────────────────────
function InfoPanel({
  stats, categoryColors, allCats, hiddenCats, onToggleCat, selectedNode, onCloseNode,
}: {
  stats: any; categoryColors: Record<string, string>; allCats: string[]
  hiddenCats: Set<string>; onToggleCat: (c: string) => void
  selectedNode: any; onCloseNode: () => void
}) {
  const { documents } = useMindNestStore()
  const related = selectedNode ? documents.filter(d =>
    (selectedNode.type === 'tag' && d.tags?.includes(selectedNode.name)) ||
    (selectedNode.type === 'category' && d.category === selectedNode.name)
  ) : []

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
      {/* 选中节点详情 */}
      {selectedNode ? (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: selectedNode.color + '22', border: `2px solid ${selectedNode.color}` }}>
              <span className="text-xs font-bold" style={{ color: selectedNode.color }}>{selectedNode.name.slice(0, 2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{selectedNode.name}</p>
              <p className="text-xs text-gray-400">{selectedNode.type === 'category' ? '知识领域' : '标签'} · {selectedNode.count} 篇 · {selectedNode.degree} 条连接</p>
            </div>
            <button onClick={onCloseNode} className="text-gray-300 hover:text-gray-500 flex-shrink-0"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1">
            {related.slice(0, 6).map(doc => (
              <Link key={doc.id} href={`/document/${doc.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                <FileText className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-600 group-hover:text-blue-600 truncate flex-1">{doc.title}</span>
              </Link>
            ))}
            {related.length > 6 && <p className="text-xs text-gray-400 px-2">…还有 {related.length - 6} 篇</p>}
          </div>
        </div>
      ) : null}

      {/* 图谱统计 */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">图谱概览</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '节点', value: stats.nodeCount },
            { label: '连接', value: stats.edgeCount },
            { label: '领域', value: stats.catCount },
            { label: '平均连接', value: stats.avgDegree },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 核心节点 */}
      {stats.topNodes?.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">核心枢纽节点</p>
          <div className="space-y-1.5">
            {stats.topNodes.map((n: any, i: number) => (
              <div key={n.id} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-300 w-4 text-right">{i + 1}</span>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
                <span className="text-xs text-gray-600 flex-1 truncate">{n.name}</span>
                <span className="text-[10px] text-gray-400">{n.degree}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分类过滤 */}
      {allCats.length > 0 && (
        <div className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">显示领域</p>
          <div className="space-y-1.5">
            {allCats.map(cat => {
              const color = categoryColors[cat] || '#94a3b8'
              const hidden = hiddenCats.has(cat)
              return (
                <button key={cat} onClick={() => onToggleCat(cat)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${hidden ? 'opacity-40' : 'opacity-100'} hover:bg-gray-50`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0 transition-all" style={{ backgroundColor: hidden ? '#d1d5db' : color }} />
                  <span className="text-xs text-gray-600 flex-1 truncate">{cat}</span>
                  {hidden && <span className="text-[10px] text-gray-400">隐藏</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function GraphPage() {
  const { documents } = useMindNestStore()
  const [graphMode, setGraphMode] = useState<'force' | 'tree'>('force')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set())
  const zoomRef = useRef<any>(null)

  const { nodes, edges, categoryColors, stats, allCats } = useGraphData(hiddenCats) as any

  const toggleCat = useCallback((cat: string) => {
    setHiddenCats(s => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }, [])

  const handleZoom = (scale: number) => {
    if (!zoomRef.current) return
    const { svg, zoom } = zoomRef.current
    d3.select(svg).transition().duration(300).call(zoom.scaleBy as any, scale)
  }

  const handleReset = () => {
    if (!zoomRef.current) return
    const { svg, zoom } = zoomRef.current
    d3.select(svg).transition().duration(400).call(zoom.transform as any, d3.zoomIdentity)
  }

  if (documents.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full py-32">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
            <Network className="w-10 h-10 text-indigo-400" />
          </div>
          <p className="text-gray-600 text-lg font-semibold mb-2">知识图谱尚未生成</p>
          <p className="text-sm text-gray-400 mb-8 text-center max-w-xs">先去捕捉一些链接或上传文件，AI 会自动分析并构建你的知识关系网络</p>
          <Link href="/knowledge?tab=capture" className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            去捕捉内容
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* TopBar */}
      <div className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Network className="w-5 h-5 text-indigo-500" />
          <h1 className="text-base font-bold text-gray-900">知识图谱</h1>
        </div>

        {/* 搜索 */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>

        {/* 视图切换 */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 flex-shrink-0">
          <button onClick={() => setGraphMode('force')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${graphMode === 'force' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            <Network className="w-3.5 h-3.5" />关系图
          </button>
          <button onClick={() => setGraphMode('tree')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${graphMode === 'tree' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            <TreePine className="w-3.5 h-3.5" />目录树
          </button>
        </div>

        {/* 缩放控件（仅力导向模式）*/}
        {graphMode === 'force' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => handleZoom(1.3)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => handleZoom(0.77)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={handleReset} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><RotateCcw className="w-4 h-4" /></button>
          </div>
        )}

        <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
          {stats?.nodeCount} 节点 · {stats?.edgeCount} 连接
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 主图谱区域 */}
        <div className="flex-1 relative overflow-hidden">
          {graphMode === 'force' ? (
            <ForceGraph
              nodes={nodes} edges={edges}
              searchQuery={searchQuery}
              selectedNodeId={selectedNode?.id || null}
              onNodeClick={n => setSelectedNode((p: any) => p?.id === n.id ? null : n)}
              zoomRef={zoomRef}
            />
          ) : (
            <TreeView
              nodes={nodes} categoryColors={categoryColors}
              onNodeClick={n => setSelectedNode((p: any) => p?.id === n.id ? null : n)}
            />
          )}

          {/* 图谱操作提示 */}
          {graphMode === 'force' && (
            <div className="absolute bottom-4 left-4 z-10 bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
              <p className="text-[11px] text-white/50">滚轮缩放 · 拖拽移动 · 点击节点查看详情</p>
            </div>
          )}
        </div>

        {/* 右侧信息面板 */}
        {stats && (
          <InfoPanel
            stats={stats}
            categoryColors={categoryColors}
            allCats={allCats || []}
            hiddenCats={hiddenCats}
            onToggleCat={toggleCat}
            selectedNode={selectedNode}
            onCloseNode={() => setSelectedNode(null)}
          />
        )}
      </div>
    </AppLayout>
  )
}
