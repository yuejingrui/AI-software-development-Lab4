/**
 * study-plan-workbench 验收测试
 *
 * 映射自 .trae/specs/study-plan-workbench/checklist.md
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as api from "../api.js";
import {
  todayStr, dayAfter, assertArray, assertFields,
  assertThrows, makePlanData, trackPlan, trackTask,
  uniqueId,
} from "../utils.js";

describe("study-plan-workbench", () => {
  // 集中清理
  after(async () => {
    const { testState } = await import("../utils.js");
    for (const id of testState.createdPlanIds) {
      try { await api.deletePlan(id); } catch { /* ignore */ }
    }
  });

  // ═══════════════════════════════════════════════════════
  // 一、计划创建
  // ═══════════════════════════════════════════════════════

  describe("计划创建", () => {
    it("创建计划成功返回 planId 和 taskCount", async () => {
      const result = await api.createPlan(makePlanData());
      assert.ok(result.planId, "应返回 planId");
      assert.ok(typeof result.taskCount === "number", "应返回 taskCount");
      trackPlan(result.planId);
    });

    it("必填项 topic 为空时禁止提交", async () => {
      await assertThrows(
        api.createPlan(makePlanData({ topic: "" })),
        "缺少必填字段"
      );
    });

    it("结束日期早于开始日期时禁止提交", async () => {
      await assertThrows(
        api.createPlan(makePlanData({ startDate: dayAfter(5), endDate: todayStr() })),
        "结束日期不能早于"
      );
    });

    it("缺少 startDate 时禁止提交", async () => {
      const data = makePlanData();
      delete data.startDate;
      await assertThrows(api.createPlan(data), "缺少必填字段");
    });

    it("缺少 endDate 时禁止提交", async () => {
      const data = makePlanData();
      delete data.endDate;
      await assertThrows(api.createPlan(data), "缺少必填字段");
    });

    it("计划信息被保存到 study_plans 集合", async () => {
      const data = makePlanData();
      const result = await api.createPlan(data);
      trackPlan(result.planId);
      const detail = await api.getPlanDetail(result.planId);
      assert.ok(detail.plan, "应有 plan 对象");
      assert.equal(detail.plan.topic, data.topic);
      assert.equal(detail.plan.userProfile.type, data.userProfile.type);
    });

    it("逐日任务被保存到 study_tasks 集合", async () => {
      const data = makePlanData({ dailyMinutes: 60 });
      const result = await api.createPlan(data);
      trackPlan(result.planId);
      assert.ok(result.taskCount > 0, "应生成至少1个任务");
      // 验证任务可通过 getTasksByDate 查询
      const tasks = await api.getTasksByDate(data.startDate);
      assertArray(tasks, 1);
      const found = tasks.find((t) => t.planId === result.planId);
      assert.ok(found, "创建的任务应可通过日期查询到");
      tasks.forEach((t) => {
        if (t.planId === result.planId) trackTask(t.id);
      });
    });

    it("每日可用时长字段可保存", async () => {
      const data = makePlanData({ dailyMinutes: 90 });
      const result = await api.createPlan(data);
      trackPlan(result.planId);
      const detail = await api.getPlanDetail(result.planId);
      assert.equal(detail.plan.dailyMinutes, 90);
    });

    it("描述、参考资料、平台、预期成果、备注字段均可保存", async () => {
      const data = makePlanData({
        description: "测试描述",
        references: ["书A", "书B"],
        platforms: ["PC", "移动端"],
        expectedOutcome: "掌握该技能",
        notes: "测试备注",
      });
      const result = await api.createPlan(data);
      trackPlan(result.planId);
      const detail = await api.getPlanDetail(result.planId);
      assert.equal(detail.plan.description, "测试描述");
      assert.equal(detail.plan.references[0], "书A");
      assert.equal(detail.plan.platforms[0], "PC");
      assert.equal(detail.plan.expectedOutcome, "掌握该技能");
      assert.equal(detail.plan.notes, "测试备注");
    });
  });

  // ═══════════════════════════════════════════════════════
  // 三、多个计划管理
  // ═══════════════════════════════════════════════════════

  describe("多计划管理", () => {
    it("listPlans 可读取全部计划摘要", async () => {
      const plans = await api.listPlans();
      assertArray(plans);
      plans.forEach((p) => assertFields(p, [
        "_id", "topic", "startDate", "endDate", "tags", "totalTasks", "completedTasks", "status"
      ]));
    });

    it("多份计划可同时存在", async () => {
      const before = await api.listPlans();
      const r1 = await api.createPlan(makePlanData({ topic: uniqueId("multi1") }));
      trackPlan(r1.planId);
      const r2 = await api.createPlan(makePlanData({ topic: uniqueId("multi2") }));
      trackPlan(r2.planId);
      const after = await api.listPlans();
      assert.ok(after.length >= before.length + 2, "应新增 2 个计划");
    });

    it("创建第二份计划后旧计划数据不变", async () => {
      const r1 = await api.createPlan(makePlanData());
      trackPlan(r1.planId);
      const detail1 = await api.getPlanDetail(r1.planId);
      const r2 = await api.createPlan(makePlanData());
      trackPlan(r2.planId);
      const detail1Again = await api.getPlanDetail(r1.planId);
      assert.equal(detail1Again.plan.topic, detail1.plan.topic, "旧计划 topic 不应改变");
    });
  });

  // ═══════════════════════════════════════════════════════
  // 六、完成状态记录
  // ═══════════════════════════════════════════════════════

  describe("完成状态", () => {
    let taskId;
    let planId;

    before(async () => {
      const r = await api.createPlan(makePlanData());
      planId = r.planId;
      trackPlan(planId);
      const tasks = await api.getTasksByDate(todayStr());
      const t = tasks.find((x) => x.planId === planId);
      if (t) {
        taskId = t.id;
        trackTask(taskId);
      }
    });

    it("可勾选任务为完成", async () => {
      assert.ok(taskId, "需有任务");
      const r = await api.updateTaskStatus(taskId, true);
      assert.ok(r.success, "应返回 success:true");
    });

    it("可取消已完成状态", async () => {
      await api.updateTaskStatus(taskId, false);
      const tasks = await api.getTasksByDate(todayStr());
      const t = tasks.find((x) => x.id === taskId);
      assert.ok(t && !t.completed, "应已取消完成");
    });

    it("完成状态持久化（再次查询应保留）", async () => {
      await api.updateTaskStatus(taskId, true);
      const tasks = await api.getTasksByDate(todayStr());
      const t = tasks.find((x) => x.id === taskId);
      assert.ok(t && t.completed, "状态应已持久化");
      // reset
      await api.updateTaskStatus(taskId, false);
    });

    it("更新不存在的 taskId 应返回 success:false", async () => {
      const r = await api.updateTaskStatus("nonexistent_id_12345", true);
      assert.equal(r.success, false, "对不存在ID应返回 success:false");
    });
  });

  // ═══════════════════════════════════════════════════════
  // 七、任务动态调整
  // ═══════════════════════════════════════════════════════

  describe("任务动态调整", () => {
    let taskId;
    let planId;

    before(async () => {
      const r = await api.createPlan(makePlanData());
      planId = r.planId;
      trackPlan(planId);
      const tasks = await api.getTasksByDate(todayStr());
      const t = tasks.find((x) => x.planId === planId);
      if (t) taskId = t.id;
    });

    it("可手动修改任务标题", async () => {
      assert.ok(taskId, "需有任务");
      const r = await api.updateTaskInfo(taskId, { title: "修改后的标题" });
      assert.ok(r.success);
    });

    it("可手动修改任务说明", async () => {
      const r = await api.updateTaskInfo(taskId, { description: "新说明" });
      assert.ok(r.success);
    });

    it("可手动修改任务预计时长", async () => {
      const r = await api.updateTaskInfo(taskId, { estimatedMinutes: 120 });
      assert.ok(r.success);
    });

    it("更新不存在任务应返回 success:false", async () => {
      const r = await api.updateTaskInfo("fake_id_000", { title: "x" });
      assert.equal(r.success, false, "对不存在ID应返回 success:false");
    });
  });

  // ═══════════════════════════════════════════════════════
  // 八、异常处理
  // ═══════════════════════════════════════════════════════

  describe("异常处理", () => {
    it("calendar 无任务数据时返回空数组不报错", async () => {
      const cal = await api.getCalendarTasks("2019-01-01", "2019-01-31");
      assert.ok(Array.isArray(cal.days));
    });

    it("getTasksByDate 无任务的日期返回空数组", async () => {
      const tasks = await api.getTasksByDate("2019-01-01");
      assertArray(tasks);
      assert.equal(tasks.length, 0);
    });

    it("getPlanDetail 不存在计划应报错", async () => {
      await assertThrows(
        api.getPlanDetail("nonexistent_plan_9999"),
        "不存在"
      );
    });

    it("非法 action 应返回错误", async () => {
      await assertThrows(
        api.call("nonexistentAction", {}),
        ""
      );
    });
  });

  // ═══════════════════════════════════════════════════════
  // 计划删除
  // ═══════════════════════════════════════════════════════

  describe("计划删除", () => {
    it("删除计划成功返回 success:true", async () => {
      const r = await api.createPlan(makePlanData());
      const result = await api.deletePlan(r.planId);
      assert.ok(result.success);
    });

    it("删除不存在的计划应返回 success:true（idempotent）", async () => {
      // CloudBase .doc(nonexistent).remove() does not throw
      const result = await api.call("deletePlan", { planId: "nonexistent_plan_9999" });
      assert.ok(result.success, "CloudBase 删除不存在文档不抛错");
    });

    it("删除后 getPlanDetail 应报错", async () => {
      const r = await api.createPlan(makePlanData());
      await api.deletePlan(r.planId);
      await assertThrows(
        api.getPlanDetail(r.planId),
        "不存在"
      );
    });
  });
});
