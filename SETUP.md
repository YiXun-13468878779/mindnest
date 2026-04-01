# MindNest 启动指南

## 第一步：安装依赖

打开终端，进入项目目录：

```bash
cd D:\mindnest
npm install
```

## 第二步：配置环境变量

复制环境变量模板：

```bash
copy .env.local.example .env.local
```

用记事本打开 `.env.local`，填入你的 API Key：

### 获取 Claude API Key（必填）

1. 打开 https://console.anthropic.com
2. 注册/登录账号
3. 点击 「API Keys」→「Create Key」
4. 复制 Key 填入 `ANTHROPIC_API_KEY=sk-ant-xxxxx`

### 获取 Supabase（可选，不填也能用本地模式）

1. 打开 https://supabase.com，免费注册
2. 创建新项目
3. 进入 Settings → API，复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 在 SQL Editor 中执行 `lib/supabase.ts` 里注释里的建表语句

## 第三步：启动开发服务器

```bash
npm run dev
```

打开浏览器访问：http://localhost:3000

## 不填 API Key 也能用！

- 所有页面和 UI 完全可用
- 宠物对话、AI 摘要等功能会返回占位提示
- 填入 API Key 后自动启用真实 AI 功能

## 功能说明

| 功能 | 需要 Claude Key | 需要 Supabase |
|------|:-:|:-:|
| 仪表盘、知识库浏览 | ❌ | ❌ |
| 新建/编辑文档 | ❌ | ❌ |
| 文件上传 | ❌ | ❌ |
| 宠物对话 | ✅ | ❌ |
| AI 摘要/翻译 | ✅ | ❌ |
| 研究助手 | ✅ | ❌ |
| 数据持久化（跨设备同步） | ❌ | ✅ |

## 部署到线上（Vercel）

1. 把代码推送到 GitHub
2. 打开 https://vercel.com，连接 GitHub 仓库
3. 在 Vercel 的 Environment Variables 中填入 .env.local 的变量
4. 点击 Deploy，几分钟后就有公开访问链接
