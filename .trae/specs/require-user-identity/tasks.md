# Tasks

- [ ] Task 1: 更新规格中的表单必填约束
  - [ ] SubTask 1.1: 将“用户身份”从选填调整为必填
  - [ ] SubTask 1.2: 明确“其他”选项需要填写自定义身份内容
  - [ ] SubTask 1.3: 明确 AI 补全不再覆盖用户身份字段

- [ ] Task 2: 更新前端创建计划表单行为
  - [ ] SubTask 2.1: 调整表单 UI，突出用户身份为必填项
  - [ ] SubTask 2.2: 增加“未选择身份”和“选择其他但未填写”的校验提示
  - [ ] SubTask 2.3: 确认提交前的 AI 补全逻辑跳过用户身份

- [ ] Task 3: 更新后端计划创建校验
  - [ ] SubTask 3.1: 在创建计划云函数中校验用户身份字段
  - [ ] SubTask 3.2: 对非法请求返回明确错误信息

- [ ] Task 4: 更新验证项
  - [ ] SubTask 4.1: 补充“用户身份必填”的验收检查点
  - [ ] SubTask 4.2: 补充“AI 不补全用户身份”的验收检查点

# Task Dependencies

- [ ] Task 2 depends on Task 1
- [ ] Task 3 depends on Task 1
- [ ] Task 4 depends on Task 1
