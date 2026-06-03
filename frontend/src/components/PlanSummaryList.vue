<template>
  <div class="plan-summary-list">
    <h3 class="list-title">学习计划概览</h3>
    <div v-if="plans.length === 0" class="empty-hint">暂无学习计划，点击"新建学习计划"开始</div>
    <div v-else class="plan-items">
      <div
        v-for="plan in plans"
        :key="plan._id"
        class="plan-item"
        @click="$emit('selectPlan', plan._id)"
      >
        <div class="plan-left">
          <div class="plan-topic">{{ plan.topic }}</div>
          <div class="plan-date">{{ plan.startDate }} ~ {{ plan.endDate }}</div>
          <div class="plan-tags">
            <TagChip v-for="tag in plan.tags" :key="tag.name" :name="tag.name" :color="tag.color" />
          </div>
        </div>
        <div class="plan-right">
          <div class="plan-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: progressPercent(plan) + '%' }"
              ></div>
            </div>
            <span class="progress-text">{{ plan.completedTasks }}/{{ plan.totalTasks }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlanSummary } from '@/types'
import TagChip from './TagChip.vue'

defineProps<{ plans: PlanSummary[] }>()
defineEmits<{ selectPlan: [planId: string] }>()

function progressPercent(plan: PlanSummary): number {
  if (plan.totalTasks === 0) return 0
  return Math.round((plan.completedTasks / plan.totalTasks) * 100)
}
</script>

<style scoped>
.plan-summary-list { padding: 12px 16px; border-top: 1px solid #e5e7eb; }
.list-title { margin: 0 0 8px; font-size: 14px; color: #374151; }
.empty-hint { color: #9CA3AF; font-size: 13px; text-align: center; padding: 12px; }
.plan-items { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.plan-item {
  flex: 0 0 auto; min-width: 200px; padding: 10px 12px;
  border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;
  transition: border-color 0.15s; display: flex; justify-content: space-between;
  align-items: center;
}
.plan-item:hover { border-color: #4F46E5; }
.plan-left { flex: 1; min-width: 0; }
.plan-topic { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plan-date { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
.plan-tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.plan-right { margin-left: 12px; }
.plan-progress { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.progress-bar { width: 60px; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #4F46E5; border-radius: 2px; transition: width 0.3s; }
.progress-text { font-size: 12px; color: #4F46E5; font-weight: 500; }
</style>
