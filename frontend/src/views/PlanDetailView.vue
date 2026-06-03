<template>
  <div class="plan-detail">
    <!-- 顶部 -->
    <header class="detail-header">
      <div class="header-top">
        <button class="btn-back" @click="$router.push('/')">&larr; 返回工作台</button>
        <button class="btn-delete" @click="showDeleteConfirm = true">删除计划</button>
      </div>
      <div v-if="plan" class="plan-info">
        <h2>{{ plan.plan.topic }}</h2>
        <div class="plan-meta">
          <TagChip v-for="tag in plan.plan.tags" :key="tag.name" :name="tag.name" :color="tag.color" />
          <span class="date-range">{{ plan.plan.startDate }} ~ {{ plan.plan.endDate }}</span>
          <span class="status-badge">{{ statusText }}</span>
        </div>
        <div v-if="plan.plan.description" class="plan-desc">{{ plan.plan.description }}</div>
      </div>
    </header>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="confirm-overlay">
      <div class="confirm-dialog">
        <h3>确认删除</h3>
        <p>确定要删除计划「{{ plan?.plan.topic }}」吗？该计划下的所有任务和对话记录也将一并删除，此操作不可恢复。</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="showDeleteConfirm = false">取消</button>
          <button class="btn-confirm-delete" @click="handleDelete" :disabled="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" :class="['toast', toast.type]">{{ toast.message }}</div>

    <div v-if="!plan" class="loading">加载中...</div>
    <div v-else class="detail-body">
      <!-- 左侧：任务列表 -->
      <div class="tasks-section">
        <div class="section-header">
          <h3>学习任务 ({{ plan.tasks.length }})</h3>
          <span class="task-progress">{{ completedCount }}/{{ plan.tasks.length }} 已完成</span>
        </div>
        <div class="task-list">
          <div v-for="task in plan.tasks" :key="task._id" class="task-card">
            <div class="task-card-header">
              <input type="checkbox" :checked="task.completed" @change="handleToggle(task._id, !task.completed)" />
              <div class="task-card-info">
                <div v-if="editingTaskId === task._id" class="edit-form">
                  <input v-model="editForm.title" class="edit-input" placeholder="任务标题" />
                  <textarea v-model="editForm.description" class="edit-textarea" rows="2" placeholder="任务说明"></textarea>
                  <div class="edit-row">
                    <input v-model.number="editForm.estimatedMinutes" type="number" class="edit-input-sm" placeholder="时长(分钟)" />
                    <input v-model="editForm.date" type="date" class="edit-input-sm" />
                    <select v-model="editForm.priority" class="edit-select">
                      <option value="low">低优先级</option>
                      <option value="medium">中优先级</option>
                      <option value="high">高优先级</option>
                    </select>
                  </div>
                  <div class="edit-actions">
                    <button class="btn-sm-primary" @click="saveEdit">保存</button>
                    <button class="btn-sm-cancel" @click="cancelEdit">取消</button>
                  </div>
                </div>
                <template v-else>
                  <div class="task-card-title">{{ task.title }}</div>
                  <div class="task-card-meta">
                    <span>{{ task.date }}</span>
                    <span>{{ task.estimatedMinutes }}分钟</span>
                    <span :class="'priority-' + task.priority">{{ priorityLabel(task.priority) }}</span>
                  </div>
                  <div v-if="task.description" class="task-card-desc">{{ task.description }}</div>
                  <button class="btn-edit-inline" @click="startEdit(task)">编辑</button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：AI对话区 -->
      <div class="chat-section">
        <div class="section-header">
          <h3>AI 任务优化</h3>
        </div>
        <div class="chat-messages" ref="chatContainer">
          <div v-if="chatMessages.length === 0" class="chat-empty">
            向 AI 描述你想要的调整，例如"把周三任务减半"或"增加两天复习"
          </div>
          <div v-for="msg in chatMessages" :key="msg._id" :class="['chat-msg', msg.role]">
            <div class="chat-role">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
            <div class="chat-content">{{ msg.content }}</div>
          </div>
          <div v-if="chatLoading" class="chat-msg assistant">
            <div class="chat-role">AI</div>
            <div class="chat-content">思考中...</div>
          </div>
        </div>
        <div class="chat-input-area">
          <input
            v-model="chatInput"
            class="chat-input"
            placeholder="描述你想要的修改..."
            @keydown.enter="sendChatMessage"
            :disabled="chatLoading"
          />
          <button class="btn-send" @click="sendChatMessage" :disabled="chatLoading || !chatInput.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TagChip from '@/components/TagChip.vue'
import type { PlanDetail, PlanChatMessage } from '@/types'
import {
  getPlanDetail, updateTaskStatus, updateTaskInfo,
  refinePlan, saveChatMessage, deletePlan
} from '@/services/data'

const route = useRoute()
const router = useRouter()
const planId = computed(() => route.params.planId as string)

const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

const plan = ref<PlanDetail | null>(null)
const chatMessages = ref<PlanChatMessage[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const editingTaskId = ref<string | null>(null)
const editForm = ref({ title: '', description: '', estimatedMinutes: 90, date: '', priority: 'medium' })

const completedCount = computed(() => plan.value ? plan.value.tasks.filter((t: { completed: boolean }) => t.completed).length : 0)

const statusText = computed(() => {
  if (!plan.value) return ''
  if (completedCount.value === plan.value.tasks.length) return '已完成'
  if (completedCount.value > 0) return '进行中'
  return '未开始'
})

function priorityLabel(p: string): string {
  if (p === 'high') return '高'
  if (p === 'low') return '低'
  return '中'
}

async function loadPlan() {
  const detail = await getPlanDetail(planId.value)
  if (detail) {
    plan.value = detail
    chatMessages.value = detail.chatMessages
  }
}

async function handleToggle(taskId: string, completed: boolean) {
  await updateTaskStatus(taskId, completed)
  await loadPlan()
}

function startEdit(task: any) {
  editingTaskId.value = task._id
  editForm.value = {
    title: task.title,
    description: task.description,
    estimatedMinutes: task.estimatedMinutes,
    date: task.date,
    priority: task.priority
  }
}

async function saveEdit() {
  if (!editingTaskId.value) return
  try {
    await updateTaskInfo(editingTaskId.value, {
      title: editForm.value.title,
      description: editForm.value.description,
      estimatedMinutes: editForm.value.estimatedMinutes,
      date: editForm.value.date,
      priority: editForm.value.priority
    })
    editingTaskId.value = null
    await loadPlan()
  } catch {
    toast.value = { message: '保存失败，请重试', type: 'error' }
    setTimeout(() => { toast.value = null }, 3000)
  }
}

function cancelEdit() {
  editingTaskId.value = null
}

async function handleDelete() {
  deleting.value = true
  try {
    await deletePlan(planId.value)
    showDeleteConfirm.value = false
    router.push('/')
  } catch {
    toast.value = { message: '删除失败，请重试', type: 'error' }
    setTimeout(() => { toast.value = null }, 3000)
  } finally {
    deleting.value = false
  }
}

async function sendChatMessage() {
  const msg = chatInput.value.trim()
  if (!msg || chatLoading.value) return
  chatInput.value = ''
  chatLoading.value = true

  await saveChatMessage(planId.value, 'user', msg)

  try {
    const response = await refinePlan(planId.value, msg)
    await saveChatMessage(planId.value, 'assistant', response.reply)
  } catch {
    await saveChatMessage(planId.value, 'assistant', '抱歉，暂时无法处理你的请求，请稍后重试。')
  }

  chatLoading.value = false
  await loadPlan()

  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

watch(planId, () => {
  loadPlan()
})

onMounted(() => {
  loadPlan()
})
</script>

<style scoped>
.plan-detail {
  max-width: 1100px; margin: 0 auto; padding: 16px; height: 100vh;
  display: flex; flex-direction: column; box-sizing: border-box;
}
.detail-header { margin-bottom: 12px; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.btn-back {
  background: none; border: none; color: #4F46E5; cursor: pointer;
  font-size: 14px; padding: 4px 0;
}
.btn-delete {
  background: none; border: 1px solid #FCA5A5; color: #EF4444;
  padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.btn-delete:hover { background: #FEF2F2; }
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
.plan-info h2 { font-size: 20px; margin: 0 0 6px; }
.plan-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 4px; }
.date-range { font-size: 13px; color: #6B7280; }
.status-badge { font-size: 12px; padding: 1px 8px; border-radius: 4px; background: #EEF2FF; color: #4F46E5; }
.plan-desc { font-size: 13px; color: #6B7280; margin-top: 4px; }
.loading { text-align: center; padding: 40px; color: #9CA3AF; }
.detail-body { display: flex; gap: 16px; flex: 1; min-height: 0; }
.tasks-section { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; overflow-y: auto; background: #fff; }
.chat-section { width: 340px; min-width: 300px; border: 1px solid #e5e7eb; border-radius: 12px; display: flex; flex-direction: column; background: #fff; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
.section-header h3 { font-size: 14px; margin: 0; }
.task-progress { font-size: 12px; color: #6B7280; }
.task-list { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.task-card { padding: 10px; border-bottom: 1px solid #f3f4f6; }
.task-card-header { display: flex; gap: 10px; align-items: flex-start; }
.task-card-header input[type="checkbox"] { margin-top: 2px; }
.task-card-info { flex: 1; min-width: 0; }
.task-card-title { font-size: 14px; font-weight: 500; }
.task-card-meta { display: flex; gap: 8px; font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.priority-high { color: #EF4444; }
.priority-medium { color: #F59E0B; }
.priority-low { color: #6B7280; }
.task-card-desc { font-size: 12px; color: #6B7280; margin-top: 2px; }
.btn-edit-inline { background: none; border: none; color: #4F46E5; font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px; }
.edit-form { display: flex; flex-direction: column; gap: 4px; }
.edit-input, .edit-textarea, .edit-input-sm, .edit-select {
  width: 100%; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; font-family: inherit;
}
.edit-row { display: flex; gap: 6px; }
.edit-input-sm { flex: 1; }
.edit-select { flex: 1; }
.edit-actions { display: flex; gap: 6px; }
.btn-sm-primary { padding: 4px 12px; background: #4F46E5; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-sm-cancel { padding: 4px 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 12px; }
.chat-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.chat-empty { color: #9CA3AF; font-size: 13px; text-align: center; margin-top: 40px; }
.chat-msg { padding: 8px 10px; border-radius: 8px; font-size: 13px; max-width: 90%; }
.chat-msg.user { background: #EEF2FF; align-self: flex-end; }
.chat-msg.assistant { background: #f3f4f6; align-self: flex-start; }
.chat-role { font-size: 11px; font-weight: 600; color: #4F46E5; margin-bottom: 2px; }
.chat-msg.assistant .chat-role { color: #059669; }
.chat-input-area { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e5e7eb; }
.chat-input { flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: inherit; }
.btn-send { padding: 8px 14px; background: #4F46E5; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 8px; font-size: 14px; z-index: 2000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.3s;
}
.toast.success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
.toast.error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
