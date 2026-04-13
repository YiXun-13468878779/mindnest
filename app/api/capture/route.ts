import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseJSON, getAIProvider } from '@/lib/ai'

// ─── 识别平台 ─────────────────────────────────────────────────
function detectPlatform(url: string): { platform: string; videoId?: string; type: string } {
  if (/bilibili\.com\/video\/(BV[\w]+)/i.test(url)) {
    const m = url.match(/bilibili\.com\/video\/(BV[\w]+)/i)
    return { platform: 'bilibili', videoId: m?.[1], type: 'video' }
  }
  if (/b23\.tv|bilibili\.com/i.test(url)) {
    return { platform: 'bilibili', type: 'video' }
  }
  if (/xiaohongshu\.com|xhslink\.com|xhs\.cn/i.test(url)) {
    return { platform: 'xiaohongshu', type: 'image_text' }
  }
  if (/arxiv\.org\/abs\/([\d.]+)/i.test(url)) {
    const m = url.match(/arxiv\.org\/abs\/([\d.]+)/i)
    return { platform: 'arxiv', videoId: m?.[1], type: 'paper' }
  }
  if (/youtube\.com\/watch\?v=([\w-]+)|youtu\.be\/([\w-]+)/i.test(url)) {
    const m = url.match(/(?:v=|youtu\.be\/)([\w-]+)/i)
    return { platform: 'youtube', videoId: m?.[1], type: 'video' }
  }
  if (/weixin\.qq\.com|mp\.weixin/i.test(url)) {
    return { platform: 'wechat', type: 'article' }
  }
  if (/zhihu\.com/i.test(url)) {
    return { platform: 'zhihu', type: 'article' }
  }
  if (/juejin\.cn/i.test(url)) {
    return { platform: 'juejin', type: 'article' }
  }
  return { platform: 'general', type: 'webpage' }
}

// ─── 平台提示语策略 ───────────────────────────────────────────
function getAnalysisPrompt(platform: string, type: string, url: string, rawText: string): string {
  const base = `你是 MindNest 的智能内容分析助手。请对以下内容进行结构化整理，输出 JSON。`

  const strategies: Record<string, string> = {
    bilibili: `这是一个 B站视频链接。请根据视频标题和描述信息，生成一个结构化的知识整理文档。重点：提炼视频核心知识点、主要讲解内容、实用技巧，并补充相关背景知识。`,
    xiaohongshu: `这是一篇小红书图文内容。小红书内容信息量较少，请：1）提炼核心观点；2）自动搜索补充更高质量的相关信息（行业背景、权威来源、深度知识）；3）形成完整的知识文档。`,
    arxiv: `这是一篇学术论文。请重点整理：研究问题、方法、核心结论、实验结果、学术贡献，以及与该领域其他工作的关联。`,
    youtube: `这是一个 YouTube 视频。请根据标题和描述提炼核心知识，补充相关专业背景。`,
    general: `这是一个普通网页。请提炼核心内容，生成结构化的知识文档。`,
  }

  const strategy = strategies[platform] || strategies.general

  return `${base}

内容类型：${type}
来源平台：${platform}
URL：${url}
处理策略：${strategy}

原始内容：
${rawText || '（无法抓取原始内容，请根据 URL 推断内容）'}

请返回以下 JSON 格式（不要 markdown 代码块）：
{
  "title": "文档标题",
  "summary": "150字以内的核心摘要",
  "ai_analysis": "完整的AI整理结果（Markdown格式，包含：核心内容/知识点/关键结论等章节，不少于300字）",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "tags": ["标签1", "标签2"],
  "category": "知识领域（如：前端开发/AI技术/产品设计/学术研究/生活方式等）",
  "folder_suggestion": "建议归入的文件夹名"
}`
}

// ─── 尝试抓取页面内容（服务端）────────────────────────────────
async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    // 简单提取纯文本（去除 HTML 标签）
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
    return text
  } catch {
    return ''
  }
}

// ─── 主处理 ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, pageText } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: '请输入有效链接' }, { status: 400 })

    const { platform, videoId, type } = detectPlatform(url)

    // 优先使用插件/前端传来的页面文本，否则服务端抓取
    const rawText = pageText?.trim() || await fetchPageContent(url)

    // 如果没有配置任何 AI，返回基础结构（仍可保存链接）
    if (getAIProvider() === 'none') {
      const hostname = new URL(url).hostname
      return NextResponse.json({
        title: `${hostname} 的捕捉内容`,
        summary: '未配置 AI API Key，内容已保存（无 AI 分析）',
        ai_analysis: `# 捕捉内容\n\n**来源：** ${url}\n\n**原始内容：**\n\n${rawText || '（无法抓取内容）'}\n\n---\n> 配置 ANTHROPIC_API_KEY 或 OPENAI_API_KEY 后可启用 AI 自动分析`,
        keywords: [],
        tags: ['链接捕捉'],
        category: '未分类',
        folder_suggestion: '未分类',
        platform,
        videoId,
        type,
        raw_text: rawText,
      })
    }

    // 调用 AI 分析（自动选择 Claude 或 OpenAI）
    const prompt = getAnalysisPrompt(platform, type, url, rawText)
    const aiText = await callAI(prompt, 2000)
    const parsed = aiText ? parseJSON(aiText) : { title: '链接内容', summary: '', ai_analysis: '' }

    return NextResponse.json({
      ...parsed,
      platform,
      videoId,
      type,
      raw_text: rawText,
      captured_url: url,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── PUT：从浏览器插件保存文档 ────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title, content, summary, keywords, tags, category,
      source_url, captured_url, platform, video_id, raw_text,
      ai_analysis, source_type,
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 })
    }

    // 构建文档对象（存储在服务端内存 store，前端 Zustand 已有独立状态）
    // 这里返回成功标记，前端通过 /api/documents 持久化或直接操作 Zustand
    const doc = {
      id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      content,
      summary: summary || '',
      keywords: keywords || [],
      tags: tags || [],
      category: category || '未分类',
      source_url: source_url || captured_url || '',
      captured_url: captured_url || source_url || '',
      platform: platform || 'general',
      video_id: video_id || '',
      raw_text: raw_text || '',
      ai_analysis: ai_analysis || '',
      source_type: source_type || 'link',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      folder_id: null,
      is_favorite: false,
      read_time: Math.ceil((content?.length || 0) / 500),
    }

    // 如果有 Supabase，存入数据库
    // 暂时返回成功，前端会在下次打开 app 时通过 /api/documents GET 刷新
    return NextResponse.json({ ok: true, doc })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
