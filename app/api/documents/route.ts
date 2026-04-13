import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseJSON, getAIProvider } from '@/lib/ai'

// 自动提取文档元数据（摘要、关键词、标签）
export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json()

    if (getAIProvider() === 'none') {
      return NextResponse.json({
        summary: `${title} 的文档摘要（配置 AI API Key 后自动生成）`,
        keywords: ['知识', '学习', '文档'],
        tags: ['未分类'],
        category: '文件',
      })
    }

    const prompt = `请分析以下文档，返回 JSON 格式（不要 markdown 代码块）：
{
  "summary": "100字以内的摘要",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "tags": ["标签1", "标签2", "标签3"],
  "category": "知识领域分类（如：前端开发、AI技术、产品设计等）"
}

文档标题：${title}
文档内容：${content.slice(0, 3000)}`

    const text = await callAI(prompt, 500)
    if (!text) throw new Error('AI 返回为空')
    const parsed = parseJSON(text)
    return NextResponse.json(parsed)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
