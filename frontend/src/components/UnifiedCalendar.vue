<template>
  <div class="calendar">
    <div class="calendar-header">
      <button class="nav-btn" @click="prevMonth">&lt;</button>
      <span class="month-title">{{ year }}年{{ month + 1 }}月</span>
      <button class="nav-btn" @click="nextMonth">&gt;</button>
    </div>

    <div class="weekdays">
      <span v-for="d in weekDays" :key="d">{{ d }}</span>
    </div>

    <div class="days-grid">
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        class="day-cell"
        :class="{
          'other-month': cell.isOtherMonth,
          'today': cell.isToday,
          'selected': cell.date === selectedDate,
          'all-done': cell.totalTasks > 0 && cell.completedTasks === cell.totalTasks,
          'partial-done': cell.totalTasks > 0 && cell.completedTasks > 0 && cell.completedTasks < cell.totalTasks,
          'has-tasks': cell.totalTasks > 0
        }"
        @click="cell.date && $emit('selectDate', cell.date)"
      >
        <span class="day-num" v-if="cell.date">{{ cell.dayNum }}</span>
        <div v-if="cell.totalTasks > 0" class="day-info">
          <div v-if="cell.date === selectedDate" class="task-progress">
            {{ cell.completedTasks }}/{{ cell.totalTasks }}
          </div>
          <div v-else class="task-count">
            {{ cell.totalTasks }}项
          </div>
          <div class="tag-dots">
            <span
              v-for="(tag, ti) in cell.tags.slice(0, 3)"
              :key="ti"
              class="tag-dot"
              :style="{ backgroundColor: tag.color }"
            ></span>
            <span v-if="cell.tags.length > 3" class="tag-more">+{{ cell.tags.length - 3 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarDaySummary, TagView } from '@/types'

const props = defineProps<{
  selectedDate: string
  year: number
  month: number
  dayData: CalendarDaySummary[]
}>()

const emit = defineEmits<{
  selectDate: [date: string]
  changeMonth: [year: number, month: number]
}>()

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

interface CalendarCell {
  date: string | null
  dayNum: number | null
  isOtherMonth: boolean
  isToday: boolean
  totalTasks: number
  completedTasks: number
  tags: TagView[]
}

const today = new Date().toISOString().split('T')[0]

const calendarCells = computed<CalendarCell[]>(() => {
  const year = props.year
  const month = props.month
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const dayMap = new Map<string, CalendarDaySummary>()
  props.dayData.forEach(d => dayMap.set(d.date, d))

  const cells: CalendarCell[] = []

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayInfo = dayMap.get(dateStr)
    cells.push({
      date: dateStr,
      dayNum: daysInPrevMonth - i,
      isOtherMonth: true,
      isToday: dateStr === today,
      totalTasks: dayInfo?.totalTasks || 0,
      completedTasks: dayInfo?.completedTasks || 0,
      tags: dayInfo?.tags || []
    })
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const dateStr = d.toISOString().split('T')[0]
    const dayInfo = dayMap.get(dateStr)
    cells.push({
      date: dateStr,
      dayNum: day,
      isOtherMonth: false,
      isToday: dateStr === today,
      totalTasks: dayInfo?.totalTasks || 0,
      completedTasks: dayInfo?.completedTasks || 0,
      tags: dayInfo?.tags || []
    })
  }

  // Next month padding
  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day)
    const dateStr = d.toISOString().split('T')[0]
    const dayInfo = dayMap.get(dateStr)
    cells.push({
      date: dateStr,
      dayNum: day,
      isOtherMonth: true,
      isToday: dateStr === today,
      totalTasks: dayInfo?.totalTasks || 0,
      completedTasks: dayInfo?.completedTasks || 0,
      tags: dayInfo?.tags || []
    })
  }

  return cells
})

function prevMonth() {
  let y = props.year, m = props.month - 1
  if (m < 0) { m = 11; y-- }
  emit('changeMonth', y, m)
}

function nextMonth() {
  let y = props.year, m = props.month + 1
  if (m > 11) { m = 0; y++ }
  emit('changeMonth', y, m)
}
</script>

<style scoped>
.calendar { width: 100%; }
.calendar-header {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin-bottom: 12px;
}
.month-title { font-size: 16px; font-weight: 600; }
.nav-btn { background: #f3f4f6; border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 16px; }
.weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr); text-align: center;
  font-size: 12px; color: #6B7280; margin-bottom: 4px;
}
.days-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
}
.day-cell {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; border-radius: 8px; cursor: pointer; position: relative;
  font-size: 13px; transition: background 0.15s; min-height: 56px;
}
.day-cell:hover { background: #f3f4f6; }
.day-cell.other-month .day-num { color: #d1d5db; }
.day-cell.today { border: 2px solid #4F46E5; }
.day-cell.selected { background: #EEF2FF; border: 2px solid #4F46E5; }
.day-cell.all-done { background: #ECFDF5; }
.day-cell.partial-done { background: #FFF7ED; }
.day-cell.has-tasks { font-weight: 500; }
.day-num { font-size: 13px; }
.day-info { display: flex; flex-direction: column; align-items: center; gap: 1px; margin-top: 2px; }
.task-progress { font-size: 11px; color: #4F46E5; font-weight: 600; }
.task-count { font-size: 11px; color: #6B7280; }
.tag-dots { display: flex; gap: 3px; align-items: center; margin-top: 1px; }
.tag-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.tag-more { font-size: 10px; color: #9CA3AF; }
</style>
