# MindNest — Claude Code 工作指南

## 项目简介

MindNest 是一个 **AI 驱动的个人知识管理工具**，帮助用户捕捉、整理、关联和回顾碎片化知识。
核心理念：不只是「存」知识，而是让知识真正被「用」起来。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand + localStorage 持久化 |
| AI | Anthropic Claude API（`claude-sonnet-4-6`） |
| 图表 | Recharts |
| 知识图谱 | D3.js（force-directed + tree view） |
| 文件处理 | react-dropzone |
| Markdown | react-markdown + remark-gfm |
| 数据库（可选） | Supabase + pgvector |
| 通知 | react-hot-toast |

---

## 项目结构

```
D:/mindnest/
├── app/
│   ├── page.tsx              # 仪表盘（Dashboard）
│   ├── layout.tsx            # 根布局（无 Google Fonts，已移除）
│   ├── globals.css           # 全局样式 + Tailwind
│   ├── knowledge/page.tsx    # 知识库页面
│   ├── document/[id]/page.tsx# 文档详情/编辑
│   ├── graph/page.tsx        # 知识图谱
│   ├── insights/page.tsx     # 学习洞察
│   ├── research/page.tsx     # AI 研究助手
│   └── api/
│       ├── chat/route.ts     # 宠物对话 + 文档助手
│       ├── capture/route.ts  # 链接捕捉分析（POST）+ 保存（PUT）
│       ├── documents/route.ts# 文档 AI 元数据提取
│       └── research/route.ts # 深度研究生成
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # 左侧导航栏
│   │   └── AppLayout.tsx     # 页面布局包装器
│   └── pet/
│       └── PixelPet.tsx      # 像素宠物组件
├── lib/
│   ├── store.ts              # Zustand store（全局状态 + mock 数据）
│   ├── types.ts              # TypeScript 类型定义
│   ├── utils.ts              # 工具函数
│   └── supabase.ts           # Supabase 客户端（可选）
├── browser-extension/        # Chrome/Edge 浏览器插件
│   ├── manifest.json         # MV3 配置（Alt+S 快捷键）
│   ├── popup.html/js         # 弹窗 UI
│   ├── background.js         # Service Worker
│   ├── content.js            # 页面内容提取 + Toast 提示
│   └── icons/                # 插件图标
├── .env.local                # 环境变量（不提交 git）
├── next.config.js            # Next.js 配置（CommonJS 格式，不是 .ts）
└── SETUP.md                  # 用户安装指南
```

---

## 核心数据结构

### Document（`lib/types.ts`）

```typescript
interface Document {
  id: string
  title: string
  content: string          // Markdown 正文
  summary?: string         // AI 生成摘要
  keywords: string[]
  tags: string[]
  category?: string        // AI 分类（前端开发/AI技术/产品设计等）
  source_type: 'manual' | 'link' | 'file' | 'research'
  folder_id?: string | null
  file_type?: string       // MIME type
  file_name?: string       // 原始文件名
  file_data?: string       // base64 dataURL（PDF/图片预览用）
  captured_url?: string    // 链接来源
  platform?: string        // bilibili/xiaohongshu/arxiv/youtube/general
  video_id?: string        // B站 BVid / YouTube videoId
  raw_text?: string        // 原始页面文字
  ai_analysis?: string     // AI 整理结果（Markdown）
  created_at: string       // ISO 8601
  updated_at: string
  word_count: number
  view_count: number
  is_favorite?: boolean
}
```

### Zustand Store（`lib/store.ts`）

主要 actions：`addDocument` / `updateDocument` / `deleteDocument` / `setSelectedFolderId`

状态通过 `persist` 中间件持久化到 `localStorage`，key 为 `mindnest-store`。

---

## 环境变量

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...   # Claude API，不配置则 AI 功能降级（仍可使用基础功能）

# 可选：Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> AI 功能均有降级处理：无 API Key 时返回基础结构，不报错。

---

## 关键设计决策

### 1. next.config 必须是 `.js`（CommonJS）
Next.js 14.2.5 不支持 `next.config.ts`。使用 `module.exports = {}` 格式。

### 2. 无 Google Fonts
`app/layout.tsx` 中已移除 Google Fonts 引用，改用系统字体栈，确保国内不开代理可正常访问。

### 3. 文件预览方式
- PDF / 图片：FileReader 读为 base64 dataURL → `<iframe src={dataURL}>` 或 `<img>`
- 文本文件：读为 UTF-8 字符串 → Markdown 渲染
- Word/其他：显示元信息卡片

### 4. 链接捕捉流程
```
用户输入 URL
  → POST /api/capture（平台识别 + 服务端抓取页面内容 + Claude 分析）
  → 前端展示：视频嵌入 + AI 分析 Tab + 原文 Tab
  → 用户点击保存 → addDocument() 写入 Zustand
```
**常见问题**：捕捉后内容不出现在知识库，通常是 `selectedFolderId` 有值导致过滤。知识库页有「全部文档」按钮可清除筛选。

### 5. 知识库筛选逻辑
```typescript
if (selectedFolderId === '__unclassified__' && d.folder_id) return false
else if (selectedFolderId && selectedFolderId !== '__unclassified__' && d.folder_id !== selectedFolderId) return false
```
特殊 ID `'__unclassified__'` 表示「未归类文档」。`null` 表示全部。

### 6. 浏览器插件安装
加载 `browser-extension/` 目录为「未打包扩展」：
- Chrome：`chrome://extensions/` → 开发者模式 → 加载已解压
- Edge：`edge://extensions/` → 开发人员模式 → 加载解压缩
- 快捷键：**Alt+S**（任意页面触发捕捉）

---

## AI API 调用规范

所有 AI 调用使用 `claude-sonnet-4-6` 模型：

```typescript
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// 调用前必须检查 client 是否为 null
if (!client) return /* 降级响应 */
```

各端点职责：
- `/api/chat` — 宠物对话（带角色人格）+ 文档摘要/翻译
- `/api/capture` — 链接内容分析，支持平台策略（B站/小红书/arxiv 不同提示词）
- `/api/documents` — 上传文件时提取 summary/keywords/tags/category
- `/api/research` — 生成结构化研究文档

---

## 像素宠物

5 种可选：`cat` / `dog` / `turtle` / `duck` / `snake`

- 用纯 CSS 像素格子渲染（无图片资源）
- 状态：`idle` / `happy` / `thinking` / `sleeping`
- 悬浮气泡消息每 30 秒随机触发
- 对话调用 `/api/chat`，带动物人格 system prompt

---

## 本地开发

```bash
cd D:/mindnest
npm run dev        # 启动开发服务器 → http://localhost:3000
npm run build      # 构建生产版本
npm run lint       # ESLint 检查
```

> 每次修改代码后 Next.js 热重载，**无需重启服务器**。
> 只有修改 `.env.local` 才需要重启。

---

## 已知问题 & 注意事项

1. **TypeScript 报错**：`app/document/[id]/page.tsx` 和 `app/knowledge/page.tsx` 存在若干 TS 类型警告，不影响运行
2. **Supabase 未接入**：当前所有数据存 localStorage，刷新后保留，清除浏览器数据会丢失
3. **B站 CORS**：服务端抓取 B站页面会被拦截，AI 分析依赖视频标题/描述，无法获取字幕
4. **文件大小限制**：base64 存 localStorage，单文件建议 < 5MB，否则影响性能
5. **插件图标**：已通过 `create-icons.js` 脚本生成，重新生成运行 `node browser-extension/create-icons.js`

---

## 产品规划方向（供参考）

- [ ] 闪念胶囊：极简一句话记录入口
- [ ] 复习提醒：基于遗忘曲线的推送
- [ ] 截图 OCR：图片内容识别
- [ ] 知识问答（RAG）：基于向量数据库的语义检索
- [ ] 视频字幕提取：接入 Whisper API
- [ ] 输出功能：多笔记合并生成文章
