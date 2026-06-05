# Lab4 自动化验收测试

基于 `.trae/specs/` 目录下全部 spec 的 `checklist.md` 编写的自动化 API 验收测试套件。

## 覆盖的 Spec

| Spec | 源 Checklist | 测试文件 |
|------|-------------|---------|
| 学习计划工作台 | `study-plan-workbench/checklist.md` | `src/specs/study-plan-workbench.test.js` |
| 用户身份必填 | `require-user-identity/checklist.md` | `src/specs/require-user-identity.test.js` |
| 统一日历增强 | `unified-calendar-enhance/checklist.md` | `src/specs/unified-calendar-enhance.test.js` |
| 每日详情页 | `daily-detail-view/checklist.md` | `src/specs/daily-detail-view.test.js` |

## 前置条件

- Node.js >= 18.15（使用内置 `node:test` 和 `node:assert`，无需额外安装依赖）
- 已部署的 CloudBase 云函数 `lab4-http`（可通过环境变量 `CLOUDBASE_FUNCTION_URL` 自定义地址）

## 运行

### 运行全部测试

```bash
cd tests
node --test src/run.js
```

### 运行单个 spec

```bash
cd tests
node --test src/specs/require-user-identity.test.js
node --test src/specs/study-plan-workbench.test.js
node --test src/specs/unified-calendar-enhance.test.js
node --test src/specs/daily-detail-view.test.js
```

### 详细输出（按用例列出）

```bash
cd tests
node --test --test-reporter=spec src/run.js
```

### 自定义云函数地址

```bash
# 指定其他环境
$env:CLOUDBASE_FUNCTION_URL="https://other-env.service.tcloudbase.com/api/lab4-http"
node --test src/run.js
```

## 目录结构

```
tests/
├── README.md
├── package.json          # "type": "module"，零依赖
├── src/
│   ├── run.js            # 入口：导入全部 spec 测试
│   ├── api.js            # HTTP API 客户端，封装全部云函数调用
│   ├── utils.js          # 断言工具 / 日期工具 / 测试数据工厂 / 状态追踪
│   └── specs/
│       ├── require-user-identity.test.js
│       ├── study-plan-workbench.test.js
│       ├── unified-calendar-enhance.test.js
│       └── daily-detail-view.test.js
```

## 测试范围

- **API 层验收**：调用已部署的云函数 HTTP 接口，验证请求/响应格式、字段完整性、错误码
- **数据持久化**：验证创建 → 查询 → 修改 → 删除的完整生命周期
- **边界与异常**：缺失必填字段、非法输入、不存在的 ID、空数据场景
- **错误消息验证**：所有预期抛错的地方都检查具体错误信息是否与预期相符

## 注意事项

1. 测试会**创建真实的计划、任务和子任务**到 CloudBase 数据库中，运行结束后会自动清理（删除测试计划及其关联数据）
2. 部分 UI 相关验收项（如颜色、样式、路由跳转）无法通过 API 测试覆盖，需手工验收
3. `generateSubtasks` 测试依赖 DeepSeek API，若 API 不可用则使用 fallback 模板子任务
