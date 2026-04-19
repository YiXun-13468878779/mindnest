import { NextRequest } from 'next/server'
import { streamAI } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { title, summary, ai_analysis, raw_text, platform, url, category, mode } = await req.json()

  const isResearch = mode === 'research'
  const prompt = isResearch
    ? `你是一位知识研究专家。基于以下内容，进行深度知识研究和扩展，帮助用户构建完整的知识体系。

标题：${title}
摘要：${summary || ''}
来源：${url || platform || ''}
分类：${category || ''}
原始内容片段：${(raw_text || ai_analysis || '').slice(0, 1500)}

请用 Markdown 格式输出深度研究报告，包含以下章节：

## 核心洞察
（提炼3-5个最重要的观点或知识点）

## 背景知识
（补充理解这个内容所需的背景知识）

## 关键概念解析
（解释涉及的核心概念和术语）

## 实践价值
（这个知识在实际场景中的应用价值）

## 延伸阅读方向
（相关的知识领域和进一步学习建议）

## 深度思考问题
（3个能激发深度思考的问题）`
    : `你是一位知识整理专家。请对以下内容进行结构化总结，帮助用户快速掌握核心知识。

标题：${title}
原始内容：${(raw_text || ai_analysis || '').slice(0, 2000)}

请用 Markdown 格式输出，包含：

## 核心论点
（最重要的1-3个观点）

## 方法与论据
（支撑论点的关键方法或证据）

## 关键数据与结论
（重要数字、实验结果或核心结论）

## 一句话精华
（用一句话概括整篇内容的价值）

## 知识卡片
（适合放入知识库的3-5个知识点，每条不超过50字）`

  const stream = streamAI(prompt, 2000)
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
