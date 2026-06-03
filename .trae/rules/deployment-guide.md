# CloudBase 部署指南（Lab4 学习计划工作台）

## 环境信息

| 项目 | 值 |
|------|-----|
| 环境ID | `lab3-3-d5gdcm7qo10ced8af` |
| 区域 | `ap-shanghai` |
| 前端框架 | Vue 3 + Vite 6 + TypeScript |
| 云函数名 | `lab4-http` |
| 云函数类型 | HTTP（监听 9000 端口） |
| 云函数运行时 | Nodejs18.15 |
| 前端访问地址 | `https://lab3-3-d5gdcm7qo10ced8af-1427379735.tcloudbaseapp.com/` |

## 部署前检查清单

```bash
# 1. 确认 MCP 已连接且已登录
mcporter list

# 2. 确认环境绑定正确
mcporter call cloudbase.auth action=status --output json

# 3. 确认云函数状态（是否已存在、类型、运行时）
mcporter call cloudbase.queryFunctions action=listFunctions --output json
mcporter call cloudbase.queryFunctions action=getFunctionDetail functionName=lab4-http --output json
```

## 部署流程

### 步骤 1：构建前端

```powershell
cd frontend
npm run build
```

### 步骤 2：更新云函数代码（lab4-http 已存在，用 updateFunctionCode）

**关键**：不要用 `createFunction`！`lab4-http` 是已存在的 HTTP 函数，只需更新代码。

```bash
# Git Bash / MSYS2 环境（Claude Code 默认）
cd "/d/FuDan/生成式软件开发/Lab4" && \
MSYS_NO_PATHCONV=1 npx mcporter call cloudbase.manageFunctions \
  action="updateFunctionCode" \
  functionName="lab4-http" \
  functionRootPath="d:/FuDan/生成式软件开发/Lab4/cloudfunctions" \
  --output json 2>&1
```

```powershell
# PowerShell 环境（当前终端）
mcporter call cloudbase.manageFunctions action=updateFunctionCode functionName=lab4-http functionRootPath=cloudfunctions --output json
```

**验签**：
```bash
mcporter call cloudbase.queryFunctions action=getFunctionDetail functionName=lab4-http --output json | grep -E '"Status"|"CodeResult"|"ModTime"'
# 期望：Status=Active, CodeResult=success, ModTime=刚刚更新的时间
```

### 步骤 3：部署前端到静态托管

```bash
# Git Bash / MSYS2
cd "/d/FuDan/生成式软件开发/Lab4" && \
MSYS_NO_PATHCONV=1 npx mcporter call cloudbase.manageHosting \
  action="upload" \
  localPath="d:/FuDan/生成式软件开发/Lab4/frontend/dist" \
  cloudPath="/" \
  --output json 2>&1
```

```powershell
# PowerShell
mcporter call cloudbase.manageHosting action=upload localPath=frontend/dist cloudPath=/ --output json
```

**验签**：
```bash
curl -s "https://lab3-3-d5gdcm7qo10ced8af-1427379735.tcloudbaseapp.com/?v=$(date +%s)" | head -5
# 期望：返回最新 index.html，包含正确的 JS/CSS 文件引用
```

## 常见错误 & 避免方法

### 错误 1：用 `createFunction` 而非 `updateFunctionCode`

**症状**：报 `func.name 参数是必需的` 或 `function already exists`

**原因**：`lab4-http` 已存在，应该更新代码而非新建

**正确做法**：部署前先 `queryFunctions action=listFunctions` 确认函数是否存在。已存在 → `updateFunctionCode`；不存在 → `createFunction`

### 错误 2：手动打包 zip 再传

**症状**：反复 `Compress-Archive` 生成 zip，但 `createFunction` 一直报参数错误

**原因**：`updateFunctionCode` 支持 `functionRootPath` 参数直接指定源码目录，MCP 会自动处理打包

**正确做法**：直接用 `functionRootPath=cloudfunctions`（注意这是云函数根目录，工具会自动找到对应名称的子目录）

### 错误 3：切到 `tcb` CLI 试错

**症状**：mcporter 报错后直接跑 `npx tcb fn deploy`，然后遇到 `--env-id` vs `-envId`、`--dir` vs `--path` 等一系列参数差异

**正确做法**：mcporter 报错时，先检查：
- action 参数是否正确（`createFunction` vs `updateFunctionCode`）
- 参数名是否正确（用 `mcporter describe cloudbase --all-parameters` 查看完整 schema）
- 不要轻易换工具，先确认当前工具的正确用法

### 错误 4：不知道 `manageHosting` 工具存在

**正确做法**：静态托管部署不用 `tcb hosting deploy` 也不用其他工具，用 MCP 的 `manageHosting action=upload`

## 数据库相关

### 数据模型（CloudBase 文档数据库）

| 集合名 | 说明 |
|--------|------|
| `study_plans` | 学习计划文档 |
| `study_tasks` | 学习任务文档 |
| `plan_chat_messages` | AI 对话消息 |

### 数据访问方式

当前架构：**前端 → HTTP 云函数 `lab4-http` → CloudBase SDK → 文档数据库**

- 前端不直连数据库（避免 publishableKey/403 等问题）
- 云函数内通过 `@cloudbase/node-sdk` 的 `app.database()` 访问数据库
- DEEPSEEK_API_KEY 从云函数环境变量 `process.env.DEEPSEEK_API_KEY` 读取

## AI 配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| DEEPSEEK_API_KEY | CloudBase 云函数环境变量 | 在 CloudBase 控制台 → 云函数 → lab4-http → 环境变量 中配置 |
| 调用模型 | `deepseek-chat`（index.js 中写死） | 也可改为 `deepseek-v4-flash` |

## 快速排查命令

```bash
# 查看云函数日志（排查运行时错误）
mcporter call cloudbase.queryFunctions action=listFunctionLogs functionName=lab4-http limit=20 --output json

# 查看静态托管文件列表
mcporter call cloudbase.queryHosting action=listFiles --output json

# 查看匿名登录是否已启用
mcporter call cloudbase.queryAppAuth action=getLoginConfig --output json
# 期望：loginMethods.anonymous = true
```

## 目录结构

```
Lab4/
├── frontend/                # Vue 3 前端
│   ├── src/
│   │   ├── components/      # Vue 组件
│   │   ├── services/        # cloudbase.ts（SDK初始化）+ data.ts（数据服务层）
│   │   ├── types/           # TypeScript 类型定义
│   │   ├── views/           # 页面组件
│   │   └── router/          # 路由（hash 模式）
│   ├── dist/                # 构建产物（部署到静态托管）
│   └── package.json
├── cloudfunctions/
│   └── lab4-http/           # HTTP 云函数
│       ├── index.js         # 主入口（http.createServer）
│       ├── package.json
│       └── scf_bootstrap    # 启动脚本
└── .trae/
    └── specs/               # 规格文档
```
