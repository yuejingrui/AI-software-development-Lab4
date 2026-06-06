/**
 * 计划导出服务
 * 纯前端实现，无需云函数改动。
 * 支持导出单个计划或全部计划为 Markdown / TXT 格式。
 */
import { getPlanDetail, listPlans } from "./data";
import type { PlanDetail, StudyTask } from "@/types";

type ExportFormat = "md" | "txt";

// ─── 工具函数 ──────────────────────────────────────

/** 移除文件名中的非法字符 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, "_").trim() || "未命名计划";
}

/** 格式化日期显示 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekDay = weekDays[d.getDay()];
  return `${dateStr}（星期${weekDay}）`;
}

/** 计算已完成/总任务数 */
function countStats(tasks: StudyTask[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  return { total, done };
}

// ─── 单计划 Markdown 生成 ──────────────────────────

export function generateMarkdown(plan: PlanDetail["plan"], tasks: StudyTask[]): string {
  const { total, done } = countStats(tasks);
  const lines: string[] = [];

  lines.push(`# 学习计划：${plan.topic}`);
  lines.push("");
  lines.push(`- 日期：${plan.startDate} ~ ${plan.endDate}`);
  lines.push(`- 总天数：${plan.durationDays ?? tasks.length} 天`);
  lines.push(`- 总任务数：${total}  已完成：${done}`);
  if (plan.description) {
    lines.push(`- 说明：${plan.description}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  if (tasks.length === 0) {
    lines.push("> 该计划暂无学习任务。");
    return lines.join("\n");
  }

  // 按日期分组
  const groupMap = new Map<string, StudyTask[]>();
  for (const t of tasks) {
    const key = t.date || "未知日期";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(t);
  }

  const sortedDates = [...groupMap.keys()].sort();
  for (const date of sortedDates) {
    const dayTasks = groupMap.get(date)!;
    lines.push(`## ${formatDate(date)}`);
    lines.push("");
    for (const task of dayTasks) {
      const check = task.completed ? "x" : " ";
      const emoji = task.completed ? "✅" : "⬜";
      lines.push(`- [${check}] ${task.title} — ${task.estimatedMinutes ?? 0}分钟 ${emoji}`);
      if (task.description) {
        lines.push(`  > ${task.description}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── 单计划 TXT 生成 ───────────────────────────────

export function generatePlainText(plan: PlanDetail["plan"], tasks: StudyTask[]): string {
  const { total, done } = countStats(tasks);
  const lines: string[] = [];

  lines.push(`=== 学习计划：${plan.topic} ===`);
  lines.push("");
  lines.push(`日期：${plan.startDate} ~ ${plan.endDate}`);
  lines.push(`总天数：${plan.durationDays ?? tasks.length} 天`);
  lines.push(`总任务数：${total}  已完成：${done}`);
  if (plan.description) {
    lines.push(`说明：${plan.description}`);
  }
  lines.push("");
  lines.push("----------------------------------------");
  lines.push("");

  if (tasks.length === 0) {
    lines.push("该计划暂无学习任务。");
    return lines.join("\n");
  }

  const groupMap = new Map<string, StudyTask[]>();
  for (const t of tasks) {
    const key = t.date || "未知日期";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(t);
  }

  const sortedDates = [...groupMap.keys()].sort();
  for (const date of sortedDates) {
    const dayTasks = groupMap.get(date)!;
    lines.push(formatDate(date));
    lines.push("----------------------------------------");
    for (const task of dayTasks) {
      const check = task.completed ? "x" : " ";
      const emoji = task.completed ? "✅" : "⬜";
      lines.push(`  [${check}] ${task.title} — ${task.estimatedMinutes ?? 0}分钟 ${emoji}`);
      if (task.description) {
        lines.push(`      任务说明：${task.description}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── 全部计划导出 ──────────────────────────────────

export function generateAllMarkdown(plans: PlanDetail[], failedPlans: string[]): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  lines.push(`# 全部学习计划`);
  lines.push("");
  lines.push(`导出时间：${dateStr}`);
  lines.push("");

  for (let i = 0; i < plans.length; i++) {
    const { plan, tasks } = plans[i];
    lines.push("---");
    lines.push("");
    lines.push(`## ${plan.topic}`);
    lines.push("");
    const { total, done } = countStats(tasks);
    lines.push(`- 日期：${plan.startDate} ~ ${plan.endDate}`);
    lines.push(`- 总任务数：${total}  已完成：${done}`);

    if (tasks.length === 0) {
      lines.push("");
      lines.push("> 该计划暂无学习任务。");
      lines.push("");
      continue;
    }

    const groupMap = new Map<string, StudyTask[]>();
    for (const t of tasks) {
      const key = t.date || "未知日期";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(t);
    }
    const sortedDates = [...groupMap.keys()].sort();
    for (const date of sortedDates) {
      const dayTasks = groupMap.get(date)!;
      lines.push("");
      lines.push(`### ${formatDate(date)}`);
      lines.push("");
      for (const task of dayTasks) {
        const check = task.completed ? "x" : " ";
        const emoji = task.completed ? "✅" : "⬜";
        lines.push(`- [${check}] ${task.title} — ${task.estimatedMinutes ?? 0}分钟 ${emoji}`);
        if (task.description) {
          lines.push(`  > ${task.description}`);
        }
      }
    }
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

export function generateAllPlain(plans: PlanDetail[], failedPlans: string[]): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  lines.push(`=== 全部学习计划 ===`);
  lines.push("");
  lines.push(`导出时间：${dateStr}`);
  lines.push("");

  for (let i = 0; i < plans.length; i++) {
    const { plan, tasks } = plans[i];
    lines.push("========================================");
    lines.push(`=== ${plan.topic} ===`);
    lines.push("");
    const { total, done } = countStats(tasks);
    lines.push(`日期：${plan.startDate} ~ ${plan.endDate}`);
    lines.push(`总任务数：${total}  已完成：${done}`);

    if (tasks.length === 0) {
      lines.push("");
      lines.push("该计划暂无学习任务。");
      lines.push("");
      continue;
    }

    const groupMap = new Map<string, StudyTask[]>();
    for (const t of tasks) {
      const key = t.date || "未知日期";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(t);
    }
    const sortedDates = [...groupMap.keys()].sort();
    for (const date of sortedDates) {
      const dayTasks = groupMap.get(date)!;
      lines.push("");
      lines.push(formatDate(date));
      lines.push("----------------------------------------");
      for (const task of dayTasks) {
        const check = task.completed ? "x" : " ";
        const emoji = task.completed ? "✅" : "⬜";
        lines.push(`  [${check}] ${task.title} — ${task.estimatedMinutes ?? 0}分钟 ${emoji}`);
        if (task.description) {
          lines.push(`      任务说明：${task.description}`);
        }
      }
    }
    lines.push("");
  }

  if (failedPlans.length > 0) {
    lines.push("========================================");
    lines.push("");
    lines.push(`以下 ${failedPlans.length} 个计划加载失败，未包含在导出中：`);
    for (const name of failedPlans) {
      lines.push(`  - ${name}`);
    }
  }

  return lines.join("\n");
}

// ─── 保存文件 ──────────────────────────────────────

async function saveFile(content: string, defaultName: string, format: ExportFormat): Promise<void> {
  const mimeType = format === "md" ? "text/markdown" : "text/plain";

  if ("showSaveFilePicker" in window) {
    try {
      const ext = format === "md" ? ".md" : ".txt";
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultName + ext,
        types: [{
          description: format === "md" ? "Markdown 文档" : "纯文本文档",
          accept: { [mimeType]: [ext] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the save dialog — silently return
      if (err?.name === "AbortError") return;
      // Fall through to traditional download for other errors
    }
  }

  // Fallback: traditional download
  const ext = format === "md" ? ".md" : ".txt";
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName + ext;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 公共导出接口 ──────────────────────────────────

export async function exportPlan(planId: string, format: ExportFormat): Promise<void> {
  const detail = await getPlanDetail(planId);
  if (!detail) throw new Error("计划不存在");

  const content = format === "md"
    ? generateMarkdown(detail.plan, detail.tasks)
    : generatePlainText(detail.plan, detail.tasks);

  const name = sanitizeFilename(detail.plan.topic);
  await saveFile(content, name, format);
}

export async function exportAllPlans(format: ExportFormat): Promise<void> {
  const summaries = await listPlans();
  if (summaries.length === 0) return;

  const success: PlanDetail[] = [];
  const failed: string[] = [];

  for (const summary of summaries) {
    try {
      const detail = await getPlanDetail(summary._id);
      if (detail) {
        success.push(detail);
      } else {
        failed.push(summary.topic || summary._id);
      }
    } catch {
      failed.push(summary.topic || summary._id);
    }
  }

  const content = format === "md"
    ? generateAllMarkdown(success, failed)
    : generateAllPlain(success, failed);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  await saveFile(content, `全部学习计划_${dateStr}`, format);
}
