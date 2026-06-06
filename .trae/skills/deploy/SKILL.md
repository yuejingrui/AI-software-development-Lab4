---
name: "deploy"
description: "Generic deployment skill for full-stack web projects to any cloud environment. Invoke when user asks to deploy, publish, release, or update a project online."
---

# 部署 Skill（通用）

通用部署流程，适用于前端 + 云函数/后端分离的全栈项目。不绑定具体云平台，通过读取项目规则和 spec 自动适配当前环境。

## 何时调用

- 用户说"部署"、"发布"、"上线"、"更新线上"、"push to cloud"
- 构建产物需要推到远端
- 代码修改后需要让线上生效

## 部署前准备

### 1. 识别环境

首先读取项目的部署配置文档（通常位于以下位置之一）：

- `.trae/rules/deployment-guide.md` 或 `deployment.md`
- `README.md` 中的部署章节
- `package.json` 中的 `deploy` 或 `release` script

从配置中提取：环境标识（env ID / project ID）、区域、前端框架、后端类型、部署工具。

### 2. 确认当前变更范围

```
git status        # 哪些文件改了？
git diff --stat   # 变更量
```

判断需要部署的范围：

| 变更范围 | 部署步骤 |
|----------|----------|
| 仅 `frontend/` | 构建前端 + 上传静态资源 |
| 仅 `cloudfunctions/` 或后端 | 部署后端代码 |
| 两者都有 | 先部署后端，再构建部署前端 |

## 通用部署三步法

### Step 1: 构建前端

```bash
cd frontend && npm run build        # Node 项目
cd frontend && yarn build           # Yarn 项目
```

通用注意：
- 构建前确认 `node_modules` 已安装（否则先 `npm install`）
- CI/CD 场景设置 `NODE_ENV=production`
- 构建产物通常在 `dist/`、`build/`、`out/` 下

### Step 2: 部署后端/云函数

根据平台类型选择：

**CloudBase / 腾讯云 SCF**：用 MCP 工具或 CLI 更新函数代码。优先用 `updateFunctionCode`（函数已存在时），首次才用 `createFunction`。MCP 通常支持 `functionRootPath` 参数自动打包。

**Vercel / Netlify Functions**：函数随前端一起部署，放在 `api/` 或 `netlify/functions/` 目录，无需单独步骤。

**传统服务器 (SSH)**：`rsync` 或 `scp` 推送代码后 `ssh server "pm2 restart"`。

通用原则：
- 后端先部署（前端可能依赖新的 API）
- 部署后验证服务健康（GET `/health` 或等效端点）
- 查看日志确认没有启动错误

### Step 3: 上传前端静态资源

根据平台选择：

**CloudBase 静态托管**：优先用 MCP `manageHosting action=upload`，降级用 `tcb hosting deploy`。

**Vercel / Netlify**：`vercel --prod` 或 `netlify deploy --prod`。

**腾讯云 COS + CDN**：`coscmd upload` 或 SDK 上传后刷新 CDN。

**自建 Nginx**：`rsync dist/ user@host:/var/www/`。

通用原则：
- 上传后验证首页可访问（`curl` 检查 HTTP 200 + 预期内容）
- 带 `Cache-Control: no-cache` 头绕过 CDN 缓存
- 确认 JS/CSS 引用路径在上传后正确

## 部署后验证

```bash
# 验证首页
curl -s "https://<frontend-url>/" | head -5

# 验证后端健康
curl -s "https://<backend-url>/health"

# 验证关键 API
curl -s -X POST "https://<backend-url>" -H "Content-Type: application/json" -d '{"action":"listPlans"}'
```

## 常见陷阱（跨平台通用）

| 陷阱 | 表现 | 预防 |
|------|------|------|
| 构建缓存过时 | 线上看不到改动 | 删 `dist/` + `node_modules/.cache` 后重构建 |
| CDN 缓存旧版本 | 刷新后页面不变 | 用 `?v=` 参数或 CDN 刷新功能 |
| 环境变量未同步 | API 调用 5xx | 确认平台环境变量与代码中 `process.env.X` 一致 |
| 后端部署在前端之后 | 新前端调旧 API 报错 | 始终先部署后端 |
| 函数已存在却用创建接口 | 报 "already exists" | 先查询后决定用 update 还是 create |
| 工具降级时参数不一致 | 换工具后命令报错 | 遇到工具报错先读 help，不盲目换 |
| PowerShell 的 `&&` 不兼容 | Parser error | 用 `;` 或分步执行 |

## 需要环境特定的信息时

如果项目没有 `deployment-guide.md`，向用户确认：

1. 部署目标平台（CloudBase / Vercel / 自建服务器 / ...）
2. 环境 ID 或项目名称
3. 前端访问 URL
4. 后端访问 URL 或端点
5. 首选的部署工具（CLI / MCP / CI/CD）

## 当前项目默认值

以下从 `.trae/rules/deployment-guide.md` 提取，迁移时需更新：

- 平台：CloudBase（腾讯云）
- 前端构建：`cd frontend && npm run build`（Vue 3 + Vite 6）
- 后端部署：`mcporter call cloudbase.manageFunctions action=updateFunctionCode`
- 前端上传：`npx tcb hosting deploy frontend/dist -e <envId>`
- 云函数运行时：Nodejs18.15
