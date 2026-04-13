# 🧠 MindNest — AI 驱动的个人知识库

> 捕捉碎片、整理思维、激活知识。不只是存，而是真正用起来。

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![Claude API](https://img.shields.io/badge/Claude-Sonnet_4.6-orange?style=flat-square)

---

## ✨ 核心功能

### 📚 知识库管理
- 支持创建、编辑、删除文档（Notion 风格块编辑器）
- 文件导入：PDF、Word、Markdown、图片、TXT
- 文件预览：PDF 内嵌预览、图片展示、Markdown 渲染
- 多维筛选：按来源类型、知识领域、创建时间筛选
- 全部文档 / 未归类 / 文件夹三级结构

### 🔗 智能链接捕捉
- 粘贴链接一键分析，AI 自动提取核心知识
- 支持平台：B站视频、小红书图文、arxiv 论文、YouTube、知乎、掘金、微信公众号
- 保留原始链接、视频嵌入、AI 整理结果、原文内容四合一
- 自动识别平台，采用差异化分析策略

### 🕸️ 知识图谱
- D3.js 力导向图，可视化文档关联网络
- 树状图视图，按知识领域层级展示
- 点击节点查看详情及关联文档

### 📊 学习洞察
- GitHub 风格热力图（16 周活跃度）
- 连续打卡天数 + 成就激励系统
- 知识领域分布饼图（真实数据）
- 知识库增长趋势面积图
- 知识能力雷达图

### 🔬 AI 研究助手
- 输入研究主题，AI 自动生成结构化知识文档
- 支持多个并发研究任务
- 研究结果自动保存到知识库

### 🐾 像素宠物
- 5 种可选宠物：小猫、小狗、乌龟、鸭子、小蛇
- 纯 CSS 像素风格，帧动画
- 可与宠物对话，支持文档助手、摘要、翻译功能

### 🔌 浏览器插件
- 支持 Chrome / Edge（Chromium 内核）
- **Alt+S** 快捷键，任意页面一键捕捉
- 页面右上角 Toast 提示，非侵入式体验
- 自动分析并存入知识库

---

## 🖥️ 页面预览

| 页面 | 功能 |
|------|------|
| 仪表盘 | 统计概览、快速操作、智能链接捕捉 |
| 知识库 | 文档列表、文件上传、多维筛选 |
| 文档详情 | 块编辑器、AI 面板、文件预览 |
| 知识图谱 | 力导向图、树状图、节点详情 |
| 学习洞察 | 热力图、图表分析、成就系统 |
| 研究助手 | AI 深度研究、任务管理 |

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/YiXun-13468878779/mindnest.git
cd mindnest

# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
```

### 配置 API Key（可选）

编辑 `.env.local`：

```env
# Claude API Key（用于 AI 分析功能）
# 获取地址：https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> 不配置 API Key 也可以正常使用，AI 分析功能会降级为基础模式。

### 启动

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

---

## 🔌 安装浏览器插件

1. 打开 Edge：`edge://extensions/` 或 Chrome：`chrome://extensions/`
2. 开启右上角**开发人员模式**
3. 点击**加载解压缩的扩展**
4. 选择项目中的 `browser-extension/` 文件夹
5. 确保 MindNest 本地服务运行中（`npm run dev`）

安装后按 **Alt+S** 即可在任意页面触发智能捕捉。

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Next.js 14](https://nextjs.org/) | 全栈框架（App Router） |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Tailwind CSS](https://tailwindcss.com/) | 样式 |
| [Zustand](https://zustand-demo.pmnd.rs/) | 状态管理 + 本地持久化 |
| [Claude API](https://www.anthropic.com/) | AI 分析、对话、研究 |
| [D3.js](https://d3js.org/) | 知识图谱可视化 |
| [Recharts](https://recharts.org/) | 数据图表 |
| [Supabase](https://supabase.com/) | 云数据库（可选） |
| Chrome Extension MV3 | 浏览器插件 |

---

## 📁 项目结构

```
mindnest/
├── app/                    # Next.js 页面和 API
│   ├── page.tsx            # 仪表盘
│   ├── knowledge/          # 知识库
│   ├── document/[id]/      # 文档详情
│   ├── graph/              # 知识图谱
│   ├── insights/           # 学习洞察
│   ├── research/           # 研究助手
│   └── api/                # 后端接口
├── components/
│   ├── layout/             # Sidebar、AppLayout
│   └── pet/                # 像素宠物
├── lib/
│   ├── store.ts            # Zustand 全局状态
│   ├── types.ts            # TypeScript 类型
│   └── utils.ts            # 工具函数
└── browser-extension/      # Chrome/Edge 插件
```

---

## 🗺️ 规划中的功能

- [ ] 闪念胶囊：极简一句话随手记
- [ ] 遗忘曲线复习提醒
- [ ] 截图 OCR 识别
- [ ] 知识问答（基于 RAG）
- [ ] 视频字幕提取（Whisper）
- [ ] 多笔记合并生成文章

---

## 📄 License

MIT License © 2024 MindNest
