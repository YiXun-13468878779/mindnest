'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Document, Folder, ResearchTask, PetType, ChatMessage, Activity } from './types'

// ── Mock 数据 ────────────────────────────────────────────────
export const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1', title: 'React Hooks 深度解析', content: '# React Hooks 深度解析\n\n全面介绍 useState、useEffect 等核心 Hook 的使用技巧和常见陷阱...',
    summary: '全面介绍React Hooks的原理、使用场景和最佳实践', keywords: ['React', 'Hooks', 'useState', 'useEffect'],
    tags: ['React', '前端开发', 'JavaScript'], source_type: 'manual', folder_id: 'f1',
    created_at: '2024-01-20T08:00:00Z', updated_at: '2024-01-20T10:00:00Z', word_count: 2500, view_count: 156,
  },
  {
    id: '2', title: '机器学习算法总结', content: '# 机器学习算法总结\n\n监督学习、无监督学习、强化学习三大类算法的对比分析...',
    summary: '监督学习、无监督学习、强化学习三大类算法的对比分析', keywords: ['机器学习', '算法', 'AI'],
    tags: ['机器学习', 'AI', '算法'], source_type: 'research', folder_id: 'f2',
    created_at: '2024-01-18T08:00:00Z', updated_at: '2024-01-18T09:00:00Z', word_count: 3200, view_count: 89,
  },
  {
    id: '3', title: '产品设计思维', content: '# 产品设计思维\n\n从用户需求到产品原型的完整设计流程和方法论...',
    summary: '从用户需求到产品原型的完整设计流程和方法论', keywords: ['产品', '设计', '用户研究'],
    tags: ['产品设计', 'UX'], source_type: 'link', folder_id: 'f3',
    created_at: '2024-01-16T08:00:00Z', updated_at: '2024-01-16T08:00:00Z', word_count: 1800, view_count: 43,
  },
  {
    id: '4', title: 'TypeScript 高级类型系统', content: '# TypeScript 高级类型系统\n\n条件类型、映射类型、模板字面量类型深度解析...',
    summary: 'TypeScript高级类型特性完全指南', keywords: ['TypeScript', '类型系统', '泛型'],
    tags: ['TypeScript', '前端开发'], source_type: 'research', folder_id: 'f1',
    created_at: '2024-01-15T08:00:00Z', updated_at: '2024-01-15T08:00:00Z', word_count: 4100, view_count: 201,
  },
]

export const MOCK_FOLDERS: Folder[] = [
  { id: 'f1', name: '前端开发', doc_count: 2 },
  { id: 'f2', name: 'AI技术', doc_count: 1, children: [
    { id: 'f2-1', name: '深度学习', parent_id: 'f2', doc_count: 1 },
  ]},
  { id: 'f3', name: '产品设计', doc_count: 1 },
]

export const MOCK_ACTIVITIES: Activity[] = [
  { date: '周一', docs_created: 2, annotations_count: 5, tags_added: 3, study_minutes: 45 },
  { date: '周二', docs_created: 1, annotations_count: 2, tags_added: 1, study_minutes: 20 },
  { date: '周三', docs_created: 3, annotations_count: 8, tags_added: 4, study_minutes: 60 },
  { date: '周四', docs_created: 2, annotations_count: 3, tags_added: 2, study_minutes: 35 },
  { date: '周五', docs_created: 4, annotations_count: 10, tags_added: 6, study_minutes: 80 },
  { date: '周六', docs_created: 1, annotations_count: 1, tags_added: 0, study_minutes: 15 },
  { date: '周日', docs_created: 2, annotations_count: 4, tags_added: 2, study_minutes: 40 },
]

// ── Store ─────────────────────────────────────────────────────
interface MindNestStore {
  // 文档
  documents: Document[]
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  deleteDocument: (id: string) => void

  // 文件夹
  folders: Folder[]
  addFolder: (folder: Folder) => void

  // 研究任务
  researchTasks: ResearchTask[]
  addResearchTask: (task: ResearchTask) => void
  updateResearchTask: (id: string, updates: Partial<ResearchTask>) => void

  // 宠物
  petType: PetType
  setPetType: (type: PetType) => void
  petName: string
  setPetName: (name: string) => void
  petMood: 'happy' | 'normal' | 'sleepy'
  setPetMood: (mood: 'happy' | 'normal' | 'sleepy') => void

  // 宠物聊天
  petMessages: ChatMessage[]
  addPetMessage: (msg: ChatMessage) => void
  clearPetMessages: () => void

  // UI 状态
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  selectedFolderId: string | null
  setSelectedFolderId: (id: string | null) => void
}

export const useMindNestStore = create<MindNestStore>()(
  persist(
    (set) => ({
      documents: MOCK_DOCUMENTS,
      addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
      updateDocument: (id, updates) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
      deleteDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      folders: MOCK_FOLDERS,
      addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),

      researchTasks: [
        { id: 'r1', query: '帮我研究一下React Hooks的最佳实践', status: 'completed', result_doc_id: '1', created_at: '2024-01-20T14:30:00Z', completed_at: '2024-01-20T14:35:00Z' },
        { id: 'r2', query: '机器学习算法对比分析', status: 'running', created_at: '2024-01-20T15:00:00Z' },
        { id: 'r3', query: '产品设计思维方法论', status: 'failed', created_at: '2024-01-19T10:00:00Z', error: '搜索超时，请重试' },
      ],
      addResearchTask: (task) => set((s) => ({ researchTasks: [task, ...s.researchTasks] })),
      updateResearchTask: (id, updates) =>
        set((s) => ({ researchTasks: s.researchTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),

      petType: 'cat',
      setPetType: (type) => set({ petType: type }),
      petName: '小奶猫',
      setPetName: (name) => set({ petName: name }),
      petMood: 'happy',
      setPetMood: (mood) => set({ petMood: mood }),

      petMessages: [],
      addPetMessage: (msg) => set((s) => ({ petMessages: [...s.petMessages, msg] })),
      clearPetMessages: () => set({ petMessages: [] }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      selectedFolderId: null,
      setSelectedFolderId: (id) => set({ selectedFolderId: id }),
    }),
    { name: 'mindnest-store' }
  )
)
