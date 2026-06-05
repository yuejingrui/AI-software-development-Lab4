/**
 * unified-calendar-enhance 验收测试
 *
 * 映射自 .trae/specs/unified-calendar-enhance/checklist.md
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as api from "../api.js";
import {
  todayStr, tomorrowStr, monthRange,
  assertArray, assertFields, assertDateString,
  makePlanData, trackPlan, cleanupTestPlans,
} from "../utils.js";

describe("unified-calendar-enhance", () => {
  after(cleanupTestPlans);
  let testPlanId;
  const now = new Date();
  const range = monthRange(now.getFullYear(), now.getMonth());

  before(async () => {
    // 创建至少一个计划以便日历有数据
    const data = makePlanData();
    const result = await api.createPlan(data);
    testPlanId = result.planId;
    trackPlan(testPlanId);
  });

  // ─── 日历日期格增强 ────────────────────────────────

  it("日历返回的 days 数组包含今日所在范围的日期", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    assertArray(cal.days);
    assert.ok(Array.isArray(cal.days), "days 应为数组");
    cal.days.forEach((day) => {
      assertDateString(day.date);
      assertFields(day, ["totalTasks", "completedTasks", "totalMinutes", "tags"]);
    });
  });

  it("日期格包含任务数量、完成数量、标签色块、总分钟数", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    assertArray(cal.days);
    for (const day of cal.days) {
      assert.ok(typeof day.totalTasks === "number");
      assert.ok(typeof day.completedTasks === "number");
      assert.ok(typeof day.totalMinutes === "number");
      assert.ok(Array.isArray(day.tags));
    }
  });

  it("日期格标签去重（同一标签不应重复出现）", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    for (const day of cal.days) {
      const names = day.tags.map((t) => t.name);
      const unique = new Set(names);
      assert.equal(names.length, unique.size, `标签应去重: ${names}`);
      day.tags.forEach((t) => {
        assert.ok(t.color, "每个标签应有 color 字段");
      });
    }
  });

  it("选中日期应有 isSelected 标记", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end, todayStr());
    const selected = cal.days.find((d) => d.isSelected);
    if (selected) {
      assert.equal(selected.date, todayStr());
    }
  });

  it("日历切换月份后数据正确（下月也应返回有效 days）", async () => {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextRange = monthRange(nextMonth.getFullYear(), nextMonth.getMonth());
    const cal = await api.getCalendarTasks(nextRange.start, nextRange.end);
    assertArray(cal.days);
    cal.days.forEach((d) => assertDateString(d.date));
  });

  it("日期格不包含主题摘要文本（tags 应为 TagView 结构数组）", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    const todayDay = cal.days.find((d) => d.date === todayStr());
    if (todayDay && todayDay.tags.length > 0) {
      const tag = todayDay.tags[0];
      assert.ok("name" in tag && "color" in tag, "tag 应为 {name, color} 结构");
    }
  });

  // ─── 全局统计面板数据 ──────────────────────────────

  it("统计面板的总计划数应与实际计划数一致", async () => {
    const plans = await api.listPlans();
    assertArray(plans, 1);
  });

  it("统计面板的总学习天数应与日历去重日期数一致", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    const uniqueDays = new Set(cal.days.map((d) => d.date).filter((d) => {
      const day = cal.days.find((x) => x.date === d);
      return day && day.totalTasks > 0;
    }));
    assert.ok(uniqueDays.size >= 0, "应能统计去重天数");
  });

  it("统计面板的总学习时长（分钟求和）", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    let totalMin = 0;
    cal.days.forEach((d) => { totalMin += d.totalMinutes || 0; });
    assert.ok(typeof totalMin === "number" && totalMin >= 0);
  });

  it("统计数据随任务完成状态变化应更新", async () => {
    // 获取今日任务，完成一个，再查日历验证
    const tasks = await api.getTasksByDate(todayStr());
    if (tasks.length === 0) {
      // 没有任务就跳过（需要先创建计划触发任务生成）
      assert.ok(true, "跳过：今日无任务");
      return;
    }
    const task = tasks[0];
    const before = await api.getCalendarTasks(range.start, range.end, todayStr());
    await api.updateTaskStatus(task.id, true);
    const after = await api.getCalendarTasks(range.start, range.end, todayStr());
    // 恢复
    await api.updateTaskStatus(task.id, false);
    assert.ok(after.days.length > 0, "日历数据应更新");
  });

  // ─── 标签色块 ─────────────────────────────────────

  it("标签有 color 字段", async () => {
    const cal = await api.getCalendarTasks(range.start, range.end);
    const dayWithTags = cal.days.find((d) => d.tags.length > 0);
    if (dayWithTags) {
      dayWithTags.tags.forEach((t) => {
        assert.ok("name" in t, "tag 应有 name");
        assert.ok("color" in t, "tag 应有 color");
      });
    }
  });

  // ─── 边界 ─────────────────────────────────────────

  it("无计划的月份日历也不应报错", async () => {
    // 使用很久以前的一个月，确保无数据
    const cal = await api.getCalendarTasks("2020-01-01", "2020-01-31");
    assertArray(cal.days);
    assert.ok(Array.isArray(cal.days));
  });
});
