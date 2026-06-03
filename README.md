# 学习计划工作台 (Study Plan Workbench)

基于 Vue 3 + CloudBase 的学习计划管理应用，支持 AI 驱动的学习任务生成与计划优化。

## 在线访问

- **前端应用**: [https://lab3-3-d5gdcm7qo10ced8af-1427379735.tcloudbaseapp.com/](https://lab3-3-d5gdcm7qo10ced8af-1427379735.tcloudbaseapp.com/)
- **CloudBase 环境 ID**: `lab3-3-d5gdcm7qo10ced8af`
- **区域**: `ap-shanghai`

> 注意：CDN 缓存可能需要几分钟才能反映最新部署。如看到旧版本，请在 URL 后添加随机查询参数（如 `?v=123`）强制刷新。

---

## 架构概览

```
┌─────────────────────────────┐     ┌──────────────────────────┐
│   Vue 3 前端 (SPA)           │     │  CloudBase 云函数          │
│   部署于静态托管              │────▶│  lab4-http (HTTP 函数)     │
│   @cloudbase/js-sdk          │     │  Node.js 18.15            │
│   匿名认证 + Bearer Token     │     │  @cloudbase/node-sdk      │
└─────────────────────────────┘     └──────────┬───────────────┘
         │                                      │
         │              ┌───────────────────────┤
         ▼              ▼                       ▼
   ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
   │ CloudBase    │  │ NoSQL 数据库      │  │ DeepSeek     │
   │ Auth (匿名)   │  │ study_plans      │  │ API (AI 模型) │
   │              │  │ study_tasks      │  │              │
   └──────────────┘  │ plan_chat_msgs   │  └──────────────┘
                     └──────────────────┘
```

## CloudBase 资源

| 资源 | 名称 | 说明 |
|------|------|------|
| HTTP 云函数 | `lab4-http` | AI 任务生成、计划优化、字段补全 |
| NoSQL 集合 | `study_plans` | 学习计划 |
| NoSQL 集合 | `study_tasks` | 学习任务 |
| NoSQL 集合 | `plan_chat_messages` | AI 对话记录 |
| 静态托管 | 前端 SPA | Vue 3 构建产物 |

## 项目结构

```
Lab4/
├── frontend/                    # Vue 3 前端项目
│   ├── src/
│   │   ├── views/               # 页面组件
│   │   │   ├── HomeView.vue     # 主页（日历 + 任务面板）
│   │   │   └── PlanDetailView.vue  # 计划详情页
│   │   ├── components/          # UI 组件
│   │   ├── services/
│   │   │   ├── cloudbase.ts     # CloudBase SDK 初始化 + HTTP 函数调用
│   │   │   └── data.ts          # 数据库操作层
│   │   ├── types/               # TypeScript 类型定义
│   │   └── router/              # Vue Router 配置
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── cloudfunctions/
│   └── lab4-http/               # HTTP 云函数
│       ├── index.js             # 函数代码（http.createServer）
│       ├── package.json
│       └── scf_bootstrap        # 启动脚本
└── config/
    └── mcporter.json            # CloudBase MCP 配置
```

## 云函数 API

### 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `POST` | `/generateTasks` | AI 生成学习任务 |
| `POST` | `/refinePlan` | AI 优化学习计划 |
| `POST` | `/suggestCompletion` | AI 补全计划字段 |

### 调用方式

**方式一：直接函数调用**
```
POST https://lab3-3-d5gdcm7qo10ced8af.api.tcloudbasegateway.com/v1/functions/lab4-http?webfn=true
Authorization: Bearer <CloudBase_Access_Token>
```

**方式二：网关路径**
```
POST https://lab3-3-d5gdcm7qo10ced8af.api.tcloudbasegateway.com/api/lab4-http
Authorization: Bearer <CloudBase_Access_Token>
```

前端通过 `@cloudbase/js-sdk` 匿名登录后获取 Access Token，自动携带 Bearer Token 调用函数。

### 请求示例

```bash
# 健康检查
curl "https://lab3-3-d5gdcm7qo10ced8af.api.tcloudbasegateway.com/api/lab4-http/health"

# AI 补全建议
curl -X POST "https://lab3-3-d5gdcm7qo10ced8af.api.tcloudbasegateway.com/api/lab4-http" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"suggestCompletion","topic":"机器学习","description":"","expectedOutcome":"","dailyMinutes":60}'
```

---

## 环境变量配置

### DEEPSEEK_API_KEY

API Key **不在代码中硬编码**，通过云函数环境变量配置。

#### 当前状态

环境变量 `DEEPSEEK_API_KEY` 已在云函数中配置。当前为占位值 `YOUR_DEEPSEEK_API_KEY_HERE`，需要替换为真实的 DeepSeek API Key。

#### 配置方法

**方法一：CloudBase 控制台（推荐）**

1. 打开 [CloudBase 控制台 - 云函数](https://tcb.cloud.tencent.com/dev?envId=lab3-3-d5gdcm7qo10ced8af#/scf)
2. 点击 `lab4-http` 进入函数详情
3. 点击「函数配置」→「环境变量」→「编辑」
4. 修改 `DEEPSEEK_API_KEY` 的值为你的 DeepSeek API Key
5. 保存并等待函数重新部署

**方法二：通过 MCP 工具更新**

```bash
cd <项目目录>
MSYS_NO_PATHCONV=1 npx mcporter call cloudbase.manageFunctions \
  action="updateFunctionConfig" \
  functionName="lab4-http" \
  envVariables='{"DEEPSEEK_API_KEY":"sk-your-actual-api-key"}' \
  --output json
```

**方法三：通过 tcb CLI**

```bash
tcb fn config update lab4-http --envVariables '{"DEEPSEEK_API_KEY":"sk-your-actual-api-key"}'
```

#### 获取 DeepSeek API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 进入「API Keys」页面创建新 Key
4. 复制 Key 并按上述方法配置

> 即使未配置 API Key，应用仍可正常运行——此时 AI 功能会降级为内置的模板化任务生成，不影响基本使用。

---

## 本地开发

### 环境要求

- Node.js >= 18
- npm >= 9

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认运行在 `http://localhost:5173`。

### 云函数本地测试

```bash
cd cloudfunctions/lab4-http
npm install
node index.js
# 服务监听在 http://localhost:9000

# 测试健康检查
curl http://localhost:9000/health

# 测试 AI 补全
curl -X POST http://localhost:9000/suggestCompletion \
  -H "Content-Type: application/json" \
  -d '{"topic":"机器学习","description":"","expectedOutcome":"","dailyMinutes":60}'
```

> 本地测试时需要设置环境变量 `DEEPSEEK_API_KEY` 才能使用 AI 功能：
> ```bash
> export DEEPSEEK_API_KEY="sk-your-api-key"  # Linux/macOS
> set DEEPSEEK_API_KEY=sk-your-api-key       # Windows CMD
> $env:DEEPSEEK_API_KEY="sk-your-api-key"    # Windows PowerShell
> ```

---

## 部署

### 部署云函数

```bash
cd <项目目录>
MSYS_NO_PATHCONV=1 npx mcporter call cloudbase.manageFunctions \
  action="createFunction" \
  func='{"name":"lab4-http","type":"HTTP","runtime":"Nodejs18.15","timeout":60}' \
  functionRootPath="d:/FuDan/生成式软件开发/Lab4/cloudfunctions" \
  --output json
```

若函数已存在，使用 `updateFunctionCode` 更新代码：

```bash
npx mcporter call cloudbase.manageFunctions \
  action="updateFunctionCode" \
  functionName="lab4-http" \
  functionRootPath="d:/FuDan/生成式软件开发/Lab4/cloudfunctions" \
  --output json
```

### 部署前端

```bash
cd frontend
npm run build

# 通过 MCP 上传到静态托管
cd ..
MSYS_NO_PATHCONV=1 npx mcporter call cloudbase.manageHosting \
  action="upload" \
  localPath="d:/FuDan/生成式软件开发/Lab4/frontend/dist" \
  cloudPath="/" \
  --output json
```

---

## 安全配置

### 函数安全规则

已配置为 `CUSTOM` 模式，规则为 `true`（允许所有调用方）。可通过以下方式查看和修改：

```bash
# 查看当前安全规则
npx mcporter call cloudbase.queryPermissions \
  action="getResourcePermission" \
  resourceType="function" \
  resourceId="lab4-http" \
  --output json

# 更新安全规则
npx mcporter call cloudbase.managePermissions \
  action="updateResourcePermission" \
  resourceType="function" \
  resourceId="lab4-http" \
  permission="CUSTOM" \
  securityRule='"true"' \
  --output json
```

### 前端认证

前端使用 CloudBase 匿名认证（`auth.signInAnonymously()`），无需用户注册即可使用。所有数据库操作通过 CloudBase 安全规则控制权限。

---

## 功能说明

### 学习计划创建

- 输入学习主题、日期范围、每日可用时间等
- AI 自动生成逐日学习任务（DeepSeek 模型）
- AI 不可用时自动降级为模板化任务生成

### 日历视图

- 月历展示每日任务概览
- 点击日期查看当天详细任务
- 任务完成状态实时切换

### AI 功能

| 功能 | 说明 | 依赖 |
|------|------|------|
| 自动生成任务 | 根据学习主题和参数 AI 生成逐日任务 | DeepSeek API |
| 计划优化 | AI 对话式优化已有学习计划 | DeepSeek API |
| 字段补全 | 自动补全描述、预期成果等字段 | 无需 API（本地规则） |

### 降级策略

当 DeepSeek API Key 未配置或 API 调用失败时：
- **任务生成**: 使用 5 种模板循环填充，确保计划始终可创建
- **计划优化**: 返回友好提示信息
- **字段补全**: 使用内置规则自动补全

---

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite + Vue Router
- **后端**: CloudBase HTTP 云函数 (Node.js 18)
- **数据库**: CloudBase NoSQL 文档数据库
- **认证**: CloudBase 匿名认证
- **AI**: DeepSeek Chat API
- **部署**: CloudBase 静态托管 + 云函数

## CloudBase 控制台入口

- [环境概览](https://tcb.cloud.tencent.com/dev?envId=lab3-3-d5gdcm7qo10ced8af#/overview)
- [云函数管理](https://tcb.cloud.tencent.com/dev?envId=lab3-3-d5gdcm7qo10ced8af#/scf)
- [数据库管理](https://tcb.cloud.tencent.com/dev?envId=lab3-3-d5gdcm7qo10ced8af#/db/doc)
- [静态托管](https://tcb.cloud.tencent.com/dev?envId=lab3-3-d5gdcm7qo10ced8af#/static-hosting)
