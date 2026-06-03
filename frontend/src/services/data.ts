/**
 * CloudBase 数据服务层
 * 统一通过 HTTP 云函数访问，避免浏览器直连数据库带来的鉴权与路由问题
 */
import { callHttpFunction } from './cloudbase'
import type {
  PlanSummary, PlanDetail, PlanChatMessage,
  CalendarDaySummary, DayTaskView, TagView,
  CreatePlanRequest, CreatePlanResponse
} from '@/types'

export const TAG_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E']


export function getRandomTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length]
}

export async function createPlan(data: CreatePlanRequest): Promise<CreatePlanResponse> {
  const result = await callHttpFunction('createPlan', data as unknown as Record<string, unknown>)
  return {
    planId: result.planId,
    taskCount: result.taskCount,
    aiSupplement: result.aiSupplement ?? null
  }
}

export async function listPlans(): Promise<PlanSummary[]> {
  return callHttpFunction('listPlans', {})
}

export async function getCalendarTasks(startDate: string, endDate: string, selectedDate?: string): Promise<{ days: CalendarDaySummary[] }> {
  return callHttpFunction('getCalendarTasks', { startDate, endDate, selectedDate })
}

export async function getTasksByDate(date: string): Promise<DayTaskView[]> {
  return callHttpFunction('getTasksByDate', { date })
}

export async function updateTaskStatus(taskId: string, completed: boolean): Promise<boolean> {
  const result = await callHttpFunction('updateTaskStatus', { taskId, completed })
  return !!result.success
}

export async function deletePlan(planId: string): Promise<boolean> {
  const result = await callHttpFunction('deletePlan', { planId })
  return !!result.success
}

export async function updateTaskInfo(taskId: string, updates: { title?: string; description?: string; estimatedMinutes?: number; date?: string; priority?: string; tags?: TagView[] }): Promise<boolean> {
  const result = await callHttpFunction('updateTaskInfo', { taskId, ...updates })
  return !!result.success
}

export async function getPlanDetail(planId: string): Promise<PlanDetail | null> {
  try {
    return await callHttpFunction('getPlanDetail', { planId })
  } catch {
    return null
  }
}

export async function refinePlan(planId: string, message: string): Promise<{ reply: string; proposedTaskChanges: unknown[] }> {
  try {
    const data = await callHttpFunction('refinePlan', { planId, message })
    return {
      reply: data.reply || `已将你的请求"${message}"发送给 AI，稍后处理。`,
      proposedTaskChanges: data.proposedTaskChanges || []
    }
  } catch {
    return {
      reply: `收到你的请求："${message}"。AI 服务暂不可用，请稍后重试。`,
      proposedTaskChanges: []
    }
  }
}

export async function saveChatMessage(planId: string, role: string, content: string): Promise<PlanChatMessage> {
  return callHttpFunction('saveChatMessage', { planId, role, content })
}

export async function suggestAiCompletion(data: Record<string, unknown>): Promise<{ filledFields: string[]; suggestions: Record<string, string>; source: string }> {
  try {
    const aiData = await callHttpFunction('suggestCompletion', { ...data })
    return {
      filledFields: aiData.filledFields || [],
      suggestions: aiData.suggestions || {},
      source: 'DeepSeek-V4-Flash'
    }
  } catch {
    // Fallback 补全
    const result = { filledFields: [] as string[], suggestions: {} as Record<string, string>, source: 'DeepSeek-V4-Flash' }
    if (!data.description) {
      result.filledFields.push('description')
      result.suggestions.description = `这是一个关于${data.topic || '学习'}的学习计划，旨在系统地掌握相关知识。`
    }
    if (!data.expectedOutcome) {
      result.filledFields.push('expectedOutcome')
      result.suggestions.expectedOutcome = '能够独立运用所学知识解决实际问题'
    }
    if (!data.notes) {
      result.filledFields.push('notes')
      result.suggestions.notes = '建议在学习过程中记录困难点、复习安排和阶段性检查结论。'
    }
    if (!data.dailyMinutes) {
      result.filledFields.push('dailyMinutes')
      result.suggestions.dailyMinutes = '60'
    }
    return result
  }
}
