/**
 * Test utility functions: assertions, date helpers, test data factory.
 */
import assert from "node:assert/strict";

// ─── Date helpers ────────────────────────────────────

export function todayStr() {
  return formatDate(new Date());
}

export function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

export function dayAfter(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

// ─── Assertion helpers ───────────────────────────────

/**
 * Assert the promise rejects with a specific error message substring.
 */
export async function assertThrows(promise, expectedSubstring) {
  try {
    await promise;
  } catch (err) {
    const msg = err?.message || String(err);
    if (expectedSubstring) {
      assert.ok(
        msg.includes(expectedSubstring),
        `Expected error to contain "${expectedSubstring}" but got: ${msg}`
      );
    }
    return err;
  }
  assert.fail(`Expected promise to throw but it resolved`);
}

/**
 * Assert a value is a non-empty array.
 */
export function assertArray(value, minLength = 0) {
  assert.ok(Array.isArray(value), `Expected array, got ${typeof value}`);
  if (minLength > 0) {
    assert.ok(value.length >= minLength, `Expected array length >= ${minLength}, got ${value.length}`);
  }
}

/**
 * Assert a value is a valid date string (YYYY-MM-DD).
 */
export function assertDateString(value) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `Expected date string, got "${value}"`);
}

/**
 * Assert fields exist on an object.
 */
export function assertFields(obj, fields) {
  for (const f of fields) {
    assert.ok(f in obj, `Expected field "${f}" to exist`);
  }
}

// ─── Test data factories ─────────────────────────────

let counter = 0;

export function uniqueId(prefix = "test") {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export function makePlanData(overrides = {}) {
  const start = todayStr();
  const end = dayAfter(2);
  return {
    topic: `自动化测试计划_${uniqueId()}`,
    objective: "验证计划创建流程",
    startDate: start,
    endDate: end,
    dailyMinutes: 60,
    userProfile: { type: "学生", customText: "" },
    description: "由自动化测试程序创建",
    references: ["测试教材 v1"],
    platforms: ["网页"],
    expectedOutcome: "掌握测试技能",
    tags: [],
    notes: "",
    ...overrides,
  };
}

// ─── Test life-cycle state ───────────────────────────

/** Collect created plan IDs for cleanup after tests */
export const testState = {
  createdPlanIds: [],
  createdTaskIds: [],
  createdSubtaskIds: [],
};

export function trackPlan(id) {
  if (id && !testState.createdPlanIds.includes(id)) {
    testState.createdPlanIds.push(id);
  }
}

export function trackTask(id) {
  if (id && !testState.createdTaskIds.includes(id)) {
    testState.createdTaskIds.push(id);
  }
}

export function trackSubtask(id) {
  if (id && !testState.createdSubtaskIds.includes(id)) {
    testState.createdSubtaskIds.push(id);
  }
}
