// MindNest 浏览器插件 - content.js

let captureOverlay = null
let isCapturing = false

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'triggerCapture') {
    triggerCapture()
    sendResponse({ ok: true })
  }
  if (message.action === 'extractContent') {
    sendResponse({ content: extractPageContent() })
  }
})

function extractPageContent() {
  // 优先提取文章主体
  const articleSelectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '#article-content',
    '.note-content',        // 小红书
    '.video-intro-desc',    // B站
    '.desc-info-main',      // B站
    '.abstract',            // arxiv
    'main',
    '.content',
    '#content',
  ]

  for (const sel of articleSelectors) {
    const el = document.querySelector(sel)
    if (el) {
      const text = el.innerText?.trim()
      if (text && text.length > 200) return text.slice(0, 5000)
    }
  }

  // 降级：提取所有段落
  const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3'))
    .map(el => el.innerText?.trim())
    .filter(t => t && t.length > 20)
    .join('\n\n')

  if (paragraphs.length > 200) return paragraphs.slice(0, 5000)

  return document.body?.innerText?.slice(0, 3000) || ''
}

async function triggerCapture() {
  if (isCapturing) return
  isCapturing = true

  // 显示悬浮提示
  showToast('🧠 MindNest 正在捕捉页面...', 'loading')

  try {
    const serverUrl = await getServerUrl()
    const url = window.location.href
    const pageText = extractPageContent()

    // 调用分析接口
    const res = await fetch(`${serverUrl}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, pageText }),
    })

    if (!res.ok) throw new Error('服务器错误 ' + res.status)
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // 保存到知识库
    await fetch(`${serverUrl}/api/capture`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title || document.title || '捕捉内容',
        content: `# ${data.title}\n\n## AI 整理结果\n\n${data.ai_analysis || data.summary}\n\n---\n\n来源：${url}`,
        summary: data.summary,
        keywords: data.keywords || [],
        tags: [...(data.tags || []), '插件捕捉'],
        category: data.category,
        source_url: url,
        captured_url: url,
        platform: data.platform,
        video_id: data.videoId,
        raw_text: pageText,
        ai_analysis: data.ai_analysis,
        source_type: 'link',
      }),
    })

    showToast(`✓ 已捕捉：${(data.title || '页面内容').slice(0, 30)}`, 'success')
    chrome.runtime.sendMessage({ action: 'captureComplete', title: data.title })

  } catch (e) {
    showToast('捕捉失败：' + (e.message || '请检查 MindNest 是否运行'), 'error')
    chrome.runtime.sendMessage({ action: 'captureError', error: e.message })
  } finally {
    isCapturing = false
  }
}

async function getServerUrl() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getServerUrl' }, res => {
      resolve(res?.serverUrl || 'http://localhost:3000')
    })
  })
}

function showToast(msg, type) {
  // 移除旧 toast
  const old = document.getElementById('mindnest-toast')
  if (old) old.remove()

  const colors = {
    loading: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    success: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    error:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  }
  const c = colors[type] || colors.loading

  const toast = document.createElement('div')
  toast.id = 'mindnest-toast'
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    padding: 12px 18px;
    background: ${c.bg};
    color: ${c.color};
    border: 1px solid ${c.border};
    border-radius: 12px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 320px;
    animation: mindnest-slide-in 0.2s ease;
  `

  // 加载动画
  if (type === 'loading') {
    const spinner = document.createElement('div')
    spinner.style.cssText = `
      width: 14px; height: 14px;
      border: 2px solid ${c.border};
      border-top-color: ${c.color};
      border-radius: 50%;
      animation: mindnest-spin 0.6s linear infinite;
      flex-shrink: 0;
    `
    toast.appendChild(spinner)
  }

  const text = document.createElement('span')
  text.textContent = msg
  toast.appendChild(text)

  // 注入动画样式
  if (!document.getElementById('mindnest-style')) {
    const style = document.createElement('style')
    style.id = 'mindnest-style'
    style.textContent = `
      @keyframes mindnest-spin { to { transform: rotate(360deg); } }
      @keyframes mindnest-slide-in {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `
    document.head.appendChild(style)
  }

  document.body.appendChild(toast)

  // 自动消失（成功/失败 3 秒后）
  if (type !== 'loading') {
    setTimeout(() => toast.remove(), 3000)
  }
}
