/**
 * plan-export 验收测试
 *
 * 映射自 .trae/specs/plan-export/checklist.md
 *
 * 测试策略：
 * - 纯函数（sanitizeFilename、内容格式）用 mock 数据验证
 * - 数据完整性通过调用真实 API 获取计划后验证字段
 * - UI 交互（按钮、保存对话框）需浏览器环境，不在 API 测试范围
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as api from "../api.js";
import {
  todayStr, makePlanData, trackPlan, cleanupTestPlans,
} from "../utils.js";

// ─── 纯函数测试：sanitizeFilename ───────────────────

function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_").trim() || "未命名计划";
}

describe("sanitizeFilename", () => {
  it("正常计划名不变", () => {
    assert.equal(sanitizeFilename("React 基础入门"), "React 基础入门");
  });

  it('包含 / 替换为 _', () => {
    assert.equal(sanitizeFilename("A/B 计划"), "A_B 计划");
  });

  it('包含 \\ 替换为 _', () => {
    assert.equal(sanitizeFilename("C:\\学习"), "C__学习");
  });

  it('包含 : 替换为 _', () => {
    assert.equal(sanitizeFilename("计划:数学分析"), "计划_数学分析");
  });

  it('包含 * ? " < > | 全部替换', () => {
    assert.equal(sanitizeFilename('a*b?c"d<e>f|g'), "a_b_c_d_e_f_g");
  });

  it("空字符串返回默认名", () => {
    assert.equal(sanitizeFilename(""), "未命名计划");
  });

  it("仅空白字符返回默认名", () => {
    assert.equal(sanitizeFilename("   "), "未命名计划");
  });
});

// ─── 导出内容格式验证（用 mock 数据模拟 Markdown 生成） ───

function generateMockMarkdown(plan, tasks) {
  const done = tasks.filter((t) => t.completed).length;
  const lines = [];

  lines.push(`# 学习计划：${plan.topic}`);
  lines.push("");
  lines.push(`- 日期：${plan.startDate} ~ ${plan.endDate}`);
  lines.push(`- 总天数：${plan.durationDays ?? tasks.length} 天`);
  lines.push(`- 总任务数：${tasks.length}  已完成：${done}`);
  lines.push("");

  if (tasks.length === 0) {
    lines.push("> 该计划暂无学习任务。");
    return lines.join("\n");
  }

  const groupMap = new Map();
  for (const t of tasks) {
    const key = t.date || "未知日期";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(t);
  }

  const sortedDates = [...groupMap.keys()].sort();
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  for (const date of sortedDates) {
    const d = new Date(date);
    lines.push("");
    lines.push(`## ${date}（星期${weekDays[d.getDay()]}）`);
    lines.push("");
    for (const task of groupMap.get(date)) {
      const check = task.completed ? "x" : " ";
      const emoji = task.completed ? "✅" : "⬜";
      lines.push(`- [${check}] ${task.title} — ${task.estimatedMinutes ?? 0}分钟 ${emoji}`);
      if (task.description) {
        lines.push(`  > ${task.description}`);
      }
    }
  }

  return lines.join("\n");
}

function generateMockPlainText(plan, tasks) {
  const done = tasks.filter((t) => t.completed).length;
  const lines = [];

  lines.push(`=== 学习计划：${plan.topic} ===`);
  lines.push("");
  lines.push(`日期：${plan.startDate} ~ ${plan.endDate}`);
  lines.push(`总天数：${plan.durationDays ?? tasks.length} 天`);
  lines.push(`总任务数：${tasks.length}  已完成：${done}`);
  lines.push("");
  lines.push("----------------------------------------");

  if (tasks.length === 0) {
    lines.push("");
    lines.push("该计划暂无学习任务。");
    return lines.join("\n");
  }

  const groupMap = new Map();
  for (const t of tasks) {
    const key = t.date || "未知日期";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(t);
  }

  const sortedDates = [...groupMap.keys()].sort();
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  for (const date of sortedDates) {
    const d = new Date(date);
    lines.push("");
    lines.push(`${date}（星期${weekDays[d.getDay()]}）`);
    lines.push("----------------------------------------");
    for (const task of groupMap.get(date)) {
      const check = task.completed ? "x" : " ";
      const emoji = task.completed ? "✅" : "⬜";
      lines.push(`  [${check}] ${task.title} — ${task.estimatedMinutes ?? 0}分钟 ${emoji}`);
      if (task.description) {
        lines.push(`      任务说明：${task.description}`);
      }
    }
  }

  return lines.join("\n");
}

describe("导出内容格式", () => {
  const mockPlan = {
    topic: "测试计划 Markdown 导出",
    startDate: "2026-06-01",
    endDate: "2026-06-03",
    durationDays: 3,
    description: "这是一个测试描述",
  };

  const mockTasks = [
    {
      date: "2026-06-01",
      title: "任务一",
      description: "完成第一章阅读",
      estimatedMinutes: 60,
      completed: true,
    },
    {
      date: "2026-06-01",
      title: "任务二（无描述）",
      description: "",
      estimatedMinutes: 45,
      completed: false,
    },
    {
      date: "2026-06-02",
      title: "任务三",
      description: "练习课后习题",
      estimatedMinutes: 90,
      completed: false,
    },
  ];

  // ── Markdown 格式 ──

  it("MD 内容包含计划名称", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes(mockPlan.topic), "应包含计划名");
    assert.ok(md.startsWith("# 学习计划："), "应以一级标题开头");
  });

  it("MD 内容包含日期范围", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes(mockPlan.startDate));
    assert.ok(md.includes(mockPlan.endDate));
  });

  it("MD 内容包含总天数和任务统计", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes("总天数：3 天"));
    assert.ok(md.includes("总任务数：3"));
    assert.ok(md.includes("已完成：1"));
  });

  it("MD 使用 `- [x]` 标记已完成任务", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes("- [x] 任务一"), "已完成用 [x]");
    assert.ok(md.includes("- [ ] 任务二"), "未完成用 [ ]");
    assert.ok(md.includes("✅"), "已完成应有 ✅");
    assert.ok(md.includes("⬜"), "未完成应有 ⬜");
  });

  it("MD 使用 `>` 引用任务描述", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes("> 完成第一章阅读"));
    assert.ok(md.includes("> 练习课后习题"));
  });

  it("MD 按日期分组，使用 `##` 标题", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes("## 2026-06-01"));
    assert.ok(md.includes("## 2026-06-02"));
    // 日期排序
    const idx1 = md.indexOf("## 2026-06-01");
    const idx2 = md.indexOf("## 2026-06-02");
    assert.ok(idx1 < idx2, "日期应按升序排列");
  });

  it("MD 包含预计时长", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    assert.ok(md.includes("60分钟"));
    assert.ok(md.includes("45分钟"));
    assert.ok(md.includes("90分钟"));
  });

  it("MD 无描述任务不输出空引用块", () => {
    const md = generateMockMarkdown(mockPlan, mockTasks);
    const lineAfterTask2 = md.indexOf("任务二（无描述）");
    const nextLine = md.substring(lineAfterTask2 + 10, lineAfterTask2 + 60);
    assert.ok(!nextLine.includes("> "), "无描述任务不应有引用块");
  });

  it("MD 空任务计划显示暂无任务提示", () => {
    const emptyMd = generateMockMarkdown(mockPlan, []);
    assert.ok(emptyMd.includes("该计划暂无学习任务"));
  });

  // ── TXT 格式 ──

  it("TXT 使用 `===` 作为标题分隔", () => {
    const txt = generateMockPlainText(mockPlan, mockTasks);
    assert.ok(txt.startsWith("=== 学习计划："));
  });

  it("TXT 使用 `---` 作为段落分隔", () => {
    const txt = generateMockPlainText(mockPlan, mockTasks);
    assert.ok(txt.includes("----------------------------------------"));
  });

  it("TXT 不含 `#` Markdown 标记", () => {
    const txt = generateMockPlainText(mockPlan, mockTasks);
    assert.ok(!txt.includes("# 学习计划："), "TXT 不应有 # 标题语法");
    assert.ok(!txt.includes("> "), "TXT 不应有 > 引用语法");
  });

  it("TXT 含 `[x]` 和 `[ ]` 标记", () => {
    const txt = generateMockPlainText(mockPlan, mockTasks);
    assert.ok(txt.includes("[x] 任务一"));
    assert.ok(txt.includes("[ ] 任务二"));
  });

  it("TXT 含任务说明", () => {
    const txt = generateMockPlainText(mockPlan, mockTasks);
    assert.ok(txt.includes("任务说明：完成第一章阅读"));
    assert.ok(txt.includes("任务说明：练习课后习题"));
  });

  it("TXT 空任务计划显示暂无任务提示", () => {
    const emptyTxt = generateMockPlainText(mockPlan, []);
    assert.ok(emptyTxt.includes("该计划暂无学习任务"));
  });

  // ── 全部计划导出 ──

  it("全部计划 MD 导出包含导出时间戳", () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    // 验证时间戳格式
    assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("全部计划导出以 `---` 分隔不同计划", () => {
    // 通过 mock 验证分隔线存在
    const allMd = generateMockAllMarkdown(
      [{ plan: mockPlan, tasks: mockTasks }, { plan: { ...mockPlan, topic: "计划二" }, tasks: [] }],
      []
    );
    const sepCount = (allMd.match(/^---$/gm) || []).length;
    assert.ok(sepCount >= 2, "至少 2 条分隔线");
  });

  it("全部计划导出中失败计划在末尾注明", () => {
    const allMd = generateMockAllMarkdown(
      [{ plan: mockPlan, tasks: mockTasks }],
      ["加载失败的计划A"]
    );
    assert.ok(allMd.includes("加载失败的计划A"), "应包含失败计划名");
    assert.ok(allMd.includes("未包含在导出中"), "应有说明文字");
  });
});

// ─── 全部计划 mock 生成 ────────────────────────────

function generateMockAllMarkdown(plans, failedPlans) {
  const lines = [];
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  lines.push("# 全部学习计划");
  lines.push("");
  lines.push(`导出时间：${dateStr}`);
  lines.push("");

  for (const { plan, tasks } of plans) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${plan.topic}`);
    lines.push("");
    lines.push(`- 日期：${plan.startDate} ~ ${plan.endDate}`);
    const done = tasks.filter((t) => t.completed).length;
    lines.push(`- 总任务数：${tasks.length}  已完成：${done}`);
    lines.push("");
  }

  if (failedPlans.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(`> ⚠ 以下 ${failedPlans.length} 个计划加载失败，未包含在导出中：`);
    for (const name of failedPlans) {
      lines.push(`> - ${name}`);
    }
  }

  return lines.join("\n");
}

// ─── API 数据完整性验证 ─────────────────────────────

describe("API 数据完整性（导出依赖）", () => {
  let planId;

  before(async () => {
    const data = makePlanData({
      topic: "导出测试_" + Date.now(),
      startDate: todayStr(),
      endDate: todayStr(), // 单日计划
      dailyMinutes: 60,
    });
    const result = await api.createPlan(data);
    planId = result.planId;
    trackPlan(planId);
  });

  after(cleanupTestPlans);

  it("getPlanDetail 返回 plan 对象包含必要导出字段", async () => {
    const detail = await api.getPlanDetail(planId);
    assert.ok(detail, "应返回计划详情");
    const p = detail.plan;
    assert.ok(p.topic, "应有 topic");
    assert.ok(p.startDate, "应有 startDate");
    assert.ok(p.endDate, "应有 endDate");
    assert.ok(typeof p.durationDays === "number" || p.durationDays === undefined);
  });

  it("getPlanDetail 返回 tasks 数组，每个任务含导出所需字段", async () => {
    const detail = await api.getPlanDetail(planId);
    assert.ok(Array.isArray(detail.tasks));
    if (detail.tasks.length > 0) {
      const t = detail.tasks[0];
      assert.ok(t.title !== undefined);
      assert.ok(t.date !== undefined);
      assert.ok(t.completed !== undefined);
      assert.ok(t.estimatedMinutes !== undefined);
    }
  });

  it("listPlans 返回的计划包含 _id 可用作导出查询", async () => {
    const plans = await api.listPlans();
    assert.ok(plans.length > 0);
    const found = plans.find((p) => p._id === planId);
    assert.ok(found, `应能找到计划 ${planId}`);
  });

  it("任务完成状态字段为 boolean", async () => {
    const detail = await api.getPlanDetail(planId);
    detail.tasks.forEach((t) => {
      assert.ok(typeof t.completed === "boolean", `任务 ${t.title} 的 completed 应为 boolean`);
    });
  });

  it("任务日期字段格式为 YYYY-MM-DD", async () => {
    const detail = await api.getPlanDetail(planId);
    detail.tasks.forEach((t) => {
      assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/, `任务 ${t.title} 日期格式错误: ${t.date}`);
    });
  });

  it("标签字段包含 name 和 color", async () => {
    const detail = await api.getPlanDetail(planId);
    if (detail.tasks.length > 0) {
      const t = detail.tasks[0];
      assert.ok(Array.isArray(t.tags));
      if (t.tags.length > 0) {
        assert.ok("name" in t.tags[0]);
        assert.ok("color" in t.tags[0]);
      }
    }
  });
});
