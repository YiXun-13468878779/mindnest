// MindNest 浏览器插件 - popup.js

const PLATFORM_CONFIG = {
  'bilibili.com':    { label: 'B站视频',   color: '#ec4899', bg: '#fdf2f8' },
  'xiaohongshu.com': { label: '小红书',    color: '#ef4444', bg: '#fef2f2' },
  'xhslink.com':     { label: '小红书',    color: '#ef4444', bg: '#fef2f2' },
  'arxiv.org':       { label: '学术论文',  color: '#7c3aed', bg: '#faf5ff' },
  'youtube.com':     { label: 'YouTube',   color: '#ef4444', bg: '#fef2f2' },
  'zhihu.com':       { label: '知乎',      color: '#2563eb', bg: '#eff6ff' },
  'juejin.cn':       { label: '掘金',      color: '#d97706', bg: '#fffbeb' },
  'weixin.qq.com':   { label: '微信公众号', color: '#16a34a', bg: '#f0fdf4' },
  'mp.weixin.qq.com':{ label: '微信公众号', color: '#16a34a', bg: '#f0fdf4' },
}

function detectPlatform(url) {
  for (const [domain, config] of Object.entries(PLATFORM_CONFIG)) {
    if (url.includes(domain)) return config
  }
  return { label: '网页', color: '#64748b', bg: '#f8fafc' }
}

function showStatus(type, msg) {
  const el = document.getElementById('status')
  el.className = 'status ' + type
  if (type === 'loading') {
    el.innerHTML = `<div class="spinner"></div><span>${msg}</span>`
  } else {
    el.textContent = msg
  }
}

async function getServerUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get('serverUrl', data => {
      resolve(data.serverUrl || 'http://localhost:3000')
    })
  })
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载保存的服务器地址
  const savedUrl = await getServerUrl()
  document.getElementById('serverUrl').value = savedUrl

  // 获取当前 Tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url || ''
  document.getElementById('currentUrl').textContent = url || '无效页面'

  // 显示平台徽章
  const platform = detectPlatform(url)
  const badge = document.getElementById('platformBadge')
  badge.innerHTML = `<span class="platform-badge" style="background:${platform.bg};color:${platform.color}">${platform.label}</span>`

  // 保存服务器地址
  document.getElementById('serverUrl').addEventListener('change', e => {
    chrome.storage.local.set({ serverUrl: e.target.value.trim() })
  })

  // 打开应用
  document.getElementById('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: savedUrl })
  })

  // 智能捕捉按钮
  document.getElementById('captureBtn').addEventListener('click', () => captureCurrentPage(url, tab))
})

async function captureCurrentPage(url, tab) {
  if (!url || url.startsWith('chrome://') || url.startsWith('about:')) {
    showStatus('error', '此页面不支持捕捉')
    return
  }

  const btn = document.getElementById('captureBtn')
  btn.disabled = true
  showStatus('loading', '正在捕捉页面内容...')

  try {
    const serverUrl = await getServerUrl()

    // 先尝试从页面提取内容
    let pageText = ''
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 提取页面主要文本
          const selectors = ['article', 'main', '.content', '#content', '.article-content', 'body']
          for (const sel of selectors) {
            const el = document.querySelector(sel)
            if (el) {
              const text = el.innerText?.slice(0, 3000) || ''
              if (text.length > 100) return text
            }
          }
          return document.body?.innerText?.slice(0, 2000) || ''
        }
      })
      pageText = results?.[0]?.result || ''
    } catch { /* 内容脚本提取失败，让服务端处理 */ }

    showStatus('loading', 'AI 分析整理中...')

    // 调用 MindNest 后端 API
    const res = await fetch(`${serverUrl}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, pageText }),
    })

    if (!res.ok) throw new Error('服务器错误 ' + res.status)
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // 保存到知识库（直接调用添加文档接口）
    await fetch(`${serverUrl}/api/capture`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title || tab.title || '捕捉内容',
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
    }).catch(() => {}) // 保存失败不阻断

    showStatus('success', `✓ 已捕捉：${data.title?.slice(0, 30) || '页面内容'}`)
    btn.textContent = '✓ 捕捉成功'

    // 浏览器通知
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'MindNest 捕捉成功',
      message: data.title || '页面已加入知识库',
    })

    setTimeout(() => {
      btn.disabled = false
      btn.textContent = '✨ 智能捕捉并分析'
    }, 3000)

  } catch (e) {
    showStatus('error', '捕捉失败：' + (e.message || '请检查 MindNest 是否运行'))
    btn.disabled = false
    btn.textContent = '✨ 智能捕捉并分析'
  }
}
