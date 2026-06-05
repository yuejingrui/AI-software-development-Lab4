<template>
  <div class="plan-summary-list">
    <h3 class="list-title">学习计划概览</h3>
    <div v-if="plans.length === 0" class="empty-state">
      <div class="empty-icon">📅</div>
      <p class="empty-title">还没有学习计划</p>
      <p class="empty-hint">点击右上角「+ 新建学习计划」开始吧</p>
    </div>
    <div v-else class="plan-items">
      <div
        v-for="plan in plans"
        :key="plan._id"
        class="plan-item"
        @click="$emit('selectPlan', plan._id)"
      >
        <button class="btn-delete-plan" @click.stop="$emit('deletePlan', plan._id, plan.topic)" title="删除计划">×</button>
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
defineEmits<{ selectPlan: [planId: string]; deletePlan: [planId: string, topic: string] }>()

function progressPercent(plan: PlanSummary): number {
  if (plan.totalTasks === 0) return 0
  return Math.round((plan.completedTasks / plan.totalTasks) * 100)
}
</script>

<style scoped>
.plan-summary-list { padding: 6px 10px; }
.list-title { margin: 0 0 4px; font-size: 12px; color: #374151; }
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px 10px 16px; text-align: center;
}
.empty-icon { font-size: 28px; margin-bottom: 6px; }
.empty-title { margin: 0; font-size: 13px; color: #374151; font-weight: 500; }
.empty-hint { margin: 4px 0 0; font-size: 12px; color: #9CA3AF; }
.plan-items {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  overflow-y: auto; max-height: 150px;
}
.plan-item {
  padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px;
  cursor: pointer; transition: border-color 0.15s; position: relative;
  display: flex; justify-content: space-between; align-items: center;
}
.plan-item:hover { border-color: #4F46E5; }
.plan-item:hover .btn-delete-plan { opacity: 1; }
.btn-delete-plan {
  position: absolute; top: 2px; right: 2px; opacity: 0;
  background: none; border: none; color: #EF4444; font-size: 14px;
  cursor: pointer; line-height: 1; padding: 1px 4px; border-radius: 3px;
  transition: opacity 0.15s;
}
.btn-delete-plan:hover { background: #FEE2E2; }
.plan-left { flex: 1; min-width: 0; }
.plan-topic { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plan-date { font-size: 9px; color: #9CA3AF; margin-top: 1px; }
.plan-tags { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; }
.plan-right { margin-left: 6px; }
.plan-progress { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.progress-bar { width: 40px; height: 3px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #4F46E5; border-radius: 2px; transition: width 0.3s; }
.progress-text { font-size: 10px; color: #4F46E5; font-weight: 500; }
</style>
