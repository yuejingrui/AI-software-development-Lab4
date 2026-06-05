import type { StudyTask } from './task'
import type { PlanChatMessage } from './chat'

export interface TagView {
  name: string
  color: string
  source?: 'user' | 'ai'
}

export interface UserProfile {
  type: string          // 预设身份如 "零基础初学者" | "考研复习" | "备考期末" | "假期自学" | "其他"
  customText: string    // 选择"其他"时的自定义内容
}

export const USER_PROFILE_PRESETS = [
  '零基础初学者',
  '考研复习',
  '备考期末',
  '备考竞赛',
  '假期自学',
  '课程补强',
  '项目实战',
  '转专业学生',
  '在职提升',
  '其他'
] as const

export interface AiSupplement {
  filledFields: string[]
  source: string
  confirmedByUser: boolean
}

export interface StudyPlan {
  _id: string
  topic: string
  objective: string
  startDate: string
  endDate: string
  durationDays: number
  dailyMinutes: number | null
  description: string
  references: string[]
  platforms: string[]
  userProfile: UserProfile
  expectedOutcome: string
  tags: TagView[]
  notes: string
  aiSupplement: AiSupplement | null
  status: 'active' | 'completed' | 'paused'
  createdAt: string
  updatedAt: string
}

export interface CreatePlanRequest {
  topic: string
  objective: string
  startDate: string
  endDate: string
  dailyMinutes: number | null
  description: string
  references: string[]
  platforms: string[]
  userProfile: UserProfile
  expectedOutcome: string
  tags: TagView[]
  notes: string
}

export interface CreatePlanResponse {
  planId: string
  taskCount: number
  aiSupplement: AiSupplement | null
}

export interface PlanSummary {
  _id: string
  topic: string
  objective: string
  startDate: string
  endDate: string
  tags: TagView[]
  totalTasks: number
  completedTasks: number
  status: string
}

export interface PlanDetail {
  plan: StudyPlan
  tasks: StudyTask[]
  chatMessages: PlanChatMessage[]
}
