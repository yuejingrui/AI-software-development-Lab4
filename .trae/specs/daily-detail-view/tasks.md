# 每日详情页任务拆分

## 阶段 1：路由与基础页面

- [ ] 在 `router/index.ts` 中新增 `/day/:date` 路由，参数校验（`YYYY-MM-DD` 格式）。
  - 格式不符时重定向到首页。
- [ ] 创建 `DayDetailView.vue` 页面组件骨架。
  - 基础布局：头部（日期 + 总时长 + 返回按钮 + 前后日期导航）、任务列表区、空状态区。
  - 从 `route.params.date` 读取日期参数。

## 阶段 2：数据获取与展示

- [ ] 在 `DayDetailView.vue` 中调用 `getTasksByDate(date)` 获取当天任务。
  - 添加 loading 状态和错误处理。
- [ ] 实现前端任务分组逻辑（`groupTasksByPlan`）。
- [ ] 渲染任务列表：按计划分组展示。
  - 每个分组标题：计划名称（可点击进入 `plan/:planId`）。
  - 每个任务卡片：checkbox、优先级标签、标题、标签色块（TagChip）、说明、预计时长。
- [ ] 展示当天总学习时长（所有任务 `estimatedMinutes` 求和）。
- [ ] 实现空状态展示（当天无任务时的友好提示）。

## 阶段 3：完成状态交互

- [ ] 为每个任务实现 checkbox 勾选交互。
  - 乐观更新：点击后立即切换 UI 状态。
  - 调用 `updateTaskStatus` API 持久化。
  - 成功：任务标题添加删除线 + 颜色变淡样式（`class="completed"`）。
  - 失败：checkbox 回滚 + 显示 toast 错误提示。
- [ ] 实现取消勾选（逻辑同勾选）。
- [ ] 勾选/取消后更新页面头部总时长旁的完成统计。

## 阶段 4：日期导航

- [ ] 实现前一天/后一天导航按钮。
  - 计算相邻日期（使用 `Date` 对象 ±1 天）。
  - 点击后 `router.push` 到新日期路由。
- [ ] 可选增强：在无任务日期时仍可导航。

## 阶段 5：首页入口改造

- [ ] 修改 `HomeView.vue` 或 `DayTaskPanel.vue`：点击有任务日期时跳转 `/day/:date`。
  - 推荐：在 `DayTaskPanel` 顶部添加「查看完整详情 →」链接。
  - 或：在日历组件中点击日期直接跳转。
- [ ] `DayTaskPanel` 中的任务点击新增跳转到 `/plan/:planId`。

## 阶段 6：子任务数据层

- [ ] 新增 `SubTask` TypeScript 接口到 `types/task.ts`。
  - 字段：`_id`、`taskId`、`planId`、`title`、`completed`、`source`（`'user'`\|`'ai'`）、`sortOrder`、`createdAt`、`updatedAt`。
- [ ] 云函数新增 `generateSubtasks` API。
  - 接收 `taskId`，查询父任务信息。
  - 调用 `callDeepSeek` 生成 3-5 个实施步骤。
  - **关键**：若已有 `source='ai'` 的旧子任务，先删除它们；保留所有 `source='user'` 的子任务。
  - 新子任务以 `source='ai'` 写入 `study_subtasks`。
- [ ] 云函数新增 `createSubtask` API。
  - 接收 `taskId`、`planId`、`title`。
  - 以 `source='user'` 写入 `study_subtasks`，`sortOrder` 自动递增。
- [ ] 云函数新增 `updateSubtask` API。
  - 接收 `subtaskId`、`title`，更新子任务标题。
- [ ] 云函数新增 `deleteSubtask` API。
  - 接收 `subtaskId`，删除子任务记录。
- [ ] 云函数新增 `updateSubtaskStatus` API。
  - 接收 `subtaskId`、`completed`，更新子任务完成状态。
- [ ] 云函数修改 `getTasksByDate`，每个任务附带其 `subtasks` 列表。
- [ ] 在 `data.ts` 中新增前端调用函数：
  - `generateSubtasks(taskId)`、`createSubtask(taskId, planId, title)`
  - `updateSubtask(subtaskId, title)`、`deleteSubtask(subtaskId)`
  - `updateSubtaskStatus(subtaskId, completed)`

## 阶段 7：子任务前端交互

- [ ] 在 `DayDetailView.vue` 任务卡片下方渲染子任务列表（缩进展示）。
  - 每个子任务：checkbox + 标题（已完成时删除线 + 颜色变淡）+ 编辑按钮 + 删除按钮。
  - 显示子任务完成进度（如「已完成 2/3 步」）。
- [ ] 实现「AI 拆分步骤」按钮。
  - 无子任务时显示「AI 拆分步骤」，已有子任务时显示「重新拆分」。
  - 点击后 loading 状态，防止重复点击。
- [ ] 实现手动创建子任务：子任务列表末尾「+ 添加步骤」输入框。
  - 输入标题后回车 → 调用 `createSubtask` → 即时显示在列表中。
  - 空标题时不提交。
- [ ] 实现修改子任务标题：点击编辑按钮 → 标题变为输入框 → 回车或失焦保存。
  - 调用 `updateSubtask` → 即时更新显示。
- [ ] 实现删除子任务：点击删除按钮 → 调用 `deleteSubtask` → 即时移除。
- [ ] 实现子任务 checkbox 勾选交互。
  - 乐观更新 + 调用 `updateSubtaskStatus` API。
  - 成功/失败处理同父任务。
- [ ] 实现级联完成规则。
  - 子任务全完成 → 父任务自动完成。
  - 父任务完成 → 所有子任务自动完成。
  - 取消父任务完成 → 子任务保持当前状态。
- [ ] 处理 AI 拆分失败：显示 toast 提示，可重试。

## 阶段 8：部署与验收

- [ ] 构建前端并部署到 CloudBase 静态托管。
- [ ] 更新云函数代码。
- [ ] 按 checklist.md 逐项验收。

# 任务依赖

- 阶段 2 依赖阶段 1（需要路由和页面骨架先存在）。
- 阶段 3 和阶段 4 可并行。
- 阶段 5 可与阶段 2-4 并行。
- 阶段 7 依赖阶段 6（需要数据层先就绪）。
- 阶段 8 依赖前面所有阶段完成。
