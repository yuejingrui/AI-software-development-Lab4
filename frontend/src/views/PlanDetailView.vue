<template>
  <div class="plan-detail">
    <!-- 顶部 -->
    <header class="detail-header">
      <div class="header-top">
        <button class="btn-back" @click="$router.push('/')">&larr; 返回工作台</button>
        <div class="header-actions">
          <button v-if="!editingPlan" class="btn-edit" @click="startEditPlan">编辑计划</button>
          <button class="btn-delete" @click="showDeleteConfirm = true">删除计划</button>
        </div>
      </div>

      <!-- 计划信息展示模式 -->
      <div v-if="plan && !editingPlan" class="plan-info">
        <h2>{{ plan.plan.topic }}</h2>
        <div class="plan-meta">
          <TagChip v-for="tag in plan.plan.tags" :key="tag.name" :name="tag.name" :color="tag.color" />
          <span class="date-range">{{ plan.plan.startDate }} ~ {{ plan.plan.endDate }}</span>
          <span class="status-badge">{{ statusText }}</span>
        </div>

        <!-- 全部字段展示 -->
        <div class="plan-fields">
          <div v-if="plan.plan.description" class="plan-field">
            <span class="field-label">描述</span>
            <span class="field-value">{{ plan.plan.description }}</span>
          </div>

          <div class="plan-field-row">
            <div class="plan-field">
              <span class="field-label">每日时长</span>
              <span class="field-value">{{ plan.plan.dailyMinutes || '未设置' }} 分钟</span>
            </div>
            <div class="plan-field">
              <span class="field-label">计划天数</span>
              <span class="field-value">{{ plan.plan.durationDays }} 天</span>
            </div>
          </div>

          <div v-if="plan.plan.references && plan.plan.references.length > 0" class="plan-field">
            <span class="field-label">参考资料与平台</span>
            <span class="field-value">{{ plan.plan.references.join('、') }}</span>
          </div>

          <div class="plan-field">
            <span class="field-label">用户身份</span>
            <span class="field-value">
              {{ plan.plan.userProfile.type }}
              <template v-if="plan.plan.userProfile.type === '其他' && plan.plan.userProfile.customText">
                ({{ plan.plan.userProfile.customText }})
              </template>
            </span>
          </div>

          <div v-if="plan.plan.expectedOutcome" class="plan-field">
            <span class="field-label">预期成果</span>
            <span class="field-value">{{ plan.plan.expectedOutcome }}</span>
          </div>

          <div v-if="plan.plan.notes" class="plan-field">
            <span class="field-label">备注</span>
            <span class="field-value">{{ plan.plan.notes }}</span>
          </div>
        </div>
      </div>

      <!-- 计划信息编辑模式 -->
      <div v-if="plan && editingPlan" class="plan-edit-form">
        <h3>编辑计划信息</h3>

        <div class="form-group">
          <label class="required">目标 / 学习内容</label>
          <input v-model="editPlanForm.topic" maxlength="100" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="required">开始日期</label>
            <input type="date" v-model="editPlanForm.startDate" />
          </div>
          <div class="form-group">
            <label class="required">结束日期</label>
            <input type="date" v-model="editPlanForm.endDate" />
          </div>
        </div>

        <div class="form-group">
          <label>每日可用时长（分钟）<span class="optional">选填</span></label>
          <input type="number" v-model.number="editPlanForm.dailyMinutes" min="1" />
        </div>

        <div class="form-group">
          <label>描述 / 补充说明<span class="optional">选填</span></label>
          <textarea v-model="editPlanForm.description" maxlength="500" rows="2"></textarea>
          <span class="char-count">{{ editPlanForm.description.length }}/500</span>
        </div>

        <div class="form-group">
          <label>参考资料与平台<span class="optional">选填</span></label>
          <input v-model="editPlanForm.referencesStr" placeholder="例如：B站 + 官方文档 + LeetCode" />
        </div>

        <div class="form-group">
          <label class="required">用户身份</label>
          <div class="profile-options">
            <label
              v-for="preset in profilePresets"
              :key="preset"
              class="radio-label"
            >
              <input type="radio" v-model="editPlanForm.userProfileType" :value="preset" />
              {{ preset }}
            </label>
          </div>
          <input
            v-if="editPlanForm.userProfileType === '其他'"
            v-model="editPlanForm.userProfileCustom"
            class="custom-profile-input"
            placeholder="请填写，10字以下"
            maxlength="10"
          />
        </div>

        <div class="form-group">
          <label>预期学习成果 / 程度<span class="optional">选填</span></label>
          <input v-model="editPlanForm.expectedOutcome" maxlength="200" />
        </div>

        <div class="form-group">
          <label>主题标签<span class="optional">选填，10字以内</span></label>
          <div class="tags-input-area">
            <div v-for="(tag, idx) in editPlanForm.tags" :key="idx" class="tag-item">
              <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
              <span>{{ tag.name }}</span>
              <button class="tag-remove" @click="removeEditTag(idx)">&times;</button>
            </div>
            <input
              v-if="editPlanForm.tags.length < 5"
              v-model="editTagInput"
              class="tag-input-inline"
              placeholder="输入标签后回车"
              maxlength="10"
              @keydown.enter.prevent="addEditTag"
            />
          </div>
        </div>

        <div class="form-group">
          <label>备注<span class="optional">选填</span></label>
          <textarea v-model="editPlanForm.notes" maxlength="500" rows="2"></textarea>
        </div>

        <div v-if="editPlanError" class="error-msg">{{ editPlanError }}</div>

        <div class="edit-plan-actions">
          <button class="btn-cancel" @click="cancelEditPlan">取消</button>
          <button class="btn-primary" @click="saveEditPlan" :disabled="savingPlan">
            {{ savingPlan ? '保存中...' : '保存修改' }}
          </button>
        </div>
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
          <h3>学习任务 ({{ filteredTasks.length }}/{{ plan.tasks.length }})</h3>
          <span class="task-progress">{{ completedCount }}/{{ plan.tasks.length }} 已完成</span>
        </div>
        <div class="task-filters">
          <select v-model="detailTagFilter" class="filter-select">
            <option value="all">全部标签</option>
            <option v-for="tag in detailTagOptions" :key="tag" :value="tag">{{ tag }}</option>
          </select>
          <select v-model="detailStatusFilter" class="filter-select">
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="pending">未完成</option>
          </select>
          <span class="filter-hint">同名且标签相同的任务按整体完成度筛选</span>
        </div>
        <div class="task-list">
          <div v-for="task in filteredTasks" :key="task._id" class="task-card">
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
                  <div class="task-card-title-row">
                    <div class="task-card-title">{{ task.title }}</div>
                    <span v-if="task.taskNumber" class="task-number">{{ task.taskNumber }}</span>
                  </div>
                  <div class="task-card-meta">
                    <span>{{ task.date }}</span>
                    <span>{{ task.estimatedMinutes }}分钟</span>
                    <span :class="'priority-' + task.priority">{{ priorityLabel(task.priority) }}</span>
                  </div>
                  <div class="task-card-tags">
                    <TagChip v-for="tag in task.tags" :key="tag.name" :name="tag.name" :color="tag.color" />
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
import { ref, watch, onMounted, nextTick, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TagChip from '@/components/TagChip.vue'
import { USER_PROFILE_PRESETS } from '@/types'
import type { PlanDetail, PlanChatMessage, TagView, UserProfile, UpdatePlanRequest } from '@/types'
import {
  getPlanDetail, updateTaskStatus, updateTaskInfo,
  refinePlan, saveChatMessage, deletePlan, updatePlan,
  getTagColor
} from '@/services/data'

const route = useRoute()
const router = useRouter()
const planId = computed(() => route.params.planId as string)
const profilePresets = USER_PROFILE_PRESETS

const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

const plan = ref<PlanDetail | null>(null)
const chatMessages = ref<PlanChatMessage[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const detailTagFilter = ref('all')
const detailStatusFilter = ref<'all' | 'completed' | 'pending'>('all')

const editingTaskId = ref<string | null>(null)
const editForm = ref({ title: '', description: '', estimatedMinutes: 90, date: '', priority: 'medium' })

// --- 计划编辑状态 ---
const editingPlan = ref(false)
const savingPlan = ref(false)
const editPlanError = ref('')
const editTagInput = ref('')

interface EditPlanForm {
  topic: string
  startDate: string
  endDate: string
  dailyMinutes: number | null
  description: string
  referencesStr: string
  userProfileType: string
  userProfileCustom: string
  expectedOutcome: string
  tags: TagView[]
  notes: string
}

const editPlanForm = reactive<EditPlanForm>({
  topic: '',
  startDate: '',
  endDate: '',
  dailyMinutes: null,
  description: '',
  referencesStr: '',
  userProfileType: '零基础初学者',
  userProfileCustom: '',
  expectedOutcome: '',
  tags: [],
  notes: ''
})

const completedCount = computed(() => plan.value ? plan.value.tasks.filter((t: { completed: boolean }) => t.completed).length : 0)
const detailTagOptions = computed(() => {
  if (!plan.value) return []
  return Array.from(new Set(plan.value.tasks.flatMap(task => task.tags.map(tag => tag.name)))).sort((a, b) => a.localeCompare(b))
})

const taskGroupCompletion = computed(() => {
  const map = new Map<string, boolean>()
  if (!plan.value) return map

  const grouped = new Map<string, { allCompleted: boolean }>()
  for (const task of plan.value.tasks) {
    const key = task.taskGroupKey || task.title
    const current = grouped.get(key)
    if (!current) {
      grouped.set(key, { allCompleted: task.completed })
      continue
    }
    current.allCompleted = current.allCompleted && task.completed
  }

  grouped.forEach((value, key) => map.set(key, value.allCompleted))
  return map
})

const filteredTasks = computed(() => {
  if (!plan.value) return []
  return plan.value.tasks.filter((task) => {
    const matchesTag = detailTagFilter.value === 'all' || task.tags.some(tag => tag.name === detailTagFilter.value)
    const groupCompleted = taskGroupCompletion.value.get(task.taskGroupKey || task.title) ?? task.completed
    const matchesStatus = detailStatusFilter.value === 'all'
      || (detailStatusFilter.value === 'completed' && groupCompleted)
      || (detailStatusFilter.value === 'pending' && !groupCompleted)
    return matchesTag && matchesStatus
  })
})

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
    if (detailTagFilter.value !== 'all' && !detail.tasks.some(task => task.tags.some(tag => tag.name === detailTagFilter.value))) {
      detailTagFilter.value = 'all'
    }
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

// --- 计划编辑功能 ---

function startEditPlan() {
  if (!plan.value) return
  const p = plan.value.plan
  editPlanForm.topic = p.topic
  editPlanForm.startDate = p.startDate
  editPlanForm.endDate = p.endDate
  editPlanForm.dailyMinutes = p.dailyMinutes
  editPlanForm.description = p.description || ''
  editPlanForm.referencesStr = [...(p.references || []), ...(p.platforms || [])].filter((v, i, a) => a.indexOf(v) === i).join('、')
  editPlanForm.userProfileType = p.userProfile.type
  editPlanForm.userProfileCustom = p.userProfile.customText || ''
  editPlanForm.expectedOutcome = p.expectedOutcome || ''
  editPlanForm.tags = [...(p.tags || [])]
  editPlanForm.notes = p.notes || ''
  editPlanError.value = ''
  editTagInput.value = ''
  editingPlan.value = true
}

function cancelEditPlan() {
  editingPlan.value = false
  editPlanError.value = ''
}

function addEditTag() {
  const name = editTagInput.value.trim()
  if (!name || name.length > 10) return
  if (editPlanForm.tags.some(t => t.name === name)) return
  editPlanForm.tags.push({
    name,
    color: getTagColor(name)
  })
  editTagInput.value = ''
}

function removeEditTag(idx: number) {
  editPlanForm.tags.splice(idx, 1)
}

function validateEditPlan(): string | null {
  if (!editPlanForm.topic.trim()) return '请输入目标或学习内容'
  if (!editPlanForm.startDate) return '请选择开始日期'
  if (!editPlanForm.endDate) return '请选择结束日期'
  if (editPlanForm.startDate > editPlanForm.endDate) return '结束日期不能早于开始日期'
  if (editPlanForm.dailyMinutes !== null && (editPlanForm.dailyMinutes <= 0 || !Number.isInteger(editPlanForm.dailyMinutes))) return '每日可用时长必须为正整数'
  if (editPlanForm.description.length > 500) return '描述不能超过500字'
  if (editPlanForm.notes.length > 500) return '备注不能超过500字'
  if (!editPlanForm.userProfileType) return '请选择用户身份'
  if (editPlanForm.userProfileType === '其他' && !editPlanForm.userProfileCustom.trim()) return '请填写自定义用户身份'
  if (editPlanForm.userProfileType === '其他' && editPlanForm.userProfileCustom.trim().length > 10) return '自定义用户身份需在10字以下'
  return null
}

async function saveEditPlan() {
  editPlanError.value = ''
  const err = validateEditPlan()
  if (err) {
    editPlanError.value = err
    return
  }

  savingPlan.value = true
  try {
    const userProfile: UserProfile = {
      type: editPlanForm.userProfileType,
      customText: editPlanForm.userProfileType === '其他' ? editPlanForm.userProfileCustom.trim() : ''
    }
    const references = editPlanForm.referencesStr
      ? editPlanForm.referencesStr.split(/[+、,，]/).map(s => s.trim()).filter(Boolean)
      : []

    const data: UpdatePlanRequest = {
      planId: planId.value,
      topic: editPlanForm.topic.trim(),
      objective: editPlanForm.topic.trim(),
      startDate: editPlanForm.startDate,
      endDate: editPlanForm.endDate,
      dailyMinutes: editPlanForm.dailyMinutes,
      description: editPlanForm.description.trim(),
      references,
      platforms: references,
      userProfile,
      expectedOutcome: editPlanForm.expectedOutcome.trim(),
      tags: [...editPlanForm.tags],
      notes: editPlanForm.notes.trim()
    }

    await updatePlan(data)
    editingPlan.value = false
    await loadPlan()
    toast.value = { message: '计划信息已更新', type: 'success' }
    setTimeout(() => { toast.value = null }, 3000)
  } catch {
    toast.value = { message: '保存失败，请重试', type: 'error' }
    setTimeout(() => { toast.value = null }, 3000)
  } finally {
    savingPlan.value = false
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
.header-actions { display: flex; gap: 8px; align-items: center; }
.btn-edit {
  background: none; border: 1px solid #4F46E5; color: #4F46E5;
  padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.btn-edit:hover { background: #EEF2FF; }
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

/* 计划信息展示 */
.plan-info h2 { font-size: 20px; margin: 0 0 6px; }
.plan-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.date-range { font-size: 13px; color: #6B7280; }
.status-badge { font-size: 12px; padding: 1px 8px; border-radius: 4px; background: #EEF2FF; color: #4F46E5; }

.plan-fields {
  margin-top: 8px;
  padding: 12px 16px;
  background: #F9FAFB;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.plan-field {
  margin-bottom: 8px;
}
.plan-field:last-child { margin-bottom: 0; }
.field-label {
  font-size: 12px;
  color: #9CA3AF;
  display: block;
  margin-bottom: 1px;
}
.field-value {
  font-size: 14px;
  color: #374151;
}
.plan-field-row {
  display: flex;
  gap: 24px;
}
.plan-field-row .plan-field {
  margin-bottom: 8px;
}

/* 计划编辑表单 */
.plan-edit-form {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 8px;
  max-height: 420px;
  overflow-y: auto;
}
.plan-edit-form h3 {
  font-size: 16px;
  margin: 0 0 12px;
  color: #4F46E5;
}
.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 13px; color: #333; margin-bottom: 4px; font-weight: 500; }
.form-group label.required::after { content: ' *'; color: #EF4444; }
.optional { color: #999; font-weight: 400; font-size: 11px; }
.form-group input, .form-group textarea, .form-group select {
  width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: #4F46E5; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.char-count { font-size: 11px; color: #999; float: right; }
.profile-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.radio-label { font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.custom-profile-input { margin-top: 4px; }
.tags-input-area { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; min-height: 36px; }
.tag-item { display: flex; align-items: center; gap: 4px; background: #f3f4f6; border-radius: 4px; padding: 2px 6px; font-size: 12px; }
.tag-dot { width: 8px; height: 8px; border-radius: 50%; }
.tag-remove { background: none; border: none; cursor: pointer; color: #999; font-size: 14px; line-height: 1; padding: 0; }
.tag-input-inline { border: none !important; flex: 1; min-width: 100px; padding: 2px !important; font-size: 12px !important; outline: none; }
.error-msg { color: #EF4444; font-size: 13px; margin-top: 8px; }
.edit-plan-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.btn-primary { padding: 8px 20px; border: none; border-radius: 6px; background: #4F46E5; color: #fff; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.loading { text-align: center; padding: 40px; color: #9CA3AF; }
.detail-body { display: flex; gap: 16px; flex: 1; min-height: 0; }
.tasks-section { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; overflow-y: auto; background: #fff; }
.chat-section { width: 340px; min-width: 300px; border: 1px solid #e5e7eb; border-radius: 12px; display: flex; flex-direction: column; background: #fff; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
.section-header h3 { font-size: 14px; margin: 0; }
.task-filters {
  display: flex; gap: 8px; align-items: center; padding: 12px 16px 0;
  flex-wrap: wrap;
}
.filter-select {
  min-width: 120px; padding: 6px 8px; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 12px; background: #fff;
}
.filter-hint { font-size: 12px; color: #6B7280; }
.task-progress { font-size: 12px; color: #6B7280; }
.task-list { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.task-card { padding: 10px; border-bottom: 1px solid #f3f4f6; }
.task-card-header { display: flex; gap: 10px; align-items: flex-start; }
.task-card-header input[type="checkbox"] { margin-top: 2px; }
.task-card-info { flex: 1; min-width: 0; }
.task-card-title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.task-card-title { font-size: 14px; font-weight: 500; }
.task-number { font-size: 11px; color: #9CA3AF; white-space: nowrap; }
.task-card-meta { display: flex; gap: 8px; font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.task-card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
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
