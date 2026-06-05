# 统一日历增强任务拆分

## 阶段 1：日历组件视觉增强

- [ ] 修改 `UnifiedCalendar.vue` 样式，增加完成状态视觉区分。
  - 新增 CSS class `all-done`：浅绿色背景（`#ECFDF5`）+ 绿色边框（`#A7F3D0`）。
  - 新增 CSS class `partial-done`：浅橙色背景（`#FFF7ED`）+ 橙色边框（`#FED7AA`）。
  - 确保当前选中日期（selectedDate）的蓝色边框优先级高于完成状态颜色。
- [ ] 修改 `UnifiedCalendar.vue`，"今天"日期（实际当前日期 = `new Date()`）特殊显示。
  - 新增 CSS class `today`：蓝色加粗数字或其他醒目标识，与 selectedDate 的高亮边框区分。
  - 若 `today` 同时是 `selectedDate`，则以 selectedDate 样式优先。
- [ ] 日期格展示内容保持现有逻辑（仅有任务数量 + 标签色块，不增加时长）。

## 阶段 2：空状态引导

- [ ] 修改 `PlanSummaryList.vue`，在计划概览列表区域添加条件渲染的空状态引导组件。
  - 判断条件：`planSummaries.length === 0` 且非加载中。
  - 展示引导图标 + 文案：「还没有学习计划，点击右上角「+ 新建学习计划」开始吧」。
  - 创建计划后自动消失（数据刷新后 `planSummaries.length > 0`）。
- [ ] 注意：引导提示位于页面底部的计划概览列表区域，不在日历区域。

## 阶段 3：全局统计面板

- [ ] 修改 `HomeView.vue` 或 `PlanSummaryList.vue`，新增全局统计面板。
  - 计算 4 项统计指标：总计划数、总学习天数、总学习时长（小时）、全局完成率。
  - 在日历区域与底部计划列表之间放置统计面板。
  - 统计面板使用简洁的横向排列（4 个指标卡片）。
  - 数据来源：从 `listPlans` 返回的 `PlanSummary[]` 和日历数据中计算。
- [ ] 确保切换月份或刷新数据后，统计面板数据同步更新。

## 阶段 4：部署与验收

- [ ] 构建前端并部署到 CloudBase 静态托管。
- [ ] 按 checklist.md 逐项验收。

# 任务依赖

- 阶段 2 和阶段 3 可并行，无依赖关系。
- 阶段 4 依赖前面所有阶段完成。
