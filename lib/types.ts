// ============================================================
// MindNest 全局类型定义
// ============================================================

export type SourceType = 'file' | 'link' | 'manual' | 'research'

export interface Document {
  id: string
  title: string
  content: string
  summary?: string
  keywords?: string[]
  tags: string[]
  source_type: SourceType
  source_url?: string
  file_url?: string        // 文件原始 URL 或 blob URL
  file_data?: string       // base64 数据（PDF/图片本地预览用）
  file_type?: string       // MIME type
  file_name?: string       // 原始文件名
  folder_id?: string
  category?: string        // AI 自动分类领域
  // 链接捕捉专属
  captured_url?: string    // 原始链接
  platform?: string        // 'bilibili' | 'xiaohongshu' | 'arxiv' | 'general'
  video_id?: string        // 视频平台 ID（用于嵌入播放）
  raw_text?: string        // 抓取的原始文本
  ai_analysis?: string     // AI 整理结果
  created_at: string
  updated_at: string
  word_count?: number
  view_count?: number
}

export interface Folder {
  id: string
  name: string
  parent_id?: string
  children?: Folder[]
  doc_count?: number
}

export interface Annotation {
  id: string
  doc_id: string
  range_start: number
  range_end: number
  text: string
  type: 'highlight' | 'comment'
  comment_body?: string
  color?: string
}

export interface ResearchTask {
  id: string
  query: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result_doc_id?: string
  created_at: string
  completed_at?: string
  error?: string
}

export interface KnowledgeNode {
  id: string
  name: string
  type: 'concept' | 'technology' | 'method' | 'skill' | 'person' | 'event'
  category: string
  doc_count: number
  x?: number
  y?: number
}

export interface KnowledgeEdge {
  source: string
  target: string
  weight: number
}

export interface Activity {
  date: string
  docs_created: number
  annotations_count: number
  tags_added: number
  study_minutes: number
}

export interface DailyReport {
  date: string
  new_docs: number
  highlight_docs: Document[]
  ai_comment: string
}

export type PetType = 'cat' | 'dog' | 'turtle' | 'duck' | 'snake'

export interface PetConfig {
  type: PetType
  name: string
  emoji: string
  label: string
  color: string
  bgColor: string
  mood: 'happy' | 'normal' | 'sleepy'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Block Editor 类型
export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'code'
  | 'quote'
  | 'divider'
  | 'image'

export interface Block {
  id: string
  type: BlockType
  content: string
  meta?: Record<string, string>
}
