import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseJSON, getAIProvider } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { documents } = await req.json()
  if (!documents?.length) return NextResponse.json({ updates: [] })

  if (getAIProvider() === 'none') {
    return NextResponse.json({ error: '未配置 AI API Key' }, { status: 400 })
  }

  // 每次最多处理 20 篇，避免 token 超限
  const batch = documents.slice(0, 20)

  const prompt = `你是知识库整理助手。请为以下文档批量分配合适的分类和标签。

文档列表：
${batch.map((d: any, i: number) => `${i + 1}. ID:${d.id} | 标题:${d.title} | 现有标签:${(d.tags || []).join(',')} | 摘要:${(d.summary || '').slice(0, 80)}`).join('\n')}

请返回 JSON 数组（不要 markdown 代码块）：
[
  {
    "id": "文档ID",
    "category": "知识领域（如：前端开发/AI技术/产品设计/学术研究/效率工具/生活方式/商业洞察/科学技术等）",
    "tags": ["标签1", "标签2", "标签3"]
  }
]

要求：
- 分类要具体且一致（同类文档用相同分类名）
- 标签2-4个，简洁精准
- 保留原有合理标签，补充缺失的重要标签`

  const result = await callAI(prompt, 3000)
  if (!result) return NextResponse.json({ error: 'AI 调用失败' }, { status: 500 })

  try {
    const updates = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim())
    return NextResponse.json({ updates })
  } catch {
    return NextResponse.json({ error: '解析失败', raw: result }, { status: 500 })
  }
}
