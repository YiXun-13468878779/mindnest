// Node.js 脚本：生成插件图标 PNG（使用纯 Buffer，无需 canvas 依赖）
// 运行：node create-icons.js
const fs = require('fs')
const path = require('path')

// 生成最小的 PNG 文件（蓝色圆角方块 + 白色 M 字母）
// 使用简单的 PNG 编码（不依赖外部库）

function createSimplePNG(size) {
  // 创建像素数据 RGBA
  const pixels = new Uint8Array(size * size * 4)
  const r = Math.round(size * 0.15) // 圆角半径

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const inRoundedRect = isInRoundedRect(x, y, size, size, r)

      if (inRoundedRect) {
        // 蓝色背景 #2563eb
        pixels[idx]   = 37   // R
        pixels[idx+1] = 99   // G
        pixels[idx+2] = 235  // B
        pixels[idx+3] = 255  // A

        // 绘制白色 "M" 字母（中心区域）
        const mx = x - size * 0.2
        const my = y - size * 0.2
        const mw = size * 0.6
        const mh = size * 0.6
        if (isInLetter(x, y, size)) {
          pixels[idx]   = 255
          pixels[idx+1] = 255
          pixels[idx+2] = 255
          pixels[idx+3] = 255
        }
      } else {
        // 透明
        pixels[idx+3] = 0
      }
    }
  }

  return encodePNG(size, size, pixels)
}

function isInRoundedRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false
  if (x >= r && x < w - r) return true
  if (y >= r && y < h - r) return true
  // 四个圆角
  const corners = [
    [r, r], [w - r - 1, r], [r, h - r - 1], [w - r - 1, h - r - 1]
  ]
  for (const [cx, cy] of corners) {
    if (Math.hypot(x - cx, y - cy) <= r) return true
  }
  return false
}

function isInLetter(x, y, size) {
  // 简单的 "N" 形状（MindNest 首字母）
  const pad = size * 0.25
  const thick = Math.max(2, Math.round(size * 0.12))
  const lx = pad, rx = size - pad - thick
  const ty = pad, by = size - pad

  // 左竖
  if (x >= lx && x < lx + thick && y >= ty && y <= by) return true
  // 右竖
  if (x >= rx && x < rx + thick && y >= ty && y <= by) return true
  // 对角线
  const progress = (y - ty) / (by - ty)
  const diagX = lx + thick + (rx - lx - thick) * progress
  if (x >= diagX - thick * 0.7 && x <= diagX + thick * 0.7 && y >= ty && y <= by) return true

  return false
}

// 最小 PNG 编码器
function encodePNG(width, height, rgba) {
  const { createHash, createDeflate } = require('crypto')
  const zlib = require('zlib')

  function crc32(buf) {
    let crc = 0xFFFFFFFF
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i]
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type)
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const crcData = Buffer.concat([typeBytes, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData))
    return Buffer.concat([len, typeBytes, data, crc])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Raw scanlines with filter byte
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0  // filter type None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * (1 + width * 4) + 1 + x * 4
      raw[dst]   = rgba[src]
      raw[dst+1] = rgba[src+1]
      raw[dst+2] = rgba[src+2]
      raw[dst+3] = rgba[src+3]
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 })

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir)

for (const size of [16, 48, 128]) {
  const png = createSimplePNG(size)
  const outPath = path.join(iconsDir, `icon${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`)
}

console.log('\n图标生成完成！')
