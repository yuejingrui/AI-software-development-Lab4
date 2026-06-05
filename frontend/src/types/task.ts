import type { TagView } from './plan'

export interface StudyTask {
  _id: string
  planId: string
  date: string
  dayIndex: number
  title: string
  description: string
  estimatedMinutes: number
  priority: 'low' | 'medium' | 'high'
  tags: TagView[]
  taskNumber?: string
  taskGroupKey?: string
  completed: boolean
  editSource: 'ai_generated' | 'user_manual' | 'ai_refined'
  adjustmentNote: string
  createdAt: string
  updatedAt: string
}

export interface UpdateTaskStatusRequest {
  taskId: string
  completed: boolean
}

export interface UpdateTaskInfoRequest {
  taskId: string
  title?: string
  description?: string
  estimatedMinutes?: number
  date?: string
  priority?: string
  tags?: TagView[]
}

export interface DayTaskView {
  id: string
  planId: string
  planTopic: string
  title: string
  description: string
  estimatedMinutes: number
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  tags: TagView[]
  taskNumber?: string
  taskGroupKey?: string
  editSource: string
}

export interface CalendarDaySummary {
  date: string
  totalTasks: number
  completedTasks: number
  totalMinutes: number
  tags: TagView[]
  isSelected?: boolean
}

export interface CalendarTasksResponse {
  days: CalendarDaySummary[]
}
