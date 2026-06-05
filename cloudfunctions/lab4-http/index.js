const http = require("http");
const cloudbase = require("@cloudbase/node-sdk");

const app = cloudbase.init({ env: process.env.TCB_ENV_ID || "lab3-3-d5gdcm7qo10ced8af" });
const db = app.database();
const _ = db.command;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const PLANS_COLL = "study_plans";
const TASKS_COLL = "study_tasks";
const CHAT_COLL = "plan_chat_messages";
const SUBTASKS_COLL = "study_subtasks";
const TAG_COLORS = ["#3B82F6", "#22C55E", "#F97316", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F43F5E", "#14B8A6", "#EAB308", "#6366F1", "#EF4444"];

function getTagColor(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return TAG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function normalizeTagName(name) {
  return String(name || "").replace(/\s+/g, " ").trim().slice(0, 10);
}

function hasUserDefinedTags(planLike) {
  return (planLike?.tags && planLike.tags.length > 0) || false;
}

// --- Subject classification ---

const SUBJECT_KEYWORDS = [
  { pattern: /机器学习|深度学习|神经网络|强化学习|迁移学习|自然语言处理|计算机视觉|数据挖掘/, name: "机器学习" },
  { pattern: /前端|Vue|React|HTML|CSS|JavaScript|TS|TypeScript|Webpack|Vite/, name: "前端开发" },
  { pattern: /后端|Node\.?js|API|数据库|MySQL|Redis|MongoDB|SQL/, name: "后端开发" },
  { pattern: /算法|数据结构|LeetCode|竞赛|ACM/, name: "算法" },
  { pattern: /数学|高数|线代|概率|统计|微积分/, name: "数学" },
  { pattern: /英语|外语|雅思|托福|四六级|词汇|语法/, name: "英语" },
  { pattern: /物理|力学|电磁|光学|量子/, name: "物理" },
  { pattern: /化学|有机|无机|分析/, name: "化学" },
  { pattern: /生物|基因|细胞|分子/, name: "生物" },
  { pattern: /历史|近代|古代|世界/, name: "历史" },
  { pattern: /政治|马原|毛概|思修/, name: "政治" },
  { pattern: /编程|Python|Java|C\+\+|Go|Rust|开发|代码/, name: "编程" },
  { pattern: /操作系统|OS|Linux|网络|TCP|HTTP|计算机基础/, name: "计算机基础" },
  { pattern: /Android|iOS|移动开发|小程序|Flutter|React\s*Native/, name: "移动开发" },
];

function inferSubject(topic) {
  const raw = String(topic || "");
  for (const entry of SUBJECT_KEYWORDS) {
    if (entry.pattern.test(raw)) return entry.name;
  }
  const cleaned = raw.replace(/[Day\d:：]|\b(学习|计划|复习|备考|入门|进阶|掌握)\b/gi, "").trim();
  const fallback = normalizeTagName(cleaned) || "综合";
  return fallback.slice(0, 8);
}

function inferPurpose(planLike) {
  const profile = String(planLike?.userProfile?.type || "").trim();
  const custom = String(planLike?.userProfile?.customText || "").trim();
  const objective = String(planLike?.objective || "").trim();
  const outcome = String(planLike?.expectedOutcome || "").trim();

  if (/考研|备考|应试|考试|期末|竞赛/.test(profile + custom + objective + outcome)) return "应试备考";
  if (/项目|实战|开发|搭建/.test(profile + custom + objective + outcome)) return "项目实战";
  if (/自学|入门|初学|零基础/.test(profile + custom + objective + outcome)) return "系统学习";
  if (/在职|提升|补强|进阶/.test(profile + custom + objective + outcome)) return "能力提升";
  return "掌握知识";
}

function inferTaskType(taskTitle, taskDesc) {
  const text = `${taskTitle || ""} ${taskDesc || ""}`;
  if (/复习|回顾|回顾总结/.test(text)) return "复习";
  if (/预习|概述|了解|概念与背景/.test(text)) return "预习";
  if (/练习|动手|实战|实践|训练/.test(text)) return "练习";
  if (/案例|深入|应用/.test(text)) return "应用";
  if (/总结|整理/.test(text)) return "总结";
  if (/学习|掌握|基础理论/.test(text)) return "学习";
  return "学习";
}

function buildCategoryTag(name, category, source) {
  return {
    name: normalizeTagName(name),
    color: getTagColor(name),
    source: source || "ai",
    category
  };
}

function buildAutoTaskTags(task, planLike) {
  if (hasUserDefinedTags(planLike)) {
    return (planLike.tags || []).map((tag) => ({
      name: normalizeTagName(tag.name),
      color: tag.color || getTagColor(tag.name),
      source: "user",
      category: tag.category || "tag"
    }));
  }
  return [
    buildCategoryTag(inferSubject(planLike?.topic), "subject", "ai"),
    buildCategoryTag(inferPurpose(planLike), "purpose", "ai"),
    buildCategoryTag(inferTaskType(task?.title, task?.description), "taskType", "ai")
  ];
}

function resolvePlanTags(planLike) {
  if (hasUserDefinedTags(planLike)) {
    return (planLike.tags || []).map((tag) => ({ ...tag, source: "user" }));
  }
  return [{
    name: normalizeTagName(inferSubject(planLike?.topic)),
    color: getTagColor(inferSubject(planLike?.topic)),
    source: "ai",
    category: "subject"
  }];
}

function resolveTaskTags(task, planLike) {
  if (planLike?._hasUserTags) {
    return (planLike.tags || []).map((tag) => ({ ...tag, source: "user" }));
  }
  return buildAutoTaskTags(task, planLike);
}

function getSubjectTag(tags) {
  return (tags || []).find(tag => tag.category === "subject") || null;
}

function formatTaskNumber(task, fallbackIndex) {
  const existing = String(task?.taskNumber || "").trim();
  if (existing) return existing;

  const rawId = String(task?._id || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (rawId.length >= 4) {
    return `T-${rawId.slice(-4)}`;
  }

  return `T-${String((fallbackIndex || 0) + 1).padStart(4, "0")}`;
}

function getTaskGroupKey(task) {
  const titleKey = String(task?.title || "").trim().toLowerCase();
  const subjectTag = getSubjectTag(task?.tags);
  const tagName = (subjectTag?.name || "").toLowerCase();
  return `${titleKey}::${tagName}`;
}

function enrichTask(task, plan, index) {
  const tags = resolveTaskTags(task, plan);
  return {
    ...task,
    tags,
    taskNumber: formatTaskNumber(task, index),
    taskGroupKey: getTaskGroupKey({ ...task, tags })
  };
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.writeHead(statusCode);
  res.end(json, "utf8");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => { chunks.push(chunk); });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function formatDate(date) {
  return new Date(date).toISOString().split("T")[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function fallbackTasks(topic, startDate, endDate, dailyMinutes, tags) {
  const tasks = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  const templates = [
    { title: "了解核心概念与背景", desc: "阅读入门材料，建立整体认知框架", priority: "medium" },
    { title: "学习基础理论知识", desc: "掌握核心理论要点并做笔记", priority: "high" },
    { title: "动手实践练习", desc: "完成配套练习题，巩固理解", priority: "high" },
    { title: "深入案例学习", desc: "通过案例加深对知识点的理解", priority: "medium" },
    { title: "复习与总结", desc: "回顾所学内容，整理知识图谱", priority: "low" }
  ];

  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const template = templates[i % templates.length];
    tasks.push({
      date: formatDate(date),
      dayIndex: i + 1,
      title: `Day${i + 1}: ${template.title}`,
      description: template.desc,
      estimatedMinutes: dailyMinutes || 60,
      priority: template.priority,
      tags: [] // filled by enrichTask auto-generation
    });
  }

  return tasks;
}

async function callDeepSeek(messages) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 4096,
        temperature: 0.7
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

function safeJsonParse(content) {
  if (!content) return null;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function getExistingScheduleSummary(startDate, endDate) {
  try {
    const result = await db.collection(TASKS_COLL)
      .where({ date: _.gte(startDate).and(_.lte(endDate)) })
      .get();
    const tasks = result.data || [];
    if (tasks.length === 0) {
      return "当前时间范围内还没有其他学习安排。";
    }

    const grouped = new Map();
    for (const task of tasks) {
      if (!grouped.has(task.date)) grouped.set(task.date, []);
      grouped.get(task.date).push(task.title);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, titles]) => `${date}: ${titles.slice(0, 3).join("、")}${titles.length > 3 ? ` 等${titles.length}项` : ""}`)
      .join("\n");
  } catch {
    return "当前已有日程信息获取失败，可按一般学习强度进行建议。";
  }
}

async function getPlanById(planId) {
  const result = await db.collection(PLANS_COLL).doc(planId).get();
  const plan = Array.isArray(result.data) ? result.data[0] : result.data;
  return plan || null;
}

async function getPlanMap() {
  const result = await db.collection(PLANS_COLL).get();
  const plans = Array.isArray(result.data) ? result.data : [];
  const map = new Map();
  for (const plan of plans) {
    map.set(plan._id, {
      ...plan,
      _hasUserTags: hasUserDefinedTags(plan),
      tags: resolvePlanTags(plan)
    });
  }
  return map;
}

async function getValidPlanIds() {
  const result = await db.collection(PLANS_COLL).get();
  const plans = Array.isArray(result.data) ? result.data : [];
  return new Set(plans.map((p) => p._id));
}

async function filterOrphanTasks(tasks) {
  if (!tasks || tasks.length === 0) return tasks;
  const validPlanIds = await getValidPlanIds();
  return tasks.filter((task) => validPlanIds.has(task.planId));
}

async function handleCreatePlan(body) {
  if (!body.topic) throw new Error("缺少必填字段：topic");
  if (!body.startDate || !body.endDate) throw new Error("缺少必填字段：日期");
  if (!body.userProfile || !body.userProfile.type) throw new Error("缺少必填字段：用户身份");
  if (body.userProfile.type === "其他" && !String(body.userProfile.customText || "").trim()) {
    throw new Error("选择“其他”时必须填写自定义身份");
  }
  if (body.startDate > body.endDate) throw new Error("结束日期不能早于开始日期");

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  const durationDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  const tags = resolvePlanTags(body);

  const planDoc = {
    topic: body.topic,
    objective: body.objective || body.topic,
    startDate: body.startDate,
    endDate: body.endDate,
    durationDays,
    dailyMinutes: body.dailyMinutes || 60,
    description: body.description || "",
    references: body.references || [],
    platforms: body.platforms || [],
    userProfile: body.userProfile,
    expectedOutcome: body.expectedOutcome || "",
    tags,
    notes: body.notes || "",
    aiSupplement: null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const planResult = await db.collection(PLANS_COLL).add(planDoc);
  const planId = planResult.id || planResult._id;

  const generated = await handleGenerateTasks({
    ...body,
    tags,
    planId
  });

  const tasks = generated.tasks || fallbackTasks(body.topic, body.startDate, body.endDate, body.dailyMinutes, tags);
  await Promise.all(tasks.map((task, index) => {
    const enrichedTask = enrichTask(task, planDoc, index);
    return db.collection(TASKS_COLL).add({
    planId,
    date: task.date,
    dayIndex: task.dayIndex,
    title: task.title,
    description: task.description || "",
    estimatedMinutes: task.estimatedMinutes || body.dailyMinutes || 60,
    priority: task.priority || "medium",
    tags: enrichedTask.tags,
    taskNumber: enrichedTask.taskNumber,
    completed: false,
    editSource: "ai_generated",
    adjustmentNote: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
    });
  }));

  return {
    planId,
    taskCount: tasks.length,
    aiSupplement: generated.aiSupplement || null
  };
}

async function handleListPlans() {
  const result = await db.collection(PLANS_COLL).orderBy("createdAt", "desc").get();
  const plans = result.data || [];
  const summaries = [];

  for (const plan of plans) {
    const resolvedPlan = { ...plan, _hasUserTags: hasUserDefinedTags(plan), tags: resolvePlanTags(plan) };
    const tasksResult = await db.collection(TASKS_COLL).where({ planId: plan._id }).get();
    const tasks = tasksResult.data || [];
    summaries.push({
      _id: plan._id,
      topic: plan.topic,
      objective: plan.objective,
      startDate: plan.startDate,
      endDate: plan.endDate,
      tags: resolvedPlan.tags,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.completed).length,
      status: plan.status
    });
  }

  return summaries;
}

async function handleGetCalendarTasks(body) {
  const { startDate, endDate, selectedDate } = body;
  const result = await db.collection(TASKS_COLL)
    .where({ date: _.gte(startDate).and(_.lte(endDate)) })
    .get();
  let tasks = result.data || [];
  tasks = await filterOrphanTasks(tasks);
  const planMap = await getPlanMap();
  const dayMap = new Map();

  for (const task of tasks) {
    const plan = planMap.get(task.planId);
    if (!plan) continue;
    const effectiveTags = resolveTaskTags(task, plan);
    const subjectTag = getSubjectTag(effectiveTags);
    if (!dayMap.has(task.date)) {
      dayMap.set(task.date, { totalTasks: 0, completedTasks: 0, totalMinutes: 0, tags: [], tagSet: new Set() });
    }
    const day = dayMap.get(task.date);
    day.totalTasks += 1;
    if (task.completed) day.completedTasks += 1;
    day.totalMinutes += task.estimatedMinutes || 0;
    if (subjectTag && !day.tagSet.has(subjectTag.name)) {
      day.tagSet.add(subjectTag.name);
      day.tags.push(subjectTag);
    }
  }

  const days = Array.from(dayMap.entries()).map(([date, value]) => ({
    date,
    totalTasks: value.totalTasks,
    completedTasks: value.completedTasks,
    totalMinutes: value.totalMinutes,
    tags: value.tags,
    isSelected: date === selectedDate
  })).sort((a, b) => a.date.localeCompare(b.date));

  return { days };
}

async function handleGetTasksByDate(body) {
  const result = await db.collection(TASKS_COLL).where({ date: body.date }).get();
  let tasks = result.data || [];
  tasks = await filterOrphanTasks(tasks);
  const planMap = await getPlanMap();

  const enriched = tasks
    .map((task, index) => {
      const plan = planMap.get(task.planId);
      if (!plan) return null;
      const enrichedTask = enrichTask(task, plan, index);
      return {
        id: task._id,
        planId: task.planId,
        planTopic: plan.topic || "未知计划",
        title: task.title,
        description: task.description || "",
        estimatedMinutes: task.estimatedMinutes || 0,
        completed: !!task.completed,
        priority: task.priority || "medium",
        tags: enrichedTask.tags,
        taskNumber: enrichedTask.taskNumber,
        taskGroupKey: enrichedTask.taskGroupKey,
        editSource: task.editSource || "ai_generated"
      };
    })
    .filter(Boolean);

  const tasksWithSubtasks = await Promise.all(
    enriched.map(async (task) => {
      const subtaskResult = await db.collection(SUBTASKS_COLL)
        .where({ taskId: task.id })
        .orderBy("sortOrder", "asc")
        .get();
      return {
        ...task,
        subtasks: subtaskResult.data || []
      };
    })
  );

  return tasksWithSubtasks;
}

async function handleGetPlanDetail(body) {
  const plan = await getPlanById(body.planId);
  if (!plan) throw new Error("计划不存在");
  const tasksResult = await db.collection(TASKS_COLL).where({ planId: body.planId }).orderBy("dayIndex", "asc").get();
  const chatResult = await db.collection(CHAT_COLL).where({ planId: body.planId }).orderBy("createdAt", "asc").get();
  const resolvedPlan = { ...plan, _hasUserTags: hasUserDefinedTags(plan), tags: resolvePlanTags(plan) };
  const tasks = (tasksResult.data || []).map((task, index) => enrichTask(task, resolvedPlan, index));

  return {
    plan: resolvedPlan,
    tasks,
    chatMessages: chatResult.data || []
  };
}

async function handleUpdateTaskStatus(body) {
  const result = await db.collection(TASKS_COLL).doc(body.taskId).update({
    completed: !!body.completed,
    updatedAt: new Date().toISOString()
  });
  return { success: (result.updated || 0) > 0 };
}

async function handleUpdateTaskInfo(body) {
  const updateData = {
    updatedAt: new Date().toISOString(),
    editSource: "user_manual"
  };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.estimatedMinutes !== undefined) updateData.estimatedMinutes = body.estimatedMinutes;
  if (body.date !== undefined) updateData.date = body.date;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.tags !== undefined) updateData.tags = body.tags;

  const result = await db.collection(TASKS_COLL).doc(body.taskId).update(updateData);
  return { success: (result.updated || 0) > 0 };
}

async function handleSaveChatMessage(body) {
  const doc = {
    planId: body.planId,
    role: body.role,
    content: body.content,
    createdAt: new Date().toISOString()
  };
  const result = await db.collection(CHAT_COLL).add(doc);
  return {
    _id: result.id || result._id,
    ...doc
  };
}

async function handleGenerateTasks(body) {
  const {
    topic, startDate, endDate, dailyMinutes, description,
    references, userProfile, expectedOutcome, notes, tags
  } = body;

  const filledFields = [];
  if (!description || !String(description).trim()) filledFields.push("description");
  if (!expectedOutcome || !String(expectedOutcome).trim()) filledFields.push("expectedOutcome");
  if (!notes || !String(notes).trim()) filledFields.push("notes");

  const scheduleSummary = await getExistingScheduleSummary(startDate, endDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);

  if (!DEEPSEEK_API_KEY) {
    return {
      tasks: fallbackTasks(topic, startDate, endDate, dailyMinutes, tags),
      aiSupplement: filledFields.length > 0 ? {
        filledFields,
        source: "DeepSeek-V4-Flash",
        confirmedByUser: true
      } : null
    };
  }

  const systemPrompt = [
    "你是一个学习计划规划助手。",
    "你的任务是结合用户身份、学习目标、起止日期、每日时长和现有日程，生成合理的逐日学习任务。",
    "要尽量避免在已有学习安排密集的日期生成过重任务，优先给出均衡、可执行、循序渐进的计划。",
    "输出必须是严格 JSON 格式：",
    "{\"tasks\":[{\"dayIndex\":1,\"date\":\"YYYY-MM-DD\",\"title\":\"任务标题\",\"description\":\"任务说明\",\"estimatedMinutes\":60,\"priority\":\"low|medium|high\"}],\"notes\":\"建议备注\",\"description\":\"计划描述\",\"expectedOutcome\":\"预期成果\"}"
  ].join("\n");

  const userPrompt = [
    `学习主题：${topic}`,
    `日期范围：${startDate} 至 ${endDate}，共 ${days} 天`,
    `每日可用时长：${dailyMinutes || 60} 分钟`,
    `用户身份：${userProfile?.type || "未知"}${userProfile?.customText ? `（${userProfile.customText}）` : ""}`,
    `当前描述：${description || "未填写"}`,
    `当前预期成果：${expectedOutcome || "未填写"}`,
    `当前备注：${notes || "未填写"}`,
    `参考资料：${(references || []).join("、") || "未填写"}`,
    "当前日程摘要：",
    scheduleSummary
  ].join("\n");

  const content = await callDeepSeek([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);
  const parsed = safeJsonParse(content);

  return {
    tasks: parsed?.tasks || fallbackTasks(topic, startDate, endDate, dailyMinutes, tags),
    aiSupplement: filledFields.length > 0 ? {
      filledFields,
      source: "DeepSeek-V4-Flash",
      confirmedByUser: true
    } : null,
    description: parsed?.description || "",
    expectedOutcome: parsed?.expectedOutcome || "",
    notes: parsed?.notes || ""
  };
}

async function handleGenerateSubtasks(body) {
  const { taskId } = body;
  if (!taskId) throw new Error("缺少必填字段：taskId");

  const taskResult = await db.collection(TASKS_COLL).doc(taskId).get();
  const task = Array.isArray(taskResult.data) ? taskResult.data[0] : taskResult.data;
  if (!task) throw new Error("任务不存在");

  const plan = await getPlanById(task.planId);
  const planTopic = plan?.topic || "未知计划";

  await db.collection(SUBTASKS_COLL).where({
    taskId,
    source: "ai"
  }).remove();

  const prompt = `你是一个学习任务拆分助手。请根据以下任务信息，生成 3-5 个具体的、可逐个执行的小步骤。\n任务标题：${task.title}\n任务说明：${task.description || ""}\n所属计划：${planTopic}\n预计时长：${task.estimatedMinutes || 60} 分钟\n\n输出必须是严格 JSON 数组格式，每个元素包含 title 字段：\n[{"title": "步骤名称"}, ...]`;

  let subtaskList;
  if (DEEPSEEK_API_KEY) {
    try {
      const content = await callDeepSeek([
        { role: "user", content: prompt }
      ]);
      const match = content?.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          subtaskList = parsed;
        }
      }
    } catch {
      // fall through to fallback
    }
  }

  if (!subtaskList || !Array.isArray(subtaskList) || subtaskList.length === 0) {
    subtaskList = [
      { title: "阅读相关资料并做笔记" },
      { title: "完成配套练习" },
      { title: "总结关键知识点" }
    ];
  }

  const existingResult = await db.collection(SUBTASKS_COLL)
    .where({ taskId, source: "user" })
    .orderBy("sortOrder", "desc")
    .limit(1)
    .get();
  const existingSubtasks = existingResult.data || [];
  const maxSortOrder = existingSubtasks.length > 0 ? (existingSubtasks[0].sortOrder || 0) : 0;

  const newSubtasks = [];
  for (let i = 0; i < subtaskList.length; i++) {
    const sortOrder = maxSortOrder + i + 1;
    const doc = {
      taskId,
      planId: task.planId,
      title: subtaskList[i].title,
      completed: false,
      source: "ai",
      sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const result = await db.collection(SUBTASKS_COLL).add(doc);
    newSubtasks.push({
      _id: result.id || result._id,
      ...doc
    });
  }

  return { subtasks: newSubtasks };
}

async function handleCreateSubtask(body) {
  const { taskId, planId, title } = body;
  if (!taskId) throw new Error("缺少必填字段：taskId");
  if (!title) throw new Error("缺少必填字段：title");

  const existingResult = await db.collection(SUBTASKS_COLL)
    .where({ taskId })
    .orderBy("sortOrder", "desc")
    .limit(1)
    .get();
  const existing = existingResult.data || [];
  const maxSortOrder = existing.length > 0 ? (existing[0].sortOrder || 0) : 0;

  const doc = {
    taskId,
    planId: planId || "",
    title,
    completed: false,
    source: "user",
    sortOrder: maxSortOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const result = await db.collection(SUBTASKS_COLL).add(doc);
  const subtask = {
    _id: result.id || result._id,
    ...doc
  };

  return { subtask };
}

async function handleUpdateSubtask(body) {
  const { subtaskId, title } = body;
  if (!subtaskId) throw new Error("缺少必填字段：subtaskId");

  await db.collection(SUBTASKS_COLL).doc(subtaskId).update({
    title: title || "",
    updatedAt: new Date().toISOString()
  });

  return { success: true };
}

async function handleDeleteSubtask(body) {
  const { subtaskId } = body;
  if (!subtaskId) throw new Error("缺少必填字段：subtaskId");

  await db.collection(SUBTASKS_COLL).doc(subtaskId).remove();

  return { success: true };
}

async function handleUpdateSubtaskStatus(body) {
  const { subtaskId, completed } = body;
  if (!subtaskId) throw new Error("缺少必填字段：subtaskId");

  await db.collection(SUBTASKS_COLL).doc(subtaskId).update({
    completed: !!completed,
    updatedAt: new Date().toISOString()
  });

  return { success: true };
}

async function handleGetSubtasks(body) {
  const { taskId } = body;
  if (!taskId) throw new Error("缺少必填字段：taskId");

  const result = await db.collection(SUBTASKS_COLL)
    .where({ taskId })
    .orderBy("sortOrder", "asc")
    .get();
  const subtasks = result.data || [];

  return { subtasks };
}

async function handleRefinePlan(body) {
  const { planId, message } = body;
  if (!DEEPSEEK_API_KEY) {
    return { reply: `AI服务暂未配置，收到你的请求："${message}"`, proposedTaskChanges: [] };
  }

  const plan = await getPlanById(planId);
  const tasksResult = await db.collection(TASKS_COLL).where({ planId }).get();
  const taskSummary = (tasksResult.data || [])
    .map((task) => `Day${task.dayIndex}(${task.date}): ${task.title} [${task.completed ? "done" : "pending"}]`)
    .join("; ");

  const content = await callDeepSeek([
    { role: "system", content: "你是学习计划调整助手。请根据用户要求，结合现有任务安排给出简洁、可执行的中文建议。直接输出自然语言，不要输出JSON。" },
    { role: "user", content: `当前计划：${plan?.topic || "未知"}\n任务列表：${taskSummary}\n用户请求：${message}` }
  ]);

  return {
    reply: content || "已分析你的请求，建议稍后手动调整。",
    proposedTaskChanges: []
  };
}

async function handleSuggestCompletion(body) {
  const {
    topic, startDate, endDate, userProfileType, userProfileCustom,
    description, expectedOutcome, notes, dailyMinutes, references
  } = body;

  const filledFields = [];
  if (!description || !String(description).trim()) filledFields.push("description");
  if (!expectedOutcome || !String(expectedOutcome).trim()) filledFields.push("expectedOutcome");
  if (!notes || !String(notes).trim()) filledFields.push("notes");
  if (!dailyMinutes) filledFields.push("dailyMinutes");

  const scheduleSummary = (startDate && endDate)
    ? await getExistingScheduleSummary(startDate, endDate)
    : "未提供起止时间，无法分析已有日程冲突。";

  if (!DEEPSEEK_API_KEY) {
    const suggestions = {};
    if (filledFields.includes("description")) {
      suggestions.description = `这是一个关于${topic || "学习"}的学习计划，目标是在既有日程条件下循序渐进掌握相关知识。`;
    }
    if (filledFields.includes("expectedOutcome")) {
      suggestions.expectedOutcome = "能够建立系统知识框架，并完成基础应用或题目训练。";
    }
    if (filledFields.includes("notes")) {
      suggestions.notes = "建议每周至少安排一次回顾，并根据当天已有任务适当调整学习强度。";
    }
    if (filledFields.includes("dailyMinutes")) {
      suggestions.dailyMinutes = "60";
    }
    return { filledFields, suggestions, source: "fallback" };
  }

  const systemPrompt = [
    "你是一个学习计划表单补全助手。",
    "请根据用户已填写的信息和已有日程，给出有针对性的描述、备注、预期成果和建议每日时长。",
    "补全内容要具体、可执行，不要空泛。",
    "要考虑用户身份、学习主题、日期范围、现有日程负载和参考资料。",
    "输出必须是严格 JSON：",
    "{\"suggestions\":{\"description\":\"...\",\"expectedOutcome\":\"...\",\"notes\":\"...\",\"dailyMinutes\":\"60\"}}"
  ].join("\n");

  const userPrompt = [
    `学习主题：${topic || "未填写"}`,
    `开始日期：${startDate || "未填写"}`,
    `结束日期：${endDate || "未填写"}`,
    `用户身份：${userProfileType || "未填写"}${userProfileCustom ? `（${userProfileCustom}）` : ""}`,
    `当前描述：${description || "未填写"}`,
    `当前预期成果：${expectedOutcome || "未填写"}`,
    `当前备注：${notes || "未填写"}`,
    `当前每日时长：${dailyMinutes || "未填写"}`,
    `参考资料：${references || "未填写"}`,
    "当前已有日程摘要：",
    scheduleSummary,
    `请只补全以下缺失字段：${filledFields.join("、") || "无"}`
  ].join("\n");

  const content = await callDeepSeek([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);
  const parsed = safeJsonParse(content);
  const suggestions = parsed?.suggestions || {};

  if (filledFields.includes("description") && !suggestions.description) {
    suggestions.description = `这是一个关于${topic || "学习"}的学习计划，建议按已有安排合理分配时间，逐步掌握核心知识。`;
  }
  if (filledFields.includes("expectedOutcome") && !suggestions.expectedOutcome) {
    suggestions.expectedOutcome = "能够形成基础知识体系，并完成对应练习或小项目。";
  }
  if (filledFields.includes("notes") && !suggestions.notes) {
    suggestions.notes = "建议根据已有日程动态调整任务强度，并预留复习与查漏补缺时间。";
  }
  if (filledFields.includes("dailyMinutes") && !suggestions.dailyMinutes) {
    suggestions.dailyMinutes = "60";
  }

  return {
    filledFields,
    suggestions,
    source: "DeepSeek-V4-Flash"
  };
}

async function handleUpdatePlan(body) {
  const { planId, ...updates } = body;
  if (!planId) throw new Error("缺少必填字段：planId");

  const plan = await getPlanById(planId);
  if (!plan) throw new Error("计划不存在");

  const updateData = { updatedAt: new Date().toISOString() };

  if (updates.topic !== undefined) updateData.topic = updates.topic;
  if (updates.objective !== undefined) updateData.objective = updates.objective;
  if (updates.startDate !== undefined) {
    updateData.startDate = updates.startDate;
    if (updates.endDate !== undefined || plan.endDate) {
      const start = new Date(updates.startDate);
      const end = new Date(updates.endDate || plan.endDate);
      updateData.durationDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
    }
  }
  if (updates.endDate !== undefined) {
    updateData.endDate = updates.endDate;
    const start = new Date(updates.startDate || plan.startDate);
    const end = new Date(updates.endDate);
    updateData.durationDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  }
  if (updates.dailyMinutes !== undefined) updateData.dailyMinutes = updates.dailyMinutes;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.references !== undefined) updateData.references = updates.references;
  if (updates.platforms !== undefined) updateData.platforms = updates.platforms;
  if (updates.userProfile !== undefined) updateData.userProfile = updates.userProfile;
  if (updates.expectedOutcome !== undefined) updateData.expectedOutcome = updates.expectedOutcome;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.status !== undefined) updateData.status = updates.status;

  const result = await db.collection(PLANS_COLL).doc(planId).update(updateData);
  return { success: (result.updated || 0) > 0 };
}

async function handleDeletePlan(body) {
  const { planId } = body;
  if (!planId) throw new Error("缺少必填字段：planId");

  // 删除关联任务
  const taskResult = await db.collection(TASKS_COLL).where({ planId }).remove();
  // 删除关联聊天
  await db.collection(CHAT_COLL).where({ planId }).remove();
  // 删除计划本身
  await db.collection(PLANS_COLL).doc(planId).remove();

  return { success: true, deletedTasks: taskResult.deleted || 0 };
}

async function handleCleanupOrphanTasks() {
  const allTasks = await db.collection(TASKS_COLL).get();
  const tasks = allTasks.data || [];
  const validPlanIds = await getValidPlanIds();
  const orphanIds = tasks
    .filter((task) => !validPlanIds.has(task.planId))
    .map((task) => task._id);

  if (orphanIds.length === 0) {
    return { success: true, cleaned: 0, message: "没有孤儿任务" };
  }

  // 批量删除孤儿任务
  const batchSize = 50;
  let cleaned = 0;
  for (let i = 0; i < orphanIds.length; i += batchSize) {
    const batch = orphanIds.slice(i, i + batchSize);
    await Promise.all(batch.map((id) => db.collection(TASKS_COLL).doc(id).remove()));
    cleaned += batch.length;
  }

  return { success: true, cleaned, message: `已清理 ${cleaned} 个孤儿任务` };
}

const ACTIONS = {
  createPlan: handleCreatePlan,
  listPlans: handleListPlans,
  getCalendarTasks: handleGetCalendarTasks,
  getTasksByDate: handleGetTasksByDate,
  getPlanDetail: handleGetPlanDetail,
  updateTaskStatus: handleUpdateTaskStatus,
  updatePlan: handleUpdatePlan,
  updateTaskInfo: handleUpdateTaskInfo,
  saveChatMessage: handleSaveChatMessage,
  generateTasks: handleGenerateTasks,
  generateSubtasks: handleGenerateSubtasks,
  createSubtask: handleCreateSubtask,
  updateSubtask: handleUpdateSubtask,
  deleteSubtask: handleDeleteSubtask,
  updateSubtaskStatus: handleUpdateSubtaskStatus,
  getSubtasks: handleGetSubtasks,
  refinePlan: handleRefinePlan,
  suggestCompletion: handleSuggestCompletion,
  deletePlan: handleDeletePlan,
  cleanupOrphanTasks: handleCleanupOrphanTasks
};

const ROUTES = {
  "POST /createPlan": handleCreatePlan,
  "POST /listPlans": handleListPlans,
  "POST /getCalendarTasks": handleGetCalendarTasks,
  "POST /getTasksByDate": handleGetTasksByDate,
  "POST /getPlanDetail": handleGetPlanDetail,
  "POST /updateTaskStatus": handleUpdateTaskStatus,
  "POST /updatePlan": handleUpdatePlan,
  "POST /updateTaskInfo": handleUpdateTaskInfo,
  "POST /saveChatMessage": handleSaveChatMessage,
  "POST /generateTasks": handleGenerateTasks,
  "POST /generateSubtasks": handleGenerateSubtasks,
  "POST /createSubtask": handleCreateSubtask,
  "POST /updateSubtask": handleUpdateSubtask,
  "POST /deleteSubtask": handleDeleteSubtask,
  "POST /updateSubtaskStatus": handleUpdateSubtaskStatus,
  "POST /getSubtasks": handleGetSubtasks,
  "POST /refinePlan": handleRefinePlan,
  "POST /suggestCompletion": handleSuggestCompletion,
  "POST /deletePlan": handleDeletePlan,
  "POST /cleanupOrphanTasks": handleCleanupOrphanTasks
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = url.pathname;
  const method = (req.method || "GET").toUpperCase();

  if (method === "GET" && pathname === "/health") {
    sendJson(res, 200, { ok: true, env: process.env.TCB_ENV_ID || "unknown" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const routeHandler = ROUTES[`${method} ${pathname}`];
    const actionHandler = pathname === "/" ? ACTIONS[body.action] : null;
    const handler = routeHandler || actionHandler;

    if (!handler) {
      sendJson(res, 404, { error: "Not Found", path: pathname, method, action: body.action || null });
      return;
    }

    const result = await handler(body);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Bad Request" });
  }
});

server.listen(9000, () => {
  console.log("lab4-http server listening on port 9000");
});
