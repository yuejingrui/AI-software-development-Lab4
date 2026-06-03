---
name: "git_commit"
description: "Helps craft safe, atomic commits and high-quality commit messages. Invoke when user asks to commit, write a commit message, split commits, or prepare changes for PR."
---

# Git Commit

当用户需要提交代码（写 commit message、拆分提交、整理提交历史、准备 PR）时使用此技能。默认以安全与可回滚为优先：原子提交、可读信息、不泄露敏感信息。

## 1) 提交前检查（原则）

- 变更是否聚焦单一意图？不是就拆分
- 是否包含不该提交的内容（密钥、日志、临时文件、build 产物）？
- 能否复现/验证：至少能运行项目的 lint/typecheck/test（以仓库脚本为准）

## 2) 原子提交拆分策略

常见拆分维度：

- 纯重构 vs 行为变更分开
- 格式化/机械性改动单独提交
- 依赖升级单独提交
- 生成文件与源码分离（除非项目约定必须一起）

如果同一文件里混了两类改动：

- 先把无关改动撤回到未暂存区，再分批暂存（按块 staging）

## 3) Commit message（推荐 Conventional Commits）

格式：

- `<type>(<scope>): <summary>`
- 可选 body：解释原因与取舍
- 可选 footer：BREAKING CHANGE、关联 issue

常用 type：

- feat: 新功能
- fix: 修复 bug
- refactor: 重构（不改变外部行为）
- perf: 性能优化
- test: 测试相关
- docs: 文档（仅当确实是文档改动）
- chore: 构建/工具/依赖等杂项

summary 规则：

- 用现在时动词开头（Add/Fix/Refactor）
- 50–72 字符内
- 不以句号结尾

示例：

- `fix(auth): handle token refresh race`
- `feat(ui): add empty-state for search results`
- `refactor(api): centralize error mapping`

## 4) 我需要哪些输入（最少）

如果用户没给信息，先让用户粘贴：

- 变更摘要（1–3 句）
- 影响范围（模块/页面/接口）
- 关键行为变化（Before/After）

基于这些生成 3–5 个候选 message，并推荐一个最合适的。

## 5) 常见操作建议（按需输出命令）

- 新提交：先确认状态与差异，再暂存，再提交
- 拆分提交：按块暂存，分多次提交
- 修正提交：如果只是 message/小遗漏，建议 amend
- 清理历史：在本地用交互式 rebase 合并/改写，再推送（避免影响他人分支）

输出时默认给出“最安全的选择”，并提醒可能的协作风险（例如改写已共享分支历史）。

