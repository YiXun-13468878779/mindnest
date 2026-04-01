import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!client) {
      return NextResponse.json({
        title: `研究：${query}`,
        content: `# ${query}\n\n## 概述\n\n这是一个关于「${query}」的研究报告。请配置 Claude API Key 以获取真实的 AI 研究内容。\n\n## 关键概念\n\n- 概念 1\n- 概念 2\n- 概念 3\n\n## 总结\n\n需要配置 ANTHROPIC_API_KEY 环境变量以启用 AI 研究功能。`,
        summary: `关于${query}的研究报告`,
        keywords: [query],
        tags: ['AI研究'],
      })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `你是 MindNest 的 AI 研究助手。当用户提出一个研究主题时，你需要：
1. 系统性地整理该主题的核心知识
2. 生成结构化的 Markdown 文档
3. 包含：概述、核心概念、实践应用、常见误区、延伸阅读等章节

返回格式：
---TITLE---
文档标题
---CONTENT---
Markdown 格式的完整内容
---SUMMARY---
100字以内的摘要
---KEYWORDS---
关键词1,关键词2,关键词3
---TAGS---
标签1,标签2`,
      messages: [{ role: 'user', content: `请深入研究以下主题：${query}` }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    const parse = (marker: string) => {
      const regex = new RegExp(`---${marker}---\\n([\\s\\S]*?)(?=---[A-Z]+---|$)`)
      return text.match(regex)?.[1]?.trim() || ''
    }

    return NextResponse.json({
      title: parse('TITLE') || `研究：${query}`,
      content: parse('CONTENT') || text,
      summary: parse('SUMMARY') || `关于${query}的AI研究报告`,
      keywords: parse('KEYWORDS').split(',').map(k => k.trim()).filter(Boolean),
      tags: ['AI研究', ...parse('TAGS').split(',').map(t => t.trim()).filter(Boolean)],
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
