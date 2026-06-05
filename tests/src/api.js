/**
 * HTTP API client for CloudBase cloud function lab4-http.
 * All tests interact with the deployed function, never with the database directly.
 */

const BASE_URL = process.env.CLOUDBASE_FUNCTION_URL
  || "https://lab3-3-d5gdcm7qo10ced8af.service.tcloudbase.com/api/lab4-http";

/**
 * Call a cloud function action with a JSON body.
 * @param {string} action - e.g. "createPlan", "listPlans"
 * @param {Record<string, unknown>} [data={}]
 * @returns {Promise<any>} Parsed JSON response
 */
export async function call(action, data = {}) {
  const url = BASE_URL;
  const controller = new AbortController();
  const timeout = 30_000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ action, ...data }),
      signal: controller.signal,
    });
    const body = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return { _raw: body, _status: resp.status };
    }
    if (!resp.ok || parsed.error) {
      const err = new Error(parsed.error || `HTTP ${resp.status}`);
      err.status = resp.status;
      err.body = parsed;
      throw err;
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Plan APIs ──────────────────────────────────────

export function createPlan(data) {
  return call("createPlan", data);
}

export function listPlans() {
  return call("listPlans", {});
}

export function getPlanDetail(planId) {
  return call("getPlanDetail", { planId });
}

export function updatePlan(data) {
  return call("updatePlan", data);
}

export function deletePlan(planId) {
  return call("deletePlan", { planId });
}

// ─── Task APIs ───────────────────────────────────────

export function getCalendarTasks(startDate, endDate, selectedDate) {
  return call("getCalendarTasks", { startDate, endDate, selectedDate });
}

export function getTasksByDate(date) {
  return call("getTasksByDate", { date });
}

export function updateTaskStatus(taskId, completed) {
  return call("updateTaskStatus", { taskId, completed });
}

export function updateTaskInfo(taskId, updates) {
  return call("updateTaskInfo", { taskId, ...updates });
}

// ─── Subtask APIs ────────────────────────────────────

export function generateSubtasks(taskId) {
  return call("generateSubtasks", { taskId });
}

export function createSubtask(taskId, planId, title) {
  return call("createSubtask", { taskId, planId, title });
}

export function updateSubtask(subtaskId, title) {
  return call("updateSubtask", { subtaskId, title });
}

export function deleteSubtask(subtaskId) {
  return call("deleteSubtask", { subtaskId });
}

export function updateSubtaskStatus(subtaskId, completed) {
  return call("updateSubtaskStatus", { subtaskId, completed });
}

export function getSubtasks(taskId) {
  return call("getSubtasks", { taskId });
}

// ─── Utility APIs ────────────────────────────────────

export function cleanupOrphanTasks() {
  return call("cleanupOrphanTasks", {});
}

export function saveChatMessage(planId, role, content) {
  return call("saveChatMessage", { planId, role, content });
}
