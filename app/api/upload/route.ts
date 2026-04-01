import { NextRequest, NextResponse } from 'next/server'

// 文件上传 API（集成 Supabase Storage）
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: '未找到文件' }, { status: 400 })

    // TODO: 当 Supabase 配置后，上传到 Storage
    // const { data, error } = await supabase.storage.from('documents').upload(`${Date.now()}_${file.name}`, file)
    // if (error) throw error
    // const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(data.path)

    // 本地模式：返回 mock URL
    const mockUrl = `/files/${file.name}`

    return NextResponse.json({
      url: mockUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
