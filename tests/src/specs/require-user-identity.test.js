/**
 * require-user-identity 验收测试
 *
 * 映射自 .trae/specs/require-user-identity/checklist.md
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as api from "../api.js";
import { assertThrows, makePlanData, trackPlan, cleanupTestPlans } from "../utils.js";

describe("require-user-identity", () => {
  after(cleanupTestPlans);
  // ─── 必填验证 ──────────────────────────────────────

  it("创建计划表单将用户身份标记为必填项（缺失时云函数应拒绝）", async () => {
    const data = makePlanData();
    delete data.userProfile;
    await assertThrows(api.createPlan(data), "缺少必填字段");
  });

  it("用户未选择身份时（空type）无法提交计划", async () => {
    const data = makePlanData({ userProfile: { type: "", customText: "" } });
    await assertThrows(api.createPlan(data), "用户身份");
  });

  it("用户选择'其他'但未填写自定义身份时无法提交计划", async () => {
    const data = makePlanData({ userProfile: { type: "其他", customText: "" } });
    await assertThrows(api.createPlan(data), "自定义身份");
  });

  it("用户选择预设身份时可以正常提交", async () => {
    const data = makePlanData({ userProfile: { type: "学生", customText: "" } });
    const result = await api.createPlan(data);
    assert.ok(result.planId, "应返回 planId");
    trackPlan(result.planId);
  });

  it("选择'其他'并提供自定义身份时可以正常提交", async () => {
    const data = makePlanData({ userProfile: { type: "其他", customText: "自由职业者" } });
    const result = await api.createPlan(data);
    assert.ok(result.planId, "应返回 planId");
    trackPlan(result.planId);
  });

  it("AI 自动补全不会覆盖用户身份字段（创建时 userProfile 应来自用户输入）", async () => {
    const data = makePlanData({ userProfile: { type: "在职开发者", customText: "" } });
    const result = await api.createPlan(data);
    trackPlan(result.planId);
    const detail = await api.getPlanDetail(result.planId);
    assert.equal(detail.plan.userProfile.type, "在职开发者");
  });
});
