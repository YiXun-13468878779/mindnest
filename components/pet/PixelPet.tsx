'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Settings2 } from 'lucide-react'
import { useMindNestStore } from '@/lib/store'
import { generateId, formatDate } from '@/lib/utils'
import type { PetType, ChatMessage } from '@/lib/types'

// ─── 像素宠物定义 ────────────────────────────────────────────
const PET_CONFIGS: Record<PetType, {
  label: string; emoji: string; color: string; accent: string
  pixels: string[][]; idleMsg: string[]
}> = {
  cat: {
    label: '小猫咪', emoji: '🐱', color: '#FF8C69', accent: '#ff6b6b',
    pixels: [
      ['','','#FF8C69','#FF8C69','','','#FF8C69','#FF8C69',''],
      ['','#FF8C69','#FF8C69','#FF8C69','#FF8C69','#FF8C69','#FF8C69','#FF8C69',''],
      ['#FF8C69','#FF8C69','#333','#FF8C69','#FF8C69','#FF8C69','#333','#FF8C69','#FF8C69'],
      ['#FF8C69','#FF8C69','#FF8C69','#ff6b9d','#FF8C69','#ff6b9d','#FF8C69','#FF8C69','#FF8C69'],
      ['','#FF8C69','#FF8C69','#FF8C69','#FF8C69','#FF8C69','#FF8C69','#FF8C69',''],
      ['','','#FF8C69','','','','','#FF8C69',''],
      ['','','#cc6b52','','','','','#cc6b52',''],
    ],
    idleMsg: ['喵~ 今天学了什么新知识？', '要记得复习昨天的笔记哦！', '我发现你有3天没打开知识库了...', '你最近研究的内容很有趣！'],
  },
  dog: {
    label: '小狗狗', emoji: '🐶', color: '#C68642', accent: '#a0522d',
    pixels: [
      ['','#C68642','#C68642','','','','#C68642','#C68642',''],
      ['#C68642','#C68642','#C68642','#C68642','#C68642','#C68642','#C68642','#C68642','#C68642'],
      ['#C68642','#C68642','#333','#C68642','#C68642','#C68642','#333','#C68642','#C68642'],
      ['#C68642','#C68642','#C68642','#C68642','#ff6b6b','#C68642','#C68642','#C68642','#C68642'],
      ['#a0522d','#C68642','#C68642','#C68642','#C68642','#C68642','#C68642','#C68642','#a0522d'],
      ['#a0522d','','#C68642','#C68642','','#C68642','#C68642','','#a0522d'],
      ['','','#C68642','','','','#C68642','',''],
    ],
    idleMsg: ['汪！今天的任务完成了吗？', '要勤奋学习哦，汪汪！', '发现了3个和你兴趣相关的文章！', '汪！记得喝水休息一下～'],
  },
  turtle: {
    label: '小乌龟', emoji: '🐢', color: '#4CAF50', accent: '#2E7D32',
    pixels: [
      ['','','','#2E7D32','#2E7D32','#2E7D32','','',''],
      ['','#4CAF50','#4CAF50','#2E7D32','#4CAF50','#2E7D32','#4CAF50','#4CAF50',''],
      ['#4CAF50','#4CAF50','#2E7D32','#4CAF50','#4CAF50','#4CAF50','#2E7D32','#4CAF50','#4CAF50'],
      ['#8BC34A','#4CAF50','#4CAF50','#4CAF50','#4CAF50','#4CAF50','#4CAF50','#4CAF50','#8BC34A'],
      ['','#8BC34A','#8BC34A','#333','#8BC34A','#333','#8BC34A','#8BC34A',''],
      ['','','#8BC34A','#8BC34A','#8BC34A','#8BC34A','#8BC34A','',''],
      ['','','#4CAF50','','','','#4CAF50','',''],
    ],
    idleMsg: ['慢慢来，知识积累需要时间。', '你今天新增了2篇文档，不错！', '建议回顾一下上周的知识点。', '稳扎稳打，你的知识库在成长！'],
  },
  duck: {
    label: '小鸭子', emoji: '🦆', color: '#FFD54F', accent: '#FF8F00',
    pixels: [
      ['','','','#FFD54F','#FFD54F','','','',''],
      ['','','#FFD54F','#FFD54F','#FFD54F','#FFD54F','','',''],
      ['','#FFD54F','#FFD54F','#333','#FFD54F','#FFD54F','','',''],
      ['','#FFD54F','#FFD54F','#FFD54F','#FF8F00','#FFD54F','','',''],
      ['#FFD54F','#FFD54F','#FFD54F','#FFD54F','#FFD54F','#FFD54F','#FFD54F','',''],
      ['#FFD54F','#FFD54F','#FFD54F','#FFD54F','#FFD54F','#FFD54F','#FFD54F','',''],
      ['','#FF8F00','#FF8F00','','#FF8F00','#FF8F00','','',''],
    ],
    idleMsg: ['嘎嘎！来学点新知识吧！', '嘎~ 你今天的学习打卡了吗？', '发现了新的热门话题，要看看吗？', '嘎嘎嘎！知识库又壮大了！'],
  },
  snake: {
    label: '小蛇蛇', emoji: '🐍', color: '#66BB6A', accent: '#1B5E20',
    pixels: [
      ['','','#66BB6A','#66BB6A','#66BB6A','#66BB6A','','',''],
      ['','#66BB6A','#66BB6A','#333','#66BB6A','#333','#66BB6A','',''],
      ['','#66BB6A','#66BB6A','#66BB6A','#ff6b6b','#66BB6A','#66BB6A','',''],
      ['','','#66BB6A','#66BB6A','#66BB6A','#66BB6A','','',''],
      ['','','','#1B5E20','#66BB6A','#1B5E20','','',''],
      ['','','','','#66BB6A','','','',''],
      ['','','','','#66BB6A','','','',''],
    ],
    idleMsg: ['嘶~ 今天读了什么有趣的内容？', '嘶嘶~ 知识就是力量！', '发现你有个知识盲区，要探索吗？', '嘶~ 新的研究任务已就绪！'],
  },
}

// ─── 像素网格渲染 ────────────────────────────────────────────
function PixelGrid({ pixels, size = 5 }: { pixels: string[][], size?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: `repeat(${pixels.length}, ${size}px)`, gap: 0 }}>
      {pixels.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, ${size}px)`, gap: 0 }}>
          {row.map((color, ci) => (
            <div
              key={ci}
              style={{
                width: size, height: size,
                backgroundColor: color || 'transparent',
                imageRendering: 'pixelated',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── 宠物选择器 ─────────────────────────────────────────────
function PetSelector({ onClose }: { onClose: () => void }) {
  const { petType, setPetType, petName, setPetName } = useMindNestStore()
  const [name, setName] = useState(petName)
  const [selected, setSelected] = useState<PetType>(petType)

  const save = () => {
    setPetType(selected)
    setPetName(name || PET_CONFIGS[selected].label)
    onClose()
  }

  return (
    <div className="absolute bottom-20 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 bubble-float">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">选择你的小伙伴</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {(Object.keys(PET_CONFIGS) as PetType[]).map((type) => {
          const cfg = PET_CONFIGS[type]
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                selected === type ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-xl mb-1">{cfg.emoji}</span>
              <span className="text-xs text-gray-500">{cfg.label.slice(1)}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">给它起个名字</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={PET_CONFIGS[selected].label}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <button
        onClick={save}
        className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        确认
      </button>
    </div>
  )
}

// ─── 聊天气泡 ────────────────────────────────────────────────
function ChatWindow({ onClose }: { onClose: () => void }) {
  const { petMessages, addPetMessage, petType, petName } = useMindNestStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const cfg = PET_CONFIGS[petType]

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [petMessages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: input.trim(), timestamp: new Date().toISOString() }
    addPetMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim(), petType, petName }),
      })
      const data = await res.json()
      const aiMsg: ChatMessage = { id: generateId(), role: 'assistant', content: data.reply || '喵~ 让我想想...', timestamp: new Date().toISOString() }
      addPetMessage(aiMsg)
    } catch {
      const errMsg: ChatMessage = { id: generateId(), role: 'assistant', content: `${cfg.idleMsg[Math.floor(Math.random() * cfg.idleMsg.length)]}`, timestamp: new Date().toISOString() }
      addPetMessage(errMsg)
    } finally {
      setLoading(false)
    }
  }, [input, loading, petType, petName, cfg, addPetMessage])

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  return (
    <div className="absolute bottom-20 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col bubble-float" style={{ height: 380 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 rounded-t-2xl"
           style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.accent}11)` }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{petName}</p>
            <p className="text-xs text-gray-400">你的知识小助手</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {petMessages.length === 0 && (
          <div className="text-center py-6">
            <span className="text-3xl block mb-2">{cfg.emoji}</span>
            <p className="text-sm text-gray-500">你好！我是 {petName}～<br />有什么我能帮你的吗？</p>
          </div>
        )}
        {petMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <span className="text-lg mr-2 flex-shrink-0">{cfg.emoji}</span>}
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <span className="text-lg">{cfg.emoji}</span>
            <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="问点什么..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── 主组件 ──────────────────────────────────────────────────
export default function PixelPet() {
  const { petType, petName } = useMindNestStore()
  const [chatOpen, setChatOpen] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [bubble, setBubble] = useState('')
  const cfg = PET_CONFIGS[petType]

  // 随机气泡提醒
  useEffect(() => {
    const show = () => {
      const msg = cfg.idleMsg[Math.floor(Math.random() * cfg.idleMsg.length)]
      setBubble(msg)
      setTimeout(() => setBubble(''), 4000)
    }
    const timer = setInterval(show, 30000)
    setTimeout(show, 3000)
    return () => clearInterval(timer)
  }, [petType, cfg])

  const toggleChat = () => { setChatOpen(p => !p); setSelectorOpen(false) }
  const toggleSelector = () => { setSelectorOpen(p => !p); setChatOpen(false) }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* 聊天/选择面板 */}
      {chatOpen && <ChatWindow onClose={() => setChatOpen(false)} />}
      {selectorOpen && <PetSelector onClose={() => setSelectorOpen(false)} />}

      {/* 气泡提醒 */}
      {bubble && !chatOpen && (
        <div className="bubble-float bg-white text-gray-700 text-xs px-3 py-2 rounded-2xl rounded-br-sm shadow-lg border border-gray-100 max-w-[180px] text-right">
          {bubble}
        </div>
      )}

      {/* 宠物按钮 */}
      <div className="flex items-center gap-2">
        {/* 设置按钮 */}
        <button
          onClick={toggleSelector}
          className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        {/* 宠物主体 */}
        <button
          onClick={toggleChat}
          className="relative flex flex-col items-center group"
          title={`和${petName}聊天`}
        >
          {/* 宠物像素画 */}
          <div className="pet-bounce drop-shadow-md">
            <PixelGrid pixels={cfg.pixels} size={5} />
          </div>

          {/* 名字标签 */}
          <div className="mt-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow text-xs font-medium text-gray-600 border border-gray-100">
            {petName}
          </div>
        </button>
      </div>
    </div>
  )
}
