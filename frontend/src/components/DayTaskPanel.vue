<template>
  <div class="day-panel">
    <div class="panel-header">
      <h3>{{ formattedDate || '选择日期' }}</h3>
      <div v-if="tasks.length > 0" class="task-summary">
        {{ completedCount }}/{{ tasks.length }} 已完成
      </div>
    </div>

    <div v-if="!date" class="empty-hint">请点击日历中的日期查看任务详情</div>
    <div v-else-if="tasks.length === 0" class="empty-hint">当天没有学习任务</div>
    <div v-else class="task-list">
      <div
        v-for="task in sortedTasks"
        :key="task.id"
        class="task-item"
        :class="{ completed: task.completed }"
      >
        <div class="task-header">
          <input
            type="checkbox"
            :checked="task.completed"
            @change="$emit('toggleTask', task.id, !task.completed)"
            :disabled="togglingTaskId === task.id"
          />
          <div class="task-body">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <span class="plan-topic">{{ task.planTopic }}</span>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DayTaskView } from '@/types'
import TagChip from './TagChip.vue'

const props = defineProps<{
  date: string | null
  tasks: DayTaskView[]
  togglingTaskId?: string | null
}>()

const emit = defineEmits<{
  toggleTask: [taskId: string, completed: boolean]
}>()

const formattedDate = computed(() => {
  if (!props.date) return ''
  const d = new Date(props.date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const completedCount = computed(() => props.tasks.filter(t => t.completed).length)

const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.planTopic.localeCompare(b.planTopic)
  })
})
</script>

<style scoped>
.day-panel { padding: 10px 8px; height: 100%; display: flex; flex-direction: column; }
.panel-header { margin-bottom: 6px; }
.panel-header h3 { margin: 0 0 2px; font-size: 14px; }
.task-summary { font-size: 11px; color: #6B7280; }
.empty-hint { color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px; }
.task-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
.task-item { padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb; }
.task-item.completed { opacity: 0.65; background: #f9fafb; }
.task-header { display: flex; gap: 8px; align-items: flex-start; }
.task-header input[type="checkbox"] { margin-top: 2px; width: 14px; height: 14px; cursor: pointer; }
.task-body { flex: 1; min-width: 0; }
.task-title { font-size: 13px; font-weight: 500; word-break: break-word; }
.task-meta { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; margin-top: 3px; }
.plan-topic { font-size: 10px; color: #4F46E5; background: #EEF2FF; padding: 1px 5px; border-radius: 3px; }
.task-duration { font-size: 10px; color: #9CA3AF; }
.task-desc { font-size: 11px; color: #6B7280; margin-top: 3px; }
</style>
