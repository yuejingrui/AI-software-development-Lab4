import type { PlanSummary, PlanDetail, StudyTask, PlanChatMessage, CalendarDaySummary, DayTaskView, TagView } from '@/types'

const TAG_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E']

export function getRandomTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length]
}

// Helper to generate dates
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

let nextPlanId = 0
let nextTaskId = 0
let nextMsgId = 0

// In-memory store
const plans: Map<string, PlanDetail> = new Map()

function saveToStorage() {
  const data: any[] = []
  plans.forEach((detail, planId) => {
    data.push({
      planId,
      plan: detail.plan,
      tasks: detail.tasks.map(t => ({...t})),
      chatMessages: detail.chatMessages.map(m => ({...m}))
    })
  })
  localStorage.setItem('study-plans-data', JSON.stringify({
    plansData: data,
    nextPlanId,
    nextTaskId,
    nextMsgId
  }))
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('study-plans-data')
    if (!raw) return
    const saved = JSON.parse(raw)
    nextPlanId = saved.nextPlanId || 0
    nextTaskId = saved.nextTaskId || 0
    nextMsgId = saved.nextMsgId || 0
    if (saved.plansData) {
      for (const item of saved.plansData) {
        plans.set(item.planId, {
          plan: item.plan,
          tasks: item.tasks || [],
          chatMessages: item.chatMessages || []
        })
      }
    }
  } catch (e) {
    console.warn('Failed to load study plans from storage', e)
  }
}

function generateTasks(planId: string, topic: string, startDate: string, days: number, tags: TagView[]): StudyTask[] {
  const tasks: StudyTask[] = []
  const start = new Date(startDate)
  const sampleTasks = [
    { title: '了解核心概念与背景', description: '阅读入门材料，建立整体认知框架' },
    { title: '学习基础理论知识', description: '掌握核心理论要点并做笔记' },
    { title: '动手实践练习', description: '完成配套练习题，巩固理解' },
    { title: '深入案例学习', description: '通过案例加深对知识点的理解' },
    { title: '复习与总结', description: '回顾本周所学内容，整理知识图谱' },
  ]

  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    const sampleIdx = i % sampleTasks.length
    tasks.push({
      _id: `task_${nextTaskId++}`,
      planId,
      date: formatDate(date),
      dayIndex: i + 1,
      title: `Day${i + 1}: ${sampleTasks[sampleIdx].title}`,
      description: sampleTasks[sampleIdx].description,
      estimatedMinutes: 90,
      priority: 'medium',
      tags,
      completed: false,
      editSource: 'ai_generated',
      adjustmentNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  return tasks
}

export function mockCreatePlan(data: { topic: string; objective: string; startDate: string; endDate: string; tags?: TagView[]; userProfile?: { type: string; customText: string }; dailyMinutes?: number | null; description?: string; references?: string[]; platforms?: string[]; expectedOutcome?: string; notes?: string }): { planId: string; taskCount: number; aiSupplement: { filledFields: string[]; source: string; confirmedByUser: boolean } | null } {
  const planId = `plan_${nextPlanId++}`
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  const tags = (data.tags && data.tags.length > 0) ? data.tags : [{ name: data.topic, color: getRandomTagColor(nextPlanId) }]
  const tasks = generateTasks(planId, data.topic, data.startDate, days, tags)

  const plan = {
    _id: planId,
    topic: data.topic,
    objective: data.objective || data.topic,
    startDate: data.startDate,
    endDate: data.endDate,
    durationDays: days,
    dailyMinutes: data.dailyMinutes || 90,
    description: data.description || '',
    references: data.references || [],
    platforms: data.platforms || [],
    userProfile: data.userProfile || { type: '其他', customText: '自学者' },
    expectedOutcome: data.expectedOutcome || '',
    tags,
    notes: data.notes || '',
    aiSupplement: null,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  plans.set(planId, { plan, tasks, chatMessages: [] })

  const filledFields: string[] = []
  if (!data.description) filledFields.push('description')
  if (!data.expectedOutcome) filledFields.push('expectedOutcome')
  if (!data.tags || data.tags.length === 0) filledFields.push('tags')

  saveToStorage()

  return {
    planId,
    taskCount: tasks.length,
    aiSupplement: filledFields.length > 0 ? { filledFields, source: 'DeepSeek-V4-Flash', confirmedByUser: true } : null
  }
}

export function mockListPlans(): PlanSummary[] {
  const result: PlanSummary[] = []
  plans.forEach((detail, planId) => {
    const tasks = detail.tasks
    result.push({
      _id: planId,
      topic: detail.plan.topic,
      objective: detail.plan.objective,
      startDate: detail.plan.startDate,
      endDate: detail.plan.endDate,
      tags: detail.plan.tags,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      status: detail.plan.status
    })
  })
  return result
}

export function mockGetCalendarTasks(startDate: string, endDate: string, selectedDate?: string): { days: CalendarDaySummary[] } {
  const dayMap = new Map<string, { total: number; completed: number; tags: Set<string>; tagObjs: TagView[] }>()

  plans.forEach((detail) => {
    detail.tasks.forEach(task => {
      if (task.date >= startDate && task.date <= endDate) {
        if (!dayMap.has(task.date)) {
          dayMap.set(task.date, { total: 0, completed: 0, tags: new Set(), tagObjs: [] })
        }
        const day = dayMap.get(task.date)!
        day.total++
        if (task.completed) day.completed++
        task.tags.forEach((t: TagView) => {
          if (!day.tags.has(t.name)) {
            day.tags.add(t.name)
            day.tagObjs.push(t)
          }
        })
      }
    })
  })

  const days: CalendarDaySummary[] = []
  dayMap.forEach((val, date) => {
    days.push({
      date,
      totalTasks: val.total,
      completedTasks: val.completed,
      tags: val.tagObjs,
      isSelected: date === selectedDate
    })
  })

  days.sort((a, b) => a.date.localeCompare(b.date))
  return { days }
}

export function mockGetTasksByDate(date: string): DayTaskView[] {
  const result: DayTaskView[] = []
  plans.forEach((detail) => {
    detail.tasks.forEach(task => {
      if (task.date === date) {
        result.push({
          id: task._id,
          planId: task.planId,
          planTopic: detail.plan.topic,
          title: task.title,
          description: task.description,
          estimatedMinutes: task.estimatedMinutes,
          completed: task.completed,
          priority: task.priority,
          tags: task.tags,
          editSource: task.editSource
        })
      }
    })
  })
  return result
}

export function mockUpdateTaskStatus(taskId: string, completed: boolean): boolean {
  plans.forEach((detail) => {
    detail.tasks.forEach(task => {
      if (task._id === taskId) {
        task.completed = completed
        task.updatedAt = new Date().toISOString()
      }
    })
  })
  saveToStorage()
  return true
}

export function mockUpdateTaskInfo(taskId: string, updates: { title?: string; description?: string; estimatedMinutes?: number; date?: string; priority?: string; tags?: TagView[] }): boolean {
  plans.forEach((detail) => {
    detail.tasks.forEach(task => {
      if (task._id === taskId) {
        if (updates.title !== undefined) task.title = updates.title
        if (updates.description !== undefined) task.description = updates.description
        if (updates.estimatedMinutes !== undefined) task.estimatedMinutes = updates.estimatedMinutes
        if (updates.date !== undefined) task.date = updates.date
        if (updates.priority !== undefined) task.priority = updates.priority as 'low' | 'medium' | 'high'
        if (updates.tags !== undefined) task.tags = updates.tags
        task.editSource = 'user_manual'
        task.updatedAt = new Date().toISOString()
      }
    })
  })
  saveToStorage()
  return true
}

export function mockGetPlanDetail(planId: string): PlanDetail | null {
  return plans.get(planId) || null
}

export function mockRefinePlan(planId: string, message: string): { reply: string; proposedTaskChanges: unknown[] } {
  return {
    reply: `收到你的请求："${message}"。我会根据你的要求调整任务安排。`,
    proposedTaskChanges: []
  }
}

export function mockSaveChatMessage(planId: string, role: string, content: string): PlanChatMessage {
  const detail = plans.get(planId)
  if (!detail) throw new Error('计划不存在')
  const msg: PlanChatMessage = {
    _id: `msg_${nextMsgId++}`,
    planId,
    role: role as 'user' | 'assistant',
    content,
    createdAt: new Date().toISOString()
  }
  detail.chatMessages.push(msg)
  saveToStorage()
  return msg
}

export function mockSuggestAiCompletion(data: Record<string, unknown>): { filledFields: string[]; suggestions: Record<string, string>; source: string } {
  const result: { filledFields: string[]; suggestions: Record<string, string>; source: string } = {
    filledFields: [],
    suggestions: {},
    source: 'DeepSeek-V4-Flash'
  }
  if (!data.description) {
    result.filledFields.push('description')
    result.suggestions.description = `这是一个关于${data.topic || '学习'}的学习计划，旨在系统地掌握相关知识。`
  }
  if (!data.expectedOutcome) {
    result.filledFields.push('expectedOutcome')
    result.suggestions.expectedOutcome = '能够独立运用所学知识解决实际问题'
  }
  if (!data.dailyMinutes) {
    result.filledFields.push('dailyMinutes')
    result.suggestions.dailyMinutes = '60'
  }
  return result
}

// Auto-load on module init
loadFromStorage()
window.addEventListener('beforeunload', saveToStorage)
