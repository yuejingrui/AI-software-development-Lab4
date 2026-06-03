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
          :togglingTaskId="togglingTaskId"
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
      />
    </footer>

    <!-- 新建计划对话框 -->
    <PlanCreateDialog
      :visible="showCreateDialog"
      @close="showCreateDialog = false"
      @submit="handleCreatePlan"
    />

    <!-- Toast 消息 -->
    <div v-if="toast" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UnifiedCalendar from '@/components/UnifiedCalendar.vue'
import DayTaskPanel from '@/components/DayTaskPanel.vue'
import PlanSummaryList from '@/components/PlanSummaryList.vue'
import PlanCreateDialog from '@/components/PlanCreateDialog.vue'
import type { CreatePlanRequest, PlanSummary, DayTaskView, CalendarDaySummary } from '@/types'
import {
  createPlan, listPlans, getCalendarTasks,
  getTasksByDate, updateTaskStatus
} from '@/services/data'

const router = useRouter()

const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
function showToast(message: string, type: 'success' | 'error') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

const showCreateDialog = ref(false)
const planSummaries = ref<PlanSummary[]>([])
const calendarDays = ref<CalendarDaySummary[]>([])
const currentDayTasks = ref<DayTaskView[]>([])
const selectedDate = ref(new Date().toISOString().split('T')[0])
const togglingTaskId = ref<string | null>(null)

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth())

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
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
  try {
    const result = await createPlan(data)
    showCreateDialog.value = false
    showToast('学习计划创建成功！', 'success')
    await loadAll()
    router.push(`/plan/${result.planId}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建计划失败，请稍后重试'
    showToast(message, 'error')
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

function handleSelectPlan(planId: string) {
  router.push(`/plan/${planId}`)
}

onMounted(() => {
  loadAll()
  loadDayTasks()
})
</script>

<style scoped>
.home {
  display: flex; flex-direction: column; height: 100vh;
  max-width: 1200px; margin: 0 auto; padding: 16px; box-sizing: border-box;
}
.top-bar {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.app-title { font-size: 20px; font-weight: 700; margin: 0; }
.btn-new-plan {
  padding: 8px 20px; background: #4F46E5; color: #fff; border: none;
  border-radius: 8px; font-size: 14px; cursor: pointer; transition: background 0.15s;
}
.btn-new-plan:hover { background: #4338CA; }
.main-content {
  display: flex; gap: 16px; flex: 1; min-height: 0;
}
.left-panel {
  width: 300px; min-width: 260px; border: 1px solid #e5e7eb;
  border-radius: 12px; overflow-y: auto; background: #fff;
}
.center-panel {
  flex: 1; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 16px; background: #fff; overflow-y: auto;
}
.bottom-panel {
  margin-top: 12px; border: 1px solid #e5e7eb;
  border-radius: 12px; background: #fff;
}
.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 8px; font-size: 14px; z-index: 2000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.3s;
}
.toast.success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
.toast.error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
