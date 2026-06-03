import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'lab3-3-d5gdcm7qo10ced8af'

const app = cloudbase.init({
  env: ENV_ID
})

const auth = app.auth({ persistence: 'local' })

let loginPromise: Promise<void> | null = null

export async function ensureLogin(): Promise<void> {
  if (loginPromise) return loginPromise
  loginPromise = (async () => {
    try {
      const loginState = await auth.getLoginState()
      if (loginState) return
      await auth.signInAnonymously()
    } catch (error) {
      // HTTP 云函数允许无 token 调用时，不阻断前端主流程
      console.warn('CloudBase 匿名登录失败，将尝试无令牌调用云函数:', error)
    }
  })()
  return loginPromise
}

const FUNC_URL = `https://${ENV_ID}.service.tcloudbase.com/api/lab4-http`

export async function callHttpFunction(action: string, data: Record<string, unknown>): Promise<any> {
  const response = await fetch(FUNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(String(result.error))
  }

  return result
}

export { ENV_ID, app, auth }
