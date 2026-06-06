# 计划导出规格说明

## 补充说明

### Why：为什么需要这个功能
当前系统支持在线查看计划详情和每日任务，但用户离开系统后无法继续使用。如果用户需要打印学习日程贴在墙上、将计划分享给同学/老师、或存档为本地文件，当前没有任何方式获取可离线使用的学习资料。提供一个轻量的导出功能，让用户能将计划或日程导出为 Markdown 或 TXT 文件，并自行选择保存路径和文件名。

### What Changes：需要改变什么
- 新增"导出单个计划"功能，在计划详情页提供导出入口，用户可选择导出为 Markdown（`.md`）或纯文本（`.txt`），并选择保存路径。
- 新增"导出全部计划"入口（首页），将所有活动计划合并导出为一个文件，同样支持格式和路径选择。
- 导出内容包含：计划名称、日期范围、每日任务列表（含标题、描述、预计时长、完成状态）。
- 前端生成文本并触发下载，不涉及云函数改动。
- 利用已有 `getPlanDetail` API 获取单个计划数据，用 `listPlans` + `getPlanDetail` 批量获取全部计划任务。
- 优先使用 `window.showSaveFilePicker()` 让用户选择保存路径，不支持时回退到浏览器默认下载。

### Requirements：系统应该满足什么要求
- 系统 SHALL 在计划详情页提供「导出」按钮，点击后弹出格式选择（Markdown / TXT）。
- 系统 SHALL 在首页提供「导出全部计划」按钮，同样支持格式选择。
- 系统 SHALL 允许用户选择文件保存路径（优先使用 File System Access API，回退到浏览器下载）。
- 系统 SHALL 导出内容包含：计划名称、起止日期、每日任务标题、任务说明、预计时长、完成状态（✅/⬜）。
- 系统 SHALL 在 Markdown 格式中使用标准 Markdown 语法（标题、列表、引用块）。
- 系统 SHALL 在 TXT 格式中使用纯文本格式化（缩进、符号标记），确保在任意文本编辑器中可读。
- 系统 SHALL 处理空计划、无任务计划等边界情况，导出时应有友好提示而非报错。

### Scenarios：用户在什么情况下看到什么结果
- 当用户在计划详情页点击「导出」按钮时，先弹出格式选择（Markdown 或 TXT），确认后弹出系统保存对话框让用户选择保存路径和文件名，文件正确保存。
- 当用户在首页点击「导出全部计划」时，同样选择格式后弹出保存对话框。
- 当用户浏览器不支持 `showSaveFilePicker` 时，回退为浏览器默认下载行为，文件保存到浏览器默认下载目录。
- 当计划没有任何任务时，导出内容包含计划基本信息并注明"该计划暂无任务"。
- TXT 格式导出内容不包含 Markdown 标记符号（`#` `-` `>` 等），而是用空格缩进和线条分隔。

### Tasks：实现任务拆解
- 具体实现任务拆解保留在同目录下的 `tasks.md` 中。

### Checklist：验收检查项
- 具体验收检查项保留在同目录下的 `checklist.md` 中。

## 1. 项目概述

### 1.1 背景
`check.md` 要求"基础版本建议支持至少一种计划查看或导出方式，方便用户离开系统后继续使用"。当前系统缺乏任何导出能力。

### 1.2 目标
为学习计划工作台增加计划导出功能，支持：
1. 导出单个计划为 Markdown 或 TXT 格式
2. 导出全部计划为 Markdown 或 TXT 格式
3. 允许用户选择保存路径和文件名
4. 导出内容清晰可读，支持打印

### 1.3 设计原则
- 纯前端实现：复用已有 API 获取数据，前端生成文本并触发下载
- 零依赖：使用浏览器内置 `Blob` + `showSaveFilePicker` / `URL.createObjectURL` 实现下载
- 不修改云函数

## 2. 技术范围

### 2.1 涉及文件

| 文件 | 变更类型 |
|------|----------|
| `frontend/src/services/export.ts` | **新增**：Markdown/TXT 生成 + 下载逻辑 |
| `frontend/src/views/PlanDetailView.vue` | 修改：增加「导出」按钮（含格式选择） |
| `frontend/src/views/HomeView.vue` | 修改：增加「导出全部计划」按钮（含格式选择） |
| `frontend/src/types/` | 无变更（复用现有类型） |

### 2.2 UI 设计

**计划详情页**——在页面顶部操作区增加导出按钮：
```
[← 返回] [编辑计划] [导出 ▾]
                         ├ Markdown (.md)
                         └ 纯文本 (.txt)
```

**首页**——在顶部栏增加导出按钮：
```
[+ 新建学习计划]  [导出全部 ▾]
                           ├ Markdown (.md)
                           └ 纯文本 (.txt)
```

### 2.3 下载机制

优先使用 File System Access API：
```ts
async function saveFile(content: string, defaultName: string, mimeType: string) {
  if ("showSaveFilePicker" in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName: defaultName,
      types: [{ description: "文档", accept: { [mimeType]: [".md", ".txt"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    // Fallback: traditional download
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

## 3. 功能需求

### 3.1 导出单个计划

入口：计划详情页（`/plan/:planId`）

流程：
1. 用户点击「导出」→ 选择格式（.md 或 .txt）
2. 调用 `getPlanDetail(planId)` 获取计划 + 全部任务
3. 根据选中格式生成文本内容
4. 弹出系统保存对话框（默认文件名：`{计划名}.md` 或 `{计划名}.txt`）

Markdown 输出格式：
```markdown
# 学习计划：React 基础入门

- 日期：2026-06-01 ~ 2026-06-10
- 总天数：10 天  总任务数：10  已完成：3

---

## 2026-06-01（星期一）

- [x] 组件与 JSX 学习 — 60分钟 ✅
  > 阅读官方文档第 3 章，掌握 JSX 语法规则
- [ ] State 与 Props — 45分钟 ⬜
  > 通过编写计数器组件理解单向数据流
```

TXT 输出格式（纯文本，无 Markdown 标记）：
```
=== 学习计划：React 基础入门 ===

日期：2026-06-01 ~ 2026-06-10
总天数：10 天  总任务数：10  已完成：3

----------------------------------------

2026-06-01（星期一）
----------------------------------------
  [x] 组件与 JSX 学习 — 60分钟 ✅
      任务说明：阅读官方文档第 3 章，掌握 JSX 语法规则
  [ ] State 与 Props — 45分钟 ⬜
      任务说明：通过编写计数器组件理解单向数据流
```

### 3.2 导出全部计划

入口：首页顶部栏

流程：
1. 用户点击「导出全部」→ 选择格式
2. 调用 `listPlans()` 获取所有活动计划
3. 对每个计划调用 `getPlanDetail(planId)` 获取任务
4. 按格式合并生成一个文件
5. 弹出保存对话框（默认文件名：`全部学习计划_2026-06-05.md` 或 `.txt`）

### 3.3 边界处理

| 场景 | 行为 |
|------|------|
| 计划无任务 | 导出基本信息 + "该计划暂无学习任务" |
| 无任何计划 | 首页隐藏导出按钮 |
| 某计划加载失败 | 跳过失败计划，继续导出其他计划，文件末尾注明 |
| 浏览器不支持 showSaveFilePicker | 回退到 `<a download>` 传统下载方式 |
| 计划名含非法文件名字符 | 自动替换为下划线 `_` |

## 4. 验收标准

1. 计划详情页存在「导出」按钮，点击后可选 Markdown 或 TXT 格式。
2. 首页存在「导出全部计划」按钮，同样支持格式选择。
3. 支持 `showSaveFilePicker` 的浏览器弹出系统保存对话框，允许用户选择路径。
4. 不支持的浏览器回退为默认下载行为。
5. Markdown 导出内容包含标准 Markdown 语法，TXT 为纯文本格式。
6. 单个/全部计划导出文件均包含计划名、日期范围、每日任务、预计时长、完成状态。
7. 无计划时首页隐藏导出按钮，无任务时导出有友好提示。
