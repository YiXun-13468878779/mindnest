import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

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

    if (!client) {
      // 没有配置 API Key 时返回占位回复
      const fallbacks: Record<string, string> = {
        summary: '**摘要**\n\n这篇文档涵盖了核心概念和实践方法。\n\n**关键词**：知识管理、AI、文档整理',
        translate: 'This document covers core concepts and practical methods in knowledge management.',
        document: '我需要先配置 Claude API Key 才能帮你分析这篇文档。请在 .env.local 中添加 ANTHROPIC_API_KEY。',
      }
      const petFallbacks = [
        '喵~ 我需要先配置 Claude API Key 才能和你对话！请让主人在 .env.local 中添加 ANTHROPIC_API_KEY。',
        '嗯嗯，这个问题很好！不过我需要先连接到 Claude API 才能回答你。',
      ]
      return NextResponse.json({
        reply: fallbacks[mode] || petFallbacks[Math.floor(Math.random() * petFallbacks.length)]
      })
    }

    let systemPrompt: string
    let userMessage: string

    if (mode === 'document' || mode === 'summary' || mode === 'translate') {
      systemPrompt = `你是 MindNest 的 AI 助手，专注于帮助用户管理和理解知识内容。
${context ? `\n当前文档内容：\n${context}` : ''}
请用中文回复，保持简洁专业。`
      userMessage = message
    } else {
      // 宠物对话模式
      systemPrompt = `${getPetSystemPrompt(petType || 'cat', petName || '小助手')}

你的职责：
1. 用活泼有趣的方式帮助用户回顾和整理知识
2. 提醒用户学习进度和知识库更新
3. 回答用户关于知识管理的问题
4. 保持对话简短（3-5句话）、充满个性

重要：保持你的宠物性格，用第一人称，适当加入语气词。`
      userMessage = message
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: mode === 'translate' ? 2000 : 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })

  } catch (error: any) {
    console.error('Claude API error:', error)
    return NextResponse.json(
      { reply: '抱歉，AI 服务暂时不可用。请检查 API Key 配置。', error: error.message },
      { status: 200 } // 返回 200 避免前端报错
    )
  }
}
