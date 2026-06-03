<template>
  <div v-if="visible" class="dialog-overlay">
    <div class="dialog">
      <div class="dialog-header">
        <h2>新建学习计划</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="dialog-body">
        <!-- 目标/学习内容 (必填) -->
        <div class="form-group">
          <label class="required">目标 / 学习内容</label>
          <input v-model="form.topic" maxlength="100" placeholder="例如：React 基础入门" />
        </div>

        <!-- 日期行 (必填) -->
        <div class="form-row">
          <div class="form-group">
            <label class="required">开始日期</label>
            <input type="date" v-model="form.startDate" />
          </div>
          <div class="form-group">
            <label class="required">结束日期</label>
            <input type="date" v-model="form.endDate" />
          </div>
        </div>

        <!-- 每日可用时长 (选填) -->
        <div class="form-group">
          <label>每日可用时长（分钟）<span class="optional">选填</span></label>
          <input type="number" v-model.number="form.dailyMinutes" placeholder="例如：90" min="1" />
        </div>

        <!-- 补充说明 (选填) -->
        <div class="form-group">
          <label>描述 / 补充说明<span class="optional">选填</span></label>
          <textarea v-model="form.description" maxlength="500" rows="2" placeholder="补充说明学习重点或方向"></textarea>
          <span class="char-count">{{ form.description.length }}/500</span>
        </div>

        <!-- 参考资料与平台 (选填) -->
        <div class="form-group">
          <label>参考资料与平台<span class="optional">选填</span></label>
          <input v-model="form.referencesStr" placeholder="例如：B站 + 官方文档 + LeetCode" />
        </div>

        <!-- 用户身份 (必填) -->
        <div class="form-group">
          <label class="required">用户身份</label>
          <div class="profile-options">
            <label
              v-for="preset in profilePresets"
              :key="preset"
              class="radio-label"
            >
              <input type="radio" v-model="form.userProfileType" :value="preset" />
              {{ preset }}
            </label>
          </div>
          <input
            v-if="form.userProfileType === '其他'"
            v-model="form.userProfileCustom"
            class="custom-profile-input"
            placeholder="请填写，10字以下"
            maxlength="10"
          />
        </div>

        <!-- 预期成果 (选填) -->
        <div class="form-group">
          <label>预期学习成果 / 程度<span class="optional">选填</span></label>
          <input v-model="form.expectedOutcome" placeholder="例如：能完成基础项目" maxlength="200" />
        </div>

        <!-- 主题标签 (选填) -->
        <div class="form-group">
          <label>主题标签<span class="optional">选填，10字以内</span></label>
          <div class="tags-input-area">
            <div v-for="(tag, idx) in form.tags" :key="idx" class="tag-item">
              <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
              <span>{{ tag.name }}</span>
              <button class="tag-remove" @click="removeTag(idx)">&times;</button>
            </div>
            <input
              v-if="form.tags.length < 5"
              v-model="tagInput"
              class="tag-input-inline"
              placeholder="输入标签后回车"
              maxlength="10"
              @keydown.enter.prevent="addTag"
            />
          </div>
        </div>

        <!-- 备注 (选填) -->
        <div class="form-group">
          <label>备注<span class="optional">选填</span></label>
          <textarea v-model="form.notes" maxlength="500" rows="2" placeholder="任何补充说明"></textarea>
        </div>

        <!-- AI补全预览区 -->
        <div v-if="aiSuggestions && Object.keys(aiSuggestions.suggestions).length > 0" class="ai-suggestions">
          <div class="ai-suggestions-header">
            <span class="ai-badge">AI 建议</span>
            <span class="ai-hint">以下字段已自动补全，你可以修改或忽略</span>
          </div>
          <div v-if="aiSuggestions.suggestions.description" class="suggestion-item">
            <label>建议描述：</label>
            <span>{{ aiSuggestions.suggestions.description }}</span>
          </div>
          <div v-if="aiSuggestions.suggestions.expectedOutcome" class="suggestion-item">
            <label>建议预期成果：</label>
            <span>{{ aiSuggestions.suggestions.expectedOutcome }}</span>
          </div>
          <div v-if="aiSuggestions.suggestions.notes" class="suggestion-item">
            <label>建议备注：</label>
            <span>{{ aiSuggestions.suggestions.notes }}</span>
          </div>
          <div v-if="aiSuggestions.suggestions.dailyMinutes" class="suggestion-item">
            <label>建议每日时长：</label>
            <span>{{ aiSuggestions.suggestions.dailyMinutes }} 分钟</span>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel" @click="$emit('close')" :disabled="props.submitting">取消</button>
        <button class="btn-primary" @click="handleSubmit" :disabled="props.submitting">
          {{ props.submitting ? '⏳ 生成中...' : '生成计划' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { USER_PROFILE_PRESETS } from '@/types'
import type { TagView, UserProfile, CreatePlanRequest } from '@/types'
import { getRandomTagColor } from '@/services/data'
import { suggestAiCompletion } from '@/services/data'

const props = defineProps<{ visible: boolean; submitting: boolean }>()
const emit = defineEmits<{
  close: []
  submit: [data: CreatePlanRequest]
}>()

const TAG_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E']

const profilePresets = USER_PROFILE_PRESETS

const form = reactive({
  topic: '',
  startDate: '',
  endDate: '',
  dailyMinutes: null as number | null,
  description: '',
  referencesStr: '',
  userProfileType: '零基础初学者',
  userProfileCustom: '',
  expectedOutcome: '',
  tags: [] as TagView[],
  notes: ''
})

const tagInput = ref('')
const errorMsg = ref('')
const aiSuggestions = ref<{ filledFields: string[]; suggestions: Record<string, string>; source: string } | null>(null)

function addTag() {
  const name = tagInput.value.trim()
  if (!name || name.length > 10) return
  if (form.tags.some(t => t.name === name)) return
  form.tags.push({
    name,
    color: TAG_COLORS[form.tags.length % TAG_COLORS.length]
  })
  tagInput.value = ''
}

function removeTag(idx: number) {
  form.tags.splice(idx, 1)
}

function validate(): string | null {
  if (!form.topic.trim()) return '请输入目标或学习内容'
  if (!form.startDate) return '请选择开始日期'
  if (!form.endDate) return '请选择结束日期'
  if (form.startDate > form.endDate) return '结束日期不能早于开始日期'
  if (form.dailyMinutes !== null && (form.dailyMinutes <= 0 || !Number.isInteger(form.dailyMinutes))) return '每日可用时长必须为正整数'
  if (form.description.length > 500) return '描述不能超过500字'
  if (form.notes.length > 500) return '备注不能超过500字'
  if (!form.userProfileType) return '请选择用户身份'
  if (form.userProfileType === '其他' && !form.userProfileCustom.trim()) return '请填写自定义用户身份'
  if (form.userProfileType === '其他' && form.userProfileCustom.trim().length > 10) return '自定义用户身份需在10字以下'
  return null
}

async function checkAiCompletion(): Promise<void> {
  const missing: string[] = []
  if (!form.description.trim()) missing.push('description')
  if (!form.expectedOutcome.trim()) missing.push('expectedOutcome')
  if (form.dailyMinutes === null) missing.push('dailyMinutes')

  if (missing.length > 0) {
    try {
      const result = await suggestAiCompletion({
        topic: form.topic,
        startDate: form.startDate,
        endDate: form.endDate,
        userProfileType: form.userProfileType,
        userProfileCustom: form.userProfileCustom,
        description: form.description,
        expectedOutcome: form.expectedOutcome,
        dailyMinutes: form.dailyMinutes,
        notes: form.notes,
        references: form.referencesStr
      })
      aiSuggestions.value = result
      if (result.suggestions.description && !form.description.trim()) {
        form.description = result.suggestions.description
      }
      if (result.suggestions.expectedOutcome && !form.expectedOutcome.trim()) {
        form.expectedOutcome = result.suggestions.expectedOutcome
      }
      if (result.suggestions.notes && !form.notes.trim()) {
        form.notes = result.suggestions.notes
      }
      if (result.suggestions.dailyMinutes && form.dailyMinutes === null) {
        form.dailyMinutes = parseInt(result.suggestions.dailyMinutes, 10) || 60
      }
    } catch {
      // AI补全失败不阻断流程
    }
  } else {
    aiSuggestions.value = null
  }
}

async function handleSubmit() {
  errorMsg.value = ''
  const err = validate()
  if (err) { errorMsg.value = err; return }

  await checkAiCompletion()

  const userProfile: UserProfile = {
    type: form.userProfileType,
    customText: form.userProfileType === '其他' ? form.userProfileCustom.trim() : ''
  }
  const references = form.referencesStr ? form.referencesStr.split(/[+、,，]/).map(s => s.trim()).filter(Boolean) : []

  const data: CreatePlanRequest = {
    topic: form.topic.trim(),
    objective: form.topic.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    dailyMinutes: form.dailyMinutes,
    description: form.description.trim(),
    references,
    platforms: references,
    userProfile,
    expectedOutcome: form.expectedOutcome.trim(),
    tags: [...form.tags],
    notes: form.notes.trim()
  }
  emit('submit', data)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.dialog {
  background: #fff; border-radius: 12px; width: 580px; max-height: 85vh;
  display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 12px; border-bottom: 1px solid #eee;
}
.dialog-header h2 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; font-size: 22px; cursor: pointer; color: #999; }
.dialog-body { padding: 16px 24px; overflow-y: auto; flex: 1; }
.dialog-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 12px 24px 20px; border-top: 1px solid #eee;
}
.form-group { margin-bottom: 12px; }
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
.ai-suggestions { background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 8px; padding: 12px; margin-top: 12px; }
.ai-suggestions-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ai-badge { background: #4F46E5; color: #fff; padding: 1px 8px; border-radius: 4px; font-size: 11px; }
.ai-hint { font-size: 12px; color: #6B7280; }
.suggestion-item { font-size: 13px; margin-bottom: 4px; }
.suggestion-item label { font-weight: 500; color: #4F46E5; }
.error-msg { color: #EF4444; font-size: 13px; margin-top: 8px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
.btn-primary { padding: 8px 20px; border: none; border-radius: 6px; background: #4F46E5; color: #fff; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
