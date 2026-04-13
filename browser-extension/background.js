// MindNest 浏览器插件 - background.js (Service Worker)

// 监听键盘命令
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return

    // 发送消息给 content script 触发捕捉
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'triggerCapture' })
    } catch {
      // content script 未就绪，直接打开 popup
      chrome.action.openPopup?.()
    }
  }
})

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getServerUrl') {
    chrome.storage.local.get('serverUrl', (data) => {
      sendResponse({ serverUrl: data.serverUrl || 'http://localhost:3000' })
    })
    return true // 保持消息通道开启
  }

  if (message.action === 'captureComplete') {
    // 显示通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'MindNest 捕捉成功',
      message: message.title || '页面已加入知识库',
    })
  }

  if (message.action === 'captureError') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'MindNest 捕捉失败',
      message: message.error || '请检查 MindNest 是否运行',
    })
  }
})

// 安装时设置默认配置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('serverUrl', (data) => {
    if (!data.serverUrl) {
      chrome.storage.local.set({ serverUrl: 'http://localhost:3000' })
    }
  })
})
