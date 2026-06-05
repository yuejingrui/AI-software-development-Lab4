<template>
  <div class="day-detail">
    <!-- 头部导航 -->
    <header class="detail-header">
      <button class="btn-back" @click="goBack">← 返回</button>
      <div class="date-nav">
        <button class="btn-nav" @click="goPrevDay">&lt;</button>
        <div class="date-info">
          <h2>{{ formattedDate }}</h2>
          <span class="duration-info" v-if="totalMinutes > 0">{{ totalHoursText }}</span>
        </div>
        <button class="btn-nav" @click="goNextDay">&gt;</button>
      </div>
      <button class="btn-today" @click="goToday">今天</button>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-hint">加载中...</div>

    <!-- 无任务 -->
    <div v-else-if="groupedTasks.length === 0" class="empty-hint">
      当天没有学习任务
    </div>

    <!-- 任务列表（按计划分组） -->
    <div v-else class="task-groups">
      <div v-for="group in groupedTasks" :key="group.planId" class="plan-group">
        <h3 class="plan-group-title" @click="router.push(`/plan/${group.planId}`)">
          {{ group.planTopic }}
        </h3>

        <div
          v-for="task in group.tasks"
          :key="task.id"
          class="task-card"
          :class="{ completed: task.completed }"
        >
          <div class="task-main">
            <input
              type="checkbox"
              :checked="task.completed"
              @change="handleToggleTask(task)"
              :disabled="togglingTaskId === task.id"
            />
            <div class="task-body">
              <div class="task-title-row">
                <span class="task-title" :class="{ strikethrough: task.completed }">
                  {{ task.title }}
                </span>
                <span
                  v-if="task.priority !== 'low'"
                  class="priority-badge"
                  :class="'priority-' + task.priority"
                >
                  {{ priorityLabel(task.priority) }}
                </span>
              </div>
              <div class="task-meta">
                <TagChip
                  v-for="tag in task.tags"
                  :key="tag.name"
                  :name="tag.name"
                  :color="tag.color"
                />
                <span class="task-duration">{{ task.estimatedMinutes }}分钟</span>
              </div>
              <div v-if="task.description" class="task-desc">{{ task.description }}</div>
            </div>
          </div>

          <!-- 子任务区域 -->
          <div class="subtask-section">
            <div class="subtask-header">
              <span class="subtask-label">
                子任务 ({{ getSubs(task).length }})
                <span v-if="subtaskProgress(task) !== null" class="subtask-progress">
                  {{ subtaskProgress(task) }}/{{ getSubs(task).length }} 完成
                </span>
              </span>
              <button
                class="btn-ai-split"
                :disabled="splittingTaskId === task.id"
                @click="handleAiSplit(task)"
              >
                {{ splittingTaskId === task.id ? '拆分中...' : 'AI拆分子任务' }}
              </button>
            </div>

            <!-- 子任务列表 -->
            <div v-if="getSubs(task).length > 0" class="subtask-list">
              <div
                v-for="sub in getSubs(task)"
                :key="sub._id"
                class="subtask-item"
                :class="{ completed: sub.completed }"
              >
                <input
                  type="checkbox"
                  :checked="sub.completed"
                  @change="handleToggleSubtask(task, sub)"
                />
                <template v-if="editingSubId === sub._id">
                  <input
                    v-model="editingSubTitle"
                    class="subtask-edit-input"
                    @keyup.enter="saveSubtaskEdit(task, sub)"
                    @keyup.escape="cancelSubtaskEdit"
                    @blur="saveSubtaskEdit(task, sub)"
                  />
                </template>
                <template v-else>
                  <span class="subtask-title" :class="{ strikethrough: sub.completed }">
                    {{ sub.title }}
                  </span>
                </template>
                <div class="subtask-actions">
                  <button
                    v-if="editingSubId !== sub._id"
                    class="btn-icon"
                    title="编辑"
                    @click="startSubtaskEdit(sub)"
                  >
                    ✎
                  </button>
                  <button
                    class="btn-icon btn-delete"
                    title="删除"
                    @click="handleDeleteSubtask(task, sub)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- 添加步骤输入框 -->
            <div class="add-subtask-row">
              <input
                v-model="newSubtaskTitles[task.id]"
                class="add-subtask-input"
                placeholder="+ 添加子任务"
                @keyup.enter="handleAddSubtask(task)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TagChip from '@/components/TagChip.vue'
import type { DayTaskView, SubTask } from '@/types'
import {
  getTasksByDate, updateTaskStatus,
  getSubtasks, generateSubtasks,
  createSubtask, updateSubtask, deleteSubtask, updateSubtaskStatus
} from '@/services/data'

const route = useRoute()
const router = useRouter()

// --------------- 状态 ---------------
const loading = ref(false)
const tasks = ref<DayTaskView[]>([])
const togglingTaskId = ref<string | null>(null)
const splittingTaskId = ref<string | null>(null)
const newSubtaskTitles = ref<Record<string, string>>({})
const editingSubId = ref<string | null>(null)
const editingSubTitle = ref('')

// --------------- 辅助 ---------------
function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseRouteDate(): string {
  const dateParam = route.params.date as string | undefined
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam
  }
  return formatLocalDate(new Date())
}

const currentDate = computed(() => parseRouteDate())

const formattedDate = computed(() => {
  const d = new Date(currentDate.value)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekDays[d.getDay()]}`
})

const totalMinutes = computed(() =>
  tasks.value.reduce((sum, t) => sum + t.estimatedMinutes, 0)
)

const totalHoursText = computed(() => {
  const m = totalMinutes.value
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r > 0 ? `共 ${h}小时${r}分钟` : `共 ${h}小时`
  }
  return `共 ${m}分钟`
})

function priorityLabel(p: string): string {
  if (p === 'high') return '高优先'
  if (p === 'medium') return '中优先'
  return ''
}

function getSubs(task: DayTaskView): SubTask[] {
  return task.subtasks || []
}

function subtaskProgress(task: DayTaskView): number | null {
  const subs = task.subtasks || []
  if (subs.length === 0) return null
  return subs.filter(s => s.completed).length
}

// 按 planId 分组
const groupedTasks = computed(() => {
  const map = new Map<string, { planId: string; planTopic: string; tasks: DayTaskView[] }>()
  for (const task of tasks.value) {
    if (!map.has(task.planId)) {
      map.set(task.planId, { planId: task.planId, planTopic: task.planTopic, tasks: [] })
    }
    map.get(task.planId)!.tasks.push(task)
  }
  return [...map.values()]
})

// --------------- 导航 ---------------
function goBack() {
  router.push('/')
}

function shiftDate(delta: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + delta)
  return formatLocalDate(d)
}

function goPrevDay() {
  router.push(`/day/${shiftDate(-1)}`)
}

function goNextDay() {
  router.push(`/day/${shiftDate(1)}`)
}

function goToday() {
  router.push(`/day/${formatLocalDate(new Date())}`)
}

// --------------- 数据加载 ---------------
async function loadData() {
  loading.value = true
  try {
    tasks.value = await getTasksByDate(currentDate.value)
  } catch {
    tasks.value = []
  } finally {
    loading.value = false
  }
}

async function loadSubtasksForTask(task: DayTaskView) {
  try {
    task.subtasks = await getSubtasks(task.id)
  } catch (e) {
    console.error('加载子任务失败:', e)
    task.subtasks = []
  }
}

// --------------- 任务操作 ---------------
async function handleToggleTask(task: DayTaskView) {
  const newVal = !task.completed
  togglingTaskId.value = task.id

  const previous = task.completed
  task.completed = newVal

  // 级联：父任务完成 → 所有子任务也完成
  if (newVal && task.subtasks && task.subtasks.length > 0) {
    const prevSubStates = task.subtasks.map(s => ({ id: s._id, completed: s.completed }))
    for (const sub of task.subtasks) {
      sub.completed = true
    }
    try {
      await Promise.all([
        updateTaskStatus(task.id, newVal),
        ...task.subtasks.map(sub => updateSubtaskStatus(sub._id, true))
      ])
    } catch {
      task.completed = previous
      for (const sub of task.subtasks) {
        const prev = prevSubStates.find(p => p.id === sub._id)
        if (prev) sub.completed = prev.completed
      }
    }
  } else {
    try {
      await updateTaskStatus(task.id, newVal)
    } catch {
      task.completed = previous
    }
  }

  togglingTaskId.value = null
}

// --------------- 子任务操作 ---------------
async function handleToggleSubtask(task: DayTaskView, sub: SubTask) {
  const newVal = !sub.completed
  const previous = sub.completed
  sub.completed = newVal

  try {
    await updateSubtaskStatus(sub._id, newVal)

    // 级联：所有子任务完成 → 父任务也完成
    const subs = task.subtasks || []
    if (newVal && subs.every(s => s.completed)) {
      task.completed = true
      await updateTaskStatus(task.id, true)
    }
    // 级联：若取消子任务且父任务已完成 → 取消父任务
    if (!newVal && task.completed) {
      task.completed = false
      await updateTaskStatus(task.id, false)
    }
  } catch {
    sub.completed = previous
  }
}

async function handleAiSplit(task: DayTaskView) {
  splittingTaskId.value = task.id
  try {
    task.subtasks = await generateSubtasks(task.id)
  } catch (e) {
    console.error('AI 拆分子任务失败:', e)
  } finally {
    splittingTaskId.value = null
  }
}

async function handleAddSubtask(task: DayTaskView) {
  const title = (newSubtaskTitles.value[task.id] || '').trim()
  if (!title) return
  newSubtaskTitles.value[task.id] = ''
  try {
    const sub = await createSubtask(task.id, task.planId, title)
    if (!task.subtasks) task.subtasks = []
    task.subtasks.push(sub)
  } catch (e) {
    console.error('添加子任务失败:', e)
  }
}

function startSubtaskEdit(sub: SubTask) {
  editingSubId.value = sub._id
  editingSubTitle.value = sub.title
  nextTick(() => {
    const inputs = document.querySelectorAll('.subtask-edit-input')
    const last = inputs[inputs.length - 1] as HTMLInputElement
    if (last) last.focus()
  })
}

function cancelSubtaskEdit() {
  editingSubId.value = null
  editingSubTitle.value = ''
}

async function saveSubtaskEdit(task: DayTaskView, sub: SubTask) {
  if (editingSubId.value !== sub._id) return
  const title = editingSubTitle.value.trim()
  editingSubId.value = null
  editingSubTitle.value = ''
  if (!title || title === sub.title) return

  const previous = sub.title
  sub.title = title
  try {
    await updateSubtask(sub._id, title)
  } catch {
    sub.title = previous
  }
}

async function handleDeleteSubtask(task: DayTaskView, sub: SubTask) {
  const subs = task.subtasks
  if (!subs) return
  const idx = subs.findIndex(s => s._id === sub._id)
  if (idx === -1) return
  const [removed] = subs.splice(idx, 1)
  try {
    await deleteSubtask(sub._id)
  } catch {
    subs.splice(idx, 0, removed)
  }
}

// --------------- 路由监听 ---------------
watch(currentDate, () => {
  loadData()
}, { immediate: true })

// 为每个 task 加载子任务（仅当 subtasks 为空时）
watch(tasks, async (newTasks) => {
  for (const task of newTasks) {
    if (!task.subtasks || task.subtasks.length === 0) {
      await loadSubtasksForTask(task)
    }
  }
}, { deep: false })
</script>

<style scoped>
.day-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

/* ---------- 头部 ---------- */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.btn-back, .btn-today {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
  transition: background 0.15s;
}
.btn-back:hover, .btn-today:hover {
  background: #f3f4f6;
}
.date-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-nav {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  transition: background 0.15s;
}
.btn-nav:hover {
  background: #f3f4f6;
}
.date-info {
  text-align: center;
}
.date-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.duration-info {
  font-size: 12px;
  color: #6B7280;
}

/* ---------- 提示 ---------- */
.loading-hint, .empty-hint {
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
  margin-top: 40px;
}

/* ---------- 计划分组 ---------- */
.task-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.plan-group-title {
  font-size: 15px;
  font-weight: 600;
  color: #4F46E5;
  margin: 0 0 10px;
  cursor: pointer;
}
.plan-group-title:hover {
  text-decoration: underline;
}

/* ---------- 任务卡片 ---------- */
.task-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  transition: opacity 0.2s;
}
.task-card.completed {
  opacity: 0.6;
  background: #f9fafb;
}
.task-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.task-main input[type="checkbox"] {
  margin-top: 3px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}
.task-body {
  flex: 1;
  min-width: 0;
}
.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.task-title {
  font-size: 15px;
  font-weight: 600;
}
.task-title.strikethrough {
  text-decoration: line-through;
  color: #9CA3AF;
}
.priority-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.priority-high {
  background: #FEE2E2;
  color: #991B1B;
}
.priority-medium {
  background: #FEF3C7;
  color: #92400E;
}
.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}
.task-duration {
  font-size: 11px;
  color: #9CA3AF;
}
.task-desc {
  font-size: 12px;
  color: #6B7280;
  margin-top: 6px;
  line-height: 1.5;
}

/* ---------- 子任务区域 ---------- */
.subtask-section {
  margin-top: 10px;
  padding-left: 24px;
  border-left: 2px solid #e5e7eb;
}
.subtask-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.subtask-label {
  font-size: 12px;
  color: #6B7280;
}
.subtask-progress {
  color: #4F46E5;
  font-weight: 500;
}
.btn-ai-split {
  padding: 3px 10px;
  border: 1px solid #4F46E5;
  border-radius: 4px;
  background: #EEF2FF;
  color: #4F46E5;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-ai-split:hover:not(:disabled) {
  background: #E0E7FF;
}
.btn-ai-split:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 子任务列表 */
.subtask-list {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.subtask-item.completed {
  opacity: 0.65;
}
.subtask-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}
.subtask-title {
  flex: 1;
  font-size: 13px;
  word-break: break-word;
}
.subtask-title.strikethrough {
  text-decoration: line-through;
  color: #9CA3AF;
}
.subtask-edit-input {
  flex: 1;
  padding: 3px 8px;
  border: 1px solid #4F46E5;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.subtask-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.btn-icon {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #6B7280;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-icon:hover {
  background: #f3f4f6;
  color: #374151;
}
.btn-delete:hover {
  color: #EF4444;
}

/* 添加步骤 */
.add-subtask-row {
  margin-top: 6px;
}
.add-subtask-input {
  width: 100%;
  padding: 5px 10px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  background: transparent;
  box-sizing: border-box;
}
.add-subtask-input:focus {
  border-color: #4F46E5;
  border-style: solid;
}

/* ---------- 响应式 ---------- */
@media (max-width: 600px) {
  .day-detail {
    padding: 10px 8px;
  }
  .detail-header {
    flex-wrap: wrap;
  }
  .subtask-section {
    padding-left: 14px;
  }
}
</style>
