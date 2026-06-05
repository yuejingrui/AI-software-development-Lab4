<template>
  <div class="home">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <h1 class="app-title">学习计划工作台</h1>
      <button class="btn-new-plan" @click="showCreateDialog = true">+ 新建学习计划</button>
    </header>

    <!-- 主体区域 -->
    <div class="main-content">
      <!-- 左侧：每日任务详情 -->
      <aside class="left-panel">
        <DayTaskPanel
          :date="selectedDate"
          :tasks="currentDayTasks"
          :availableTags="dayTaskTagOptions"
          :selectedTag="dayTagFilter"
          :selectedStatus="dayStatusFilter"
          :togglingTaskId="togglingTaskId"
          @update:selectedTag="dayTagFilter = $event"
          @update:selectedStatus="dayStatusFilter = $event"
          @toggleTask="handleToggleTask"
        />
      </aside>

      <!-- 中间：统一日历 -->
      <main class="center-panel">
        <UnifiedCalendar
          :year="currentYear"
          :month="currentMonth"
          :selectedDate="selectedDate"
          :dayData="calendarDays"
          @selectDate="handleSelectDate"
          @changeMonth="handleChangeMonth"
        />
      </main>
    </div>

    <!-- 底部：计划概览 -->
    <footer class="bottom-panel">
      <PlanSummaryList
        :plans="planSummaries"
        @selectPlan="handleSelectPlan"
        @deletePlan="handleDeleteClick"
      />
    </footer>

    <!-- 新建计划对话框 -->
    <PlanCreateDialog
      :visible="showCreateDialog"
      :submitting="creatingPlan"
      @close="showCreateDialog = false"
      @submit="handleCreatePlan"
    />

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="confirm-overlay">
      <div class="confirm-dialog">
        <h3>确认删除</h3>
        <p>确定要删除计划「{{ deletingPlanTopic }}」吗？该计划下的所有任务和对话记录也将一并删除，此操作不可恢复。</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="showDeleteConfirm = false">取消</button>
          <button class="btn-confirm-delete" @click="handleDelete" :disabled="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast 消息 -->
    <div v-if="toast" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UnifiedCalendar from '@/components/UnifiedCalendar.vue'
import DayTaskPanel from '@/components/DayTaskPanel.vue'
import PlanSummaryList from '@/components/PlanSummaryList.vue'
import PlanCreateDialog from '@/components/PlanCreateDialog.vue'
import type { CreatePlanRequest, PlanSummary, DayTaskView, CalendarDaySummary } from '@/types'
import {
  createPlan, listPlans, getCalendarTasks,
  getTasksByDate, updateTaskStatus, deletePlan, cleanupOrphanTasks
} from '@/services/data'

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const router = useRouter()

const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
function showToast(message: string, type: 'success' | 'error') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

const showCreateDialog = ref(false)
const creatingPlan = ref(false)
const planSummaries = ref<PlanSummary[]>([])
const calendarDays = ref<CalendarDaySummary[]>([])
const currentDayTasks = ref<DayTaskView[]>([])
const selectedDate = ref(formatLocalDate(new Date()))
const togglingTaskId = ref<string | null>(null)
const dayTagFilter = ref('all')
const dayStatusFilter = ref<'all' | 'completed' | 'pending'>('all')
const showDeleteConfirm = ref(false)
const deletingPlanId = ref('')
const deletingPlanTopic = ref('')
const deleting = ref(false)

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth())

const dayTaskTagOptions = computed(() => {
  return Array.from(
    new Set(
      currentDayTasks.value.flatMap(task => task.tags.map(tag => tag.name))
    )
  ).sort((a, b) => a.localeCompare(b))
})

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end)
  }
}

async function loadAll() {
  try {
    planSummaries.value = await listPlans()
  } catch (e) {
    console.warn('加载计划列表失败:', e)
  }
  const range = getMonthRange(currentYear.value, currentMonth.value)
  try {
    const cal = await getCalendarTasks(range.start, range.end, selectedDate.value)
    calendarDays.value = cal.days
  } catch (e) {
    console.warn('加载日历失败:', e)
  }
}

async function loadDayTasks() {
  try {
    currentDayTasks.value = await getTasksByDate(selectedDate.value)
    if (dayTagFilter.value !== 'all' && !currentDayTasks.value.some(task => task.tags.some(tag => tag.name === dayTagFilter.value))) {
      dayTagFilter.value = 'all'
    }
  } catch (e) {
    console.warn('加载日任务失败:', e)
  }
}

async function handleSelectDate(date: string) {
  selectedDate.value = date
  await loadDayTasks()
  const range = getMonthRange(currentYear.value, currentMonth.value)
  try {
    const cal = await getCalendarTasks(range.start, range.end, selectedDate.value)
    calendarDays.value = cal.days
  } catch { /* ignore */ }
}

async function handleChangeMonth(year: number, month: number) {
  currentYear.value = year
  currentMonth.value = month
  const range = getMonthRange(year, month)
  try {
    const cal = await getCalendarTasks(range.start, range.end, selectedDate.value)
    calendarDays.value = cal.days
  } catch { /* ignore */ }
}

async function handleCreatePlan(data: CreatePlanRequest) {
  if (creatingPlan.value) return  // 防止重复提交
  creatingPlan.value = true
  try {
    const result = await createPlan(data)
    showCreateDialog.value = false
    showToast('学习计划创建成功！', 'success')
    await loadAll()
    router.push(`/plan/${result.planId}`)
  } catch (error) {
    showCreateDialog.value = false
    const raw = error instanceof Error ? error.message : '创建计划失败，请稍后重试'
    // 分类错误信息
    if (raw.includes('AI') || raw.includes('DeepSeek') || raw.includes('模型')) {
      showToast('创建失败：AI 生成功能不可用，请稍后重试', 'error')
    } else if (raw.includes('字段') || raw.includes('缺少') || raw.includes('非法') || raw.includes('无效') || raw.includes('不能')) {
      showToast(`创建失败：${raw}`, 'error')
    } else if (raw.includes('网络') || raw.includes('fetch') || raw.includes('连接')) {
      showToast('创建失败：网络连接异常，请检查网络后重试', 'error')
    } else {
      showToast(`创建失败：${raw}`, 'error')
    }
  } finally {
    creatingPlan.value = false
  }
}

async function handleToggleTask(taskId: string, completed: boolean) {
  togglingTaskId.value = taskId
  const previousTasks = [...currentDayTasks.value]

  currentDayTasks.value = currentDayTasks.value.map(t =>
    t.id === taskId ? { ...t, completed } : t
  )

  try {
    await updateTaskStatus(taskId, completed)
    await Promise.all([loadDayTasks(), (async () => {
      const range = getMonthRange(currentYear.value, currentMonth.value)
      const cal = await getCalendarTasks(range.start, range.end, selectedDate.value)
      calendarDays.value = cal.days
    })(), (async () => {
      planSummaries.value = await listPlans()
    })()])
  } catch {
    currentDayTasks.value = previousTasks
    showToast('更新失败，请重试', 'error')
  } finally {
    togglingTaskId.value = null
  }
}

function handleDeleteClick(planId: string, topic: string) {
  deletingPlanId.value = planId
  deletingPlanTopic.value = topic
  showDeleteConfirm.value = true
}

async function handleDelete() {
  deleting.value = true
  try {
    await deletePlan(deletingPlanId.value)
    showDeleteConfirm.value = false
    showToast('计划已删除', 'success')
    await loadAll()
    loadDayTasks()
  } catch {
    showToast('删除失败，请重试', 'error')
  } finally {
    deleting.value = false
  }
}

function handleSelectPlan(planId: string) {
  router.push(`/plan/${planId}`)
}

onMounted(async () => {
  // 静默清理孤儿任务
  cleanupOrphanTasks().catch(() => {})
  loadAll()
  loadDayTasks()
})
</script>

<style scoped>
.home {
  display: flex; flex-direction: column; height: 100vh;
  max-width: 1100px; margin: 0 auto; padding: 8px 12px; box-sizing: border-box;
}
.top-bar {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
}
.app-title { font-size: 17px; font-weight: 700; margin: 0; }
.btn-new-plan {
  padding: 5px 14px; background: #4F46E5; color: #fff; border: none;
  border-radius: 8px; font-size: 12px; cursor: pointer; transition: background 0.15s;
}
.btn-new-plan:hover { background: #4338CA; }
.main-content {
  display: flex; gap: 8px; flex: 1; min-height: 0;
}
.left-panel {
  width: 270px; min-width: 240px; border: 1px solid #e5e7eb;
  border-radius: 10px; overflow-y: auto; background: #fff;
}
.center-panel {
  flex: 1; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 6px; background: #fff; overflow: hidden;
}
.bottom-panel {
  margin-top: 6px; border: 1px solid #e5e7eb;
  border-radius: 10px; background: #fff; overflow-y: auto; flex-shrink: 0;
  min-height: 120px;
}
.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 8px; font-size: 14px; z-index: 2000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.3s;
}
.toast.success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
.toast.error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.confirm-dialog {
  background: #fff; border-radius: 12px; padding: 24px; width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.confirm-dialog h3 { margin: 0 0 12px; font-size: 16px; }
.confirm-dialog p { font-size: 14px; color: #6B7280; margin: 0 0 20px; line-height: 1.5; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-cancel { padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
.btn-confirm-delete { padding: 6px 16px; border: none; border-radius: 6px; background: #EF4444; color: #fff; cursor: pointer; font-size: 14px; }
.btn-confirm-delete:disabled { opacity: 0.6; cursor: not-allowed; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
