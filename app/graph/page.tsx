'use client'
import { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useMindNestStore } from '@/lib/store'
import { Network, TreePine, X, FileText, ExternalLink, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'

// ─── 从文档动态构建图谱数据 ──────────────────────────────────
function useGraphData() {
  const { documents } = useMindNestStore()
  return useMemo(() => {
    if (documents.length === 0) return { nodes: [], edges: [], categoryColors: {} }

    const tagCount: Record<string, number> = {}
    const catCount: Record<string, number> = {}
    documents.forEach(doc => {
      doc.tags?.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 })
      if (doc.category) catCount[doc.category] = (catCount[doc.category] || 0) + 1
    })

    const PALETTE = ['#4F46E5', '#7C3AED', '#2563EB', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#14B8A6']
    const cats = Object.keys(catCount)
    const categoryColors: Record<string, string> = {}
    cats.forEach((c, i) => { categoryColors[c] = PALETTE[i % PALETTE.length] })

    const nodes: any[] = [
      ...Object.entries(catCount).map(([name, count]) => ({
        id: `cat:${name}`, name, type: 'category', size: 30 + count * 4,
        color: categoryColors[name] || '#64748b', count,
      })),
      ...Object.entries(tagCount).filter(([t]) => !catCount[t]).map(([name, count]) => ({
        id: `tag:${name}`, name, type: 'tag', size: 18 + count * 3,
        color: '#94a3b8', count,
      })),
    ]

    const edgeMap: Record<string, number> = {}
    documents.forEach(doc => {
      const tags = (doc.tags || []).filter(t => tagCount[t])
      const cat = doc.category && catCount[doc.category] ? `cat:${doc.category}` : null
      // tag-tag edges
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = [`tag:${tags[i]}`, `tag:${tags[j]}`].sort().join('--')
          edgeMap[key] = (edgeMap[key] || 0) + 1
        }
        // cat-tag edges
        if (cat) {
          const key = `${cat}--tag:${tags[i]}`
          edgeMap[key] = (edgeMap[key] || 0) + 1
        }
      }
    })

    const edges = Object.entries(edgeMap).map(([key, weight]) => {
      const [source, target] = key.split('--')
      return { source, target, weight: Math.min(weight, 5) }
    })

    return { nodes, edges, categoryColors }
  }, [documents])
}

// ─── 节点详情面板 ─────────────────────────────────────────────
function NodeDetail({ node, onClose }: { node: any; onClose: () => void }) {
  const { documents } = useMindNestStore()
  const related = documents.filter(d =>
    (node.type === 'tag' && d.tags?.includes(node.name)) ||
    (node.type === 'category' && d.category === node.name)
  )
  return (
    <div className="absolute right-4 top-16 z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100" style={{ background: node.color + '18' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: node.color + '22', border: `2px solid ${node.color}` }}>
          <span className="text-sm font-bold" style={{ color: node.color }}>{node.name.slice(0, 2)}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{node.name}</p>
          <p className="text-xs text-gray-400">{node.type === 'category' ? '知识领域' : '标签'} · {node.count} 篇文档</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">相关文档 ({related.length})</p>
        {related.length > 0 ? (
          <div className="space-y-1.5">
            {related.slice(0, 5).map(doc => (
              <Link key={doc.id} href={`/document/${doc.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 group-hover:text-blue-600 truncate flex-1">{doc.title}</span>
                <ExternalLink className="w-3 h-3 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        ) : <p className="text-xs text-gray-400">暂无相关文档</p>}
      </div>
    </div>
  )
}

// ─── D3 力导向图 ──────────────────────────────────────────────
function ForceGraph({ nodes, edges, onNodeClick }: { nodes: any[]; edges: any[]; onNodeClick: (n: any) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const { width, height } = svgRef.current.getBoundingClientRect()
    const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size / 2 + 15))
    const g = svg.append('g')
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)) as any)
    const link = g.append('g').selectAll('line').data(edges).enter().append('line')
      .attr('stroke', '#e2e8f0').attr('stroke-width', (d: any) => d.weight * 1.5).attr('stroke-opacity', 0.7)
    const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, any>().on('start', (e, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y }).on('drag', (e, d: any) => { d.fx = e.x; d.fy = e.y }).on('end', (e, d: any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }) as any)
      .on('click', (_e: any, d: any) => onNodeClick(d))
    node.append('circle').attr('r', (d: any) => d.size / 2).attr('fill', (d: any) => d.color + '33').attr('stroke', (d: any) => d.color).attr('stroke-width', (d: any) => d.type === 'category' ? 2.5 : 1.5)
      .on('mouseover', function(this: any) { d3.select(this).attr('fill', (d: any) => d.color + '66').attr('stroke-width', 3) })
      .on('mouseout', function(this: any, _e: any, d: any) { d3.select(this).attr('fill', (d: any) => d.color + '33').attr('stroke-width', d.type === 'category' ? 2.5 : 1.5) })
    node.append('text').text((d: any) => d.name.length > 8 ? d.name.slice(0, 7) + '…' : d.name)
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', (d: any) => d.type === 'category' ? 13 : 11)
      .attr('fill', (d: any) => d.color).attr('font-weight', (d: any) => d.type === 'category' ? '700' : '500')
      .attr('pointer-events', 'none')
    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y).attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })
  }, [nodes, edges])
  return <svg ref={svgRef} className="w-full h-full" />
}

// ─── 树状图 ───────────────────────────────────────────────────
function TreeView({ nodes, categoryColors, onNodeClick }: { nodes: any[]; categoryColors: Record<string, string>; onNodeClick: (n: any) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const categories = nodes.filter(n => n.type === 'category')
  const tags = nodes.filter(n => n.type === 'tag')
  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-2">
        {categories.map(cat => {
          const open = expanded.has(cat.id)
          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => { setExpanded(s => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n }); onNodeClick(cat) }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="font-medium text-gray-800 flex-1 text-left">{cat.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.count}</span>
              </button>
            </div>
          )
        })}
        {tags.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">标签云</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <button key={t.id} onClick={() => onNodeClick(t)} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  {t.name} <span className="text-gray-400">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 图谱页面 ─────────────────────────────────────────────────
export default function GraphPage() {
  const { documents } = useMindNestStore()
  const { nodes, edges, categoryColors } = useGraphData()
  const [graphMode, setGraphMode] = useState<'force' | 'tree'>('force')
  const [selectedNode, setSelectedNode] = useState<any | null>(null)

  if (documents.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full py-32">
          <BookOpen className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-gray-400 text-base mb-2">知识库还是空的</p>
          <p className="text-sm text-gray-300 mb-6">先去捕捉一些链接或上传文件，图谱将自动生成</p>
          <Link href="/knowledge?tab=capture" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">去捕捉内容</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* TopBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-bold text-gray-900">知识图谱</h1>
          <span className="text-sm text-gray-400">· {nodes.length} 个节点，{edges.length} 条连接</span>
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden p-1 gap-1">
          <button onClick={() => setGraphMode('force')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${graphMode === 'force' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}><Network className="w-3.5 h-3.5" />力导向</button>
          <button onClick={() => setGraphMode('tree')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${graphMode === 'tree' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}><TreePine className="w-3.5 h-3.5" />树状图</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-gray-50">
          {selectedNode && <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />}

          {/* 图例 */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2">知识领域</p>
            {Object.entries(categoryColors).slice(0, 6).map(([name, color]) => (
              <div key={name} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color + '44', border: `2px solid ${color}` }} />
                <span className="text-xs text-gray-500 truncate max-w-[80px]">{name}</span>
              </div>
            ))}
          </div>

          <div className="w-full h-full">
            {graphMode === 'force'
              ? <ForceGraph nodes={nodes} edges={edges} onNodeClick={n => setSelectedNode((p: any) => p?.id === n.id ? null : n)} />
              : <TreeView nodes={nodes} categoryColors={categoryColors} onNodeClick={n => setSelectedNode((p: any) => p?.id === n.id ? null : n)} />
            }
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
