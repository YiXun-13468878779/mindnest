import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// 自动提取文档元数据（摘要、关键词、标签）
export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json()

    if (!client) {
      return NextResponse.json({
        summary: `${title} 的智能摘要（需配置 Claude API Key）`,
        keywords: ['知识', '学习', '文档'],
        tags: ['未分类'],
      })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: '你是一个文档分析助手。请分析用户提供的文档内容，返回 JSON 格式的结果。',
      messages: [{
        role: 'user',
        content: `请分析以下文档，返回 JSON 格式（不要 markdown 代码块）：
{
  "summary": "100字以内的摘要",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "tags": ["标签1", "标签2", "标签3"],
  "category": "知识领域分类（如：前端开发、AI技术、产品设计等）"
}

文档标题：${title}
文档内容：${content.slice(0, 3000)}`
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
    return NextResponse.json(parsed)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
