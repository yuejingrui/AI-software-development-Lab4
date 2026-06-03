export interface PlanChatMessage {
  _id: string
  planId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface AiSupplementResult {
  filledFields: string[]
  suggestions: Record<string, string>
  source: string
}

export interface RefinePlanRequest {
  planId: string
  message: string
  applyChanges: boolean
}

export interface ProposedTaskChange {
  taskId: string
  date?: string
  title?: string
  description?: string
  estimatedMinutes?: number
  priority?: string
}

export interface RefinePlanResponse {
  reply: string
  proposedTaskChanges: ProposedTaskChange[]
}
