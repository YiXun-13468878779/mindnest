/**
 * 通用 AI 调用工具
 * 优先使用 ARK（火山方舟），其次 Claude，其次 OpenAI
 */

export type AIProvider = 'ark' | 'claude' | 'openai' | 'none'

export function getAIProvider(): AIProvider {
  if (process.env.ARK_API_KEY) return 'ark'
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'none'
}

export async function callAI(prompt: string, maxTokens = 2000): Promise<string | null> {
  const provider = getAIProvider()

  if (provider === 'ark') {
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.ARK_MODEL || 'doubao-seed-2-0-pro-260215',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  }

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

export function streamAI(prompt: string, maxTokens = 3000): ReadableStream<Uint8Array> {
  const provider = getAIProvider()

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        if (provider === 'ark' || provider === 'openai') {
          const url = provider === 'ark'
            ? 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
            : 'https://api.openai.com/v1/chat/completions'
          const key = provider === 'ark' ? process.env.ARK_API_KEY : process.env.OPENAI_API_KEY
          const model = provider === 'ark'
            ? (process.env.ARK_MODEL || 'doubao-seed-2-0-pro-260215')
            : 'gpt-4o-mini'

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model, max_tokens: maxTokens, stream: true, messages: [{ role: 'user', content: prompt }] }),
          })
          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            for (const line of lines) {
              const data = line.replace(/^data: /, '').trim()
              if (!data || data === '[DONE]') continue
              try {
                const delta = JSON.parse(data).choices?.[0]?.delta?.content
                if (delta) controller.enqueue(enc.encode(delta))
              } catch { /* ignore parse errors */ }
            }
          }
        } else if (provider === 'claude') {
          const Anthropic = (await import('@anthropic-ai/sdk')).default
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
          const stream = client.messages.stream({
            model: 'claude-sonnet-4-6', max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }],
          })
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(enc.encode(event.delta.text))
            }
          }
        } else {
          controller.enqueue(enc.encode('未配置 AI API Key，请在 .env.local 中设置 ARK_API_KEY。'))
        }
      } catch (e: any) {
        controller.enqueue(enc.encode(`\n\n[错误：${e.message}]`))
      } finally {
        controller.close()
      }
    },
  })
}

export function parseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return { title: '链接内容', summary: text.slice(0, 150), ai_analysis: text }
  }
}
