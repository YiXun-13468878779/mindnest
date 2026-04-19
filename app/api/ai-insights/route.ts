import { NextRequest } from 'next/server'
import { streamAI } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { total, categories, topTags, recentTitles } = await req.json()

  const prompt = `你是一位知识管理顾问，请基于用户的知识库数据给出深度洞察和建议。

知识库数据：
- 总文档数：${total} 篇
- 知识领域分布：${JSON.stringify(categories)}
- 高频标签：${topTags?.join('、') || '暂无'}
- 最近记录的内容：${recentTitles?.join('、') || '暂无'}

请用 Markdown 格式输出以下内容（简洁有见地，不要废话）：

## 知识画像
（用2-3句话描述这个知识库主人的学习方向和特点）

## 发现的知识连接
（找出2-3个有趣的知识关联，如某两个领域的交叉点）

## 知识薄弱点
（指出1-2个与现有知识密切相关但缺失的领域）

## 本周学习建议
（给出3条具体可行的学习行动建议）

## 一句话洞察
（用一句有启发性的话总结当前学习状态）`

  const stream = streamAI(prompt, 1500)
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
