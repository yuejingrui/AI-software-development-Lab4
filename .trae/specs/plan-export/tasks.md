# 计划导出任务拆分

## 阶段 1：导出核心工具

- [x] 创建 `frontend/src/services/export.ts`。
  - [x] 实现 `sanitizeFilename(name)` 移除文件名非法字符（`/ \ : * ? " < > |`）。
  - [x] 实现 `generateMarkdown(plan, tasks)` 生成单个计划 Markdown 文本。
    - 使用 `#` `##` `- [x]` `- [ ]` `>` 等标准语法。
  - [x] 实现 `generatePlainText(plan, tasks)` 生成单个计划 TXT 文本。
    - 使用 `===` 分隔标题，`---` 分隔段落，空格缩进表示层级。
  - [x] 实现 `saveFile(content, defaultName, mimeType)` 下载/保存文件。
    - 优先使用 `window.showSaveFilePicker()`，回退到 `<a download>`。
  - [x] 导出 `exportPlan(planId, format)` 整合：获取数据 -> 生成文本 -> 保存。
  - [x] 导出 `exportAllPlans(format)` 整合：获取所有计划 -> 合并文本 -> 保存。
    - 单个计划加载失败时跳过并记录，文件末尾附说明。

## 阶段 2：单个计划导出 UI

- [x] 在 `PlanDetailView.vue` 页面顶部增加「导出 下拉」下拉按钮。
  - [x] 下拉选项：`Markdown (.md)` / `纯文本 (.txt)`。
  - [x] 点击选项后调用 `exportPlan(planId, format)`。
  - [x] 导出中按钮显示 loading 状态。

## 阶段 3：全部计划导出 UI

- [x] 在 `HomeView.vue` 顶部栏增加「导出全部 下拉」下拉按钮。
  - [x] 仅在有活动计划时渲染该按钮。
  - [x] 下拉选项与阶段 2 一致。
  - [x] 点击选项后调用 `exportAllPlans(format)`。
  - [x] 导出中显示 loading 状态。

## 阶段 4：构建与部署

- [x] 构建前端（`npm run build`）。
- [x] 部署到 CloudBase 静态托管。
- [x] 按 checklist.md 逐项验收。

# 任务依赖

- 阶段 2 依赖阶段 1。
- 阶段 3 可与阶段 2 并行。
- 阶段 4 依赖阶段 2、3 完成。
