/**
 * 通用 AI 调用工具
 * 优先使用 Claude，其次 OpenAI，都没配置则返回 null
 */

export type AIProvider = 'claude' | 'openai' | 'none'

export function getAIProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'none'
}

export async function callAI(prompt: string, maxTokens = 2000): Promise<string | null> {
  const provider = getAIProvider()

  if (provider === 'claude') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    return res.content[0].type === 'text' ? res.content[0].text : null
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  }

  return null
}

export function parseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return { title: '链接内容', summary: text.slice(0, 150), ai_analysis: text }
  }
}
