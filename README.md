# 学习计划工作台 (Study Plan Workbench)

基于 Vue 3 + CloudBase 的学习计划管理应用，支持 AI 驱动的学习任务生成、子任务拆分、统一日历展示、计划导出。

## 在线访问

- **前端应用**: [https://lab3-3-d5gdcm7qo10ced8af-1427379735.tcloudbaseapp.com/](https://lab3-3-d5gdcm7qo10ced8af-1427379735.tcloudbaseapp.com/)
- **CloudBase 环境 ID**: `lab3-3-d5gdcm7qo10ced8af`
- **区域**: `ap-shanghai`

---

## 功能

### 学习计划管理
- 创建/编辑/删除学习计划（主题、日期范围、每日时长、用户身份、扩展字段）
- 10 种预设用户画像 + 自定义身份
- **用户身份必填**：未选择或"其他"为空时拒绝提交
- AI 自动补全非必要字段 + AI 生成逐日学习任务
- 多计划共存，互不干扰

### 统一日历
- 按月聚合展示所有计划的每日任务
- 日期格状态：全部完成（绿）/ 部分完成（橙）/ 无任务（白）
- 今日日期高亮，选中日期蓝色边框
- 标签色块展示（去重，最多 8 个）
- 全局统计面板：总计划数 / 总学习天数 / 总时长 / 完成率

### 每日任务详情
- 路由：`/day/YYYY-MM-DD`，前一天/后一天导航
- 任务按计划分组展示，每组标题可点击跳转到计划详情
- 完成状态 checkbox，乐观更新 + 持久化
- 按标签和完成状态筛选

### 子任务（实施步骤）
- **AI 拆分子任务**：DeepSeek 生成 3-5 个可逐个执行的子任务
- **手动创建/编辑/删除**：用户可在 AI 子任务基础上补充
- 用户子任务 (`source: user`) 与 AI 子任务 (`source: ai`) 共存
- **重新拆分**：仅覆盖 AI 子任务，保留用户手动创建的
- 级联规则：子任务全完成 → 父任务自动完成
- 子任务集合缺失时自动创建，查询异常时降级为空

### 计划导出
- **单个计划导出**：计划详情页 → 导出按钮 → 选择 Markdown 或 TXT
- **全部计划导出**：首页 → 导出全部按钮 → 合并所有计划为单一文件
- 支持 `showSaveFilePicker` 选择保存路径，不支持时降级为浏览器下载
- 导出内容含计划名称、日期、任务标题/描述/时长/完成状态

### 计划详情页
- 路由：`/plan/:planId`，编辑计划基本信息 + 标签
- 任务列表，支持按标签和完成状态筛选
- AI 对话优化：在计划详情页与 AI 对话获得任务调整建议

---

## 架构

```
┌──────────────────────────┐     ┌────────────────────────────┐
│  Vue 3 前端 (SPA)         │     │  CloudBase HTTP 云函数       │
│  Vite 6 + TypeScript     │────▶│  lab4-http (Node.js 18.15)  │
│  Vue Router (Hash 模式)   │     │  @cloudbase/node-sdk        │
│  @cloudbase/js-sdk        │     │  20 个 POST action          │
└──────────────────────────┘     └────────────┬───────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                       ┌──────────┐   ┌──────────┐   ┌──────────┐
                       │ study_   │   │ study_   │   │ plan_chat│
                       │ plans    │   │ tasks    │   │ _messages│
                       └──────────┘   └──────────┘   └──────────┘
                              ▲
                       ┌──────────┐
                       │ study_   │
                       │ subtasks │
                       └──────────┘
```

---

## 目录结构

```
Lab4/
├── frontend/                    # Vue 3 前端
│   ├── src/
│   │   ├── views/               # 页面
│   │   │   ├── HomeView.vue         # 首页（日历 + 任务面板 + 统计）
│   │   │   ├── PlanDetailView.vue   # 计划详情
│   │   │   └── DayDetailView.vue    # 每日详情
│   │   ├── components/          # UI 组件
│   │   │   ├── UnifiedCalendar.vue  # 统一日历
│   │   │   ├── DayTaskPanel.vue     # 左侧任务预览
│   │   │   ├── PlanSummaryList.vue  # 计划概览列表
│   │   │   ├── PlanCreateDialog.vue # 计划创建弹窗
│   │   │   └── TagChip.vue         # 标签色块
│   │   ├── services/
│   │   │   ├── cloudbase.ts     # CloudBase SDK 初始化
│   │   │   ├── data.ts          # API 层（20 个云函数 action）
│   │   │   └── export.ts        # 计划导出（Markdown/TXT）
│   │   ├── types/
│   │   │   ├── plan.ts          # StudyPlan / PlanSummary / TagView
│   │   │   └── task.ts          # StudyTask / DayTaskView / SubTask
│   │   └── router/index.ts      # 路由（Hash 模式）
│   └── package.json
├── cloudfunctions/
│   └── lab4-http/               # HTTP 云函数
│       ├── index.js             # 20 个 action handler
│       ├── package.json
│       └── scf_bootstrap
├── tests/                       # 自动化测试（node:test，零依赖）
│   ├── src/
│   │   ├── api.js               # HTTP API 客户端
│   │   ├── utils.js             # 断言 / 数据工厂 / 清理
│   │   ├── runner.js            # 测试入口
│   │   └── specs/               # 5 个 spec，114 项测试
│   ├── README.md
│   └── package.json
├── .trae/
│   ├── specs/                   # 5 套规格文档
│   ├── skills/
│   │   ├── deploy/SKILL.md      # 通用部署 Skill
│   │   └── git_commit/SKILL.md  # Git 提交 Skill
│   └── rules/
│       └── deployment-guide.md  # CloudBase 部署指南
└── README.md
```

---

## 云函数 API

全部通过 HTTP POST 调用，`body.action` 指定具体操作：

| action | 说明 |
|--------|------|
| `createPlan` | 创建学习计划 + AI 生成任务 |
| `listPlans` | 列出全部计划摘要 |
| `getPlanDetail` | 获取计划详情（含任务和聊天） |
| `updatePlan` | 编辑计划基本信息 |
| `deletePlan` | 删除计划及其关联任务 |
| `getCalendarTasks` | 获取月历数据（日期聚合） |
| `getTasksByDate` | 获取某天全部任务 |
| `updateTaskStatus` | 更新任务完成状态 |
| `updateTaskInfo` | 编辑任务标题/描述/时长 |
| `generateTasks` | AI 重新生成任务 |
| `generateSubtasks` | AI 拆分子任务 |
| `createSubtask` | 手动创建子任务 |
| `updateSubtask` | 编辑子任务标题 |
| `deleteSubtask` | 删除子任务 |
| `updateSubtaskStatus` | 更新子任务完成状态 |
| `getSubtasks` | 查询任务的子任务列表 |
| `refinePlan` | AI 对话优化计划 |
| `saveChatMessage` | 保存 AI 对话消息 |
| `cleanupOrphanTasks` | 清理孤儿任务 |
| `GET /health` | 健康检查 |

---

## 自动化测试

```bash
cd tests
node --test src/specs/require-user-identity.test.js  # 6 项
node --test src/specs/study-plan-workbench.test.js   # 27 项
node --test src/specs/unified-calendar-enhance.test.js # 12 项
node --test src/specs/daily-detail-view.test.js      # 38 项
node --test src/specs/plan-export.test.js            # 31 项

# 运行全部 114 项
node --test --test-reporter=spec src/specs/require-user-identity.test.js src/specs/study-plan-workbench.test.js src/specs/unified-calendar-enhance.test.js src/specs/daily-detail-view.test.js src/specs/plan-export.test.js
```

零外部依赖，仅需 Node.js >= 18.15。测试自动创建所需计划并在结束后清理。

---

## 本地开发

### 环境要求

- Node.js >= 18
- npm >= 9

### 启动前端

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

### 云函数本地测试

```bash
cd cloudfunctions/lab4-http
npm install
node index.js     # http://localhost:9000

# 测试
curl http://localhost:9000/health
```

> 本地测试 AI 功能需设置环境变量：`$env:DEEPSEEK_API_KEY="sk-your-key"` (PowerShell)

---

## 部署

详见 `.trae/rules/deployment-guide.md` 或 `.trae/skills/deploy/SKILL.md`。简要流程：

```powershell
# 1. 构建前端
cd frontend ; npm run build

# 2. 更新云函数
mcporter call cloudbase.manageFunctions action=updateFunctionCode functionName=lab4-http functionRootPath="d:/FuDan/生成式软件开发/Lab4/cloudfunctions" --output json

# 3. 部署前端
npx tcb hosting deploy frontend/dist -e lab3-3-d5gdcm7qo10ced8af
```

---

## 数据库

| 集合 | 说明 |
|------|------|
| `study_plans` | 学习计划 |
| `study_tasks` | 学习任务 |
| `study_subtasks` | 子任务（实施步骤） |
| `plan_chat_messages` | AI 对话记录 |

前端不直连数据库，全部通过 HTTP 云函数访问。

---

## AI 配置

| 配置项 | 位置 |
|--------|------|
| DEEPSEEK_API_KEY | CloudBase 控制台 → 云函数 → lab4-http → 环境变量 |
| 模型 | `deepseek-chat` |

API Key 未配置时，AI 功能自动降级为模板化任务生成。

---

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite 6 + Vue Router
- **后端**: CloudBase HTTP 云函数 (Node.js 18.15)
- **数据库**: CloudBase NoSQL 文档数据库
- **认证**: CloudBase 匿名认证
- **AI**: DeepSeek Chat API
- **测试**: Node.js 原生 `node:test` + `node:assert`
- **部署**: CloudBase 静态托管 + 云函数
