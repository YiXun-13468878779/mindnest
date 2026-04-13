import { NextRequest, NextResponse } from 'next/server'
import { callAI, getAIProvider } from '@/lib/ai'

// 宠物人格系统提示
function getPetSystemPrompt(petType: string, petName: string): string {
  const personalities: Record<string, string> = {
    cat:    `你是一只活泼可爱的像素小猫，名字叫${petName}。你说话会在结尾加"喵~"，性格独立但对主人很贴心。你是用户的知识管理助手，帮助用户整理知识、回顾学习内容。`,
    dog:    `你是一只热情活泼的像素小狗，名字叫${petName}。你说话充满热情，偶尔说"汪汪！"，非常忠诚。你是用户的知识管理助手。`,
    turtle: `你是一只稳重睿智的像素小乌龟，名字叫${petName}。你说话慢条斯理、充满智慧，强调知识积累的重要性。你是用户的知识管理助手。`,
    duck:   `你是一只活泼好奇的像素小鸭子，名字叫${petName}。你说话活泼，偶尔"嘎嘎！"，对新事物充满好奇。你是用户的知识管理助手。`,
    snake:  `你是一只神秘聪慧的像素小蛇，名字叫${petName}。你说话简洁精准，偶尔"嘶~"，善于发现知识之间的隐藏联系。你是用户的知识管理助手。`,
  }
  return personalities[petType] || personalities.cat
}

export async function POST(req: NextRequest) {
  try {
    const { message, context, mode, petType, petName } = await req.json()

    if (getAIProvider() === 'none') {
      const fallbacks: Record<string, string> = {
        summary: '**摘要**\n\n这篇文档涵盖了核心概念和实践方法。\n\n> 配置 ANTHROPIC_API_KEY 或 OPENAI_API_KEY 后可启用 AI 自动摘要。',
        translate: 'This document covers core concepts and practical methods.\n\n> Configure ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI translation.',
        document: '请先在 .env.local 中配置 ANTHROPIC_API_KEY（Claude）或 OPENAI_API_KEY（OpenAI）以启用 AI 对话。',
      }
      const petFallbacks = [
        '喵~ 需要先配置 AI API Key 才能和你对话！在 .env.local 中添加 ANTHROPIC_API_KEY 或 OPENAI_API_KEY 就好啦。',
        '汪汪！主人你好！我需要连接到 AI 才能帮你整理知识，请先配置 API Key 哦。',
      ]
      return NextResponse.json({
        reply: fallbacks[mode] || petFallbacks[Math.floor(Math.random() * petFallbacks.length)]
      })
    }

    let prompt: string

    if (mode === 'summary') {
      prompt = `请对以下文档生成结构化摘要，包含关键点和重要结论，用 Markdown 格式输出：\n\n${context}`
    } else if (mode === 'translate') {
      prompt = `请将以下内容翻译为英文，保持 Markdown 格式：\n\n${context}`
    } else if (mode === 'document') {
      prompt = `你是 MindNest 的 AI 助手，专注于帮助用户管理和理解知识内容。请用中文回复，保持简洁专业。${context ? `\n\n当前文档：\n${context}` : ''}\n\n用户问题：${message}`
    } else {
      // 宠物对话模式
      const sysPrompt = getPetSystemPrompt(petType || 'cat', petName || '小助手')
      prompt = `${sysPrompt}\n\n你的职责：用活泼有趣的方式帮助用户回顾知识、提醒学习进度，回答简短（3-5句话）、充满个性。\n\n用户说：${message}`
    }

    const reply = await callAI(prompt, mode === 'translate' ? 2000 : 800)
    return NextResponse.json({ reply: reply || '抱歉，AI 暂时无法响应，请稍后重试。' })

  } catch (error: any) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { reply: '抱歉，AI 服务暂时不可用。请检查 API Key 配置。', error: error.message },
      { status: 200 }
    )
  }
}
