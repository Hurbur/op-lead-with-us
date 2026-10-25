# 自包含任务包

主 Agent 用此模板为 worker 写初始提示；它们不会自动继承主对话历史。
占位符必须在调用前填好，不将花括号文本直接当作实际路径。

```text
Task ID: {stable-id}
Role: {agy-researcher | agy-implementer | agy-reviewer}
Objective: {具体目标}
Non-goals: {不做什么}
User requirements: {用户约束和验收语义}
Workspace: {绝对路径}
Read scope: {允许读取的范围}
Write scope: {允许写入的路径；调研/审查填 none；说明可接受的测试产物}
Repository instructions: {相关规则内容或绝对路径}
Existing edits / baseline: {预存改动、比较基线；不明则先检查，禁止 reset}
Interfaces: {输入输出约定、依赖和不可变约束}
Context: {调研结果、相关代码/设计文件；无需复制整个对话}
Acceptance commands: {每条命令 + 绝对工作目录 + 预期行为}
repair_cycles_remaining: {0..2；整体任务共享，初次实现为 2}
Previous attempts: {已尝试修复和消耗的轮数；首次填 none}
Stop conditions: {越界、缺权限、模型不可用、安全/数据风险、修复耗尽等}
Return: status, changed paths, commands + cwd + exit status + short evidence,
        checks not run, repair_cycles_used, risks, runtime model evidence or UNVERIFIED.
```

调研任务只能报告发现的测试命令为 NOT RUN。审查任务拿到实际改动与证据，不拿到“请确认无误”
一类诱导结论。实现报告的 repair_cycles_used 必须从总预算扣除，再派修复时携带剩余额度。

默认共享当前工作目录，单写入者；不要假设模型隔离自动提供文件隔离。
如果未来启用独立 worktree，另行设计整合/冲突处理和生命周期，不能直接沿用共享目录的成功判定。

## PLAN_ONLY 两阶段规划（省 Claude 额度）

需要深度规划但希望压缩 Claude 额度消耗时，在 Claude 会话（Sonnet 4.6 或 Opus 4.6）中发送 `PLAN_ONLY`。Lead 产出
`PLAN.md` 内容（不超过 120 行），包含：objective、compressed context、task packets
（角色/范围/验收命令）、risks、stop conditions。Lead 本身没有写文件工具：仅允许一次
`agy-implementer` 派发把 Lead 的原文转写成 PLAN.md（或由 Lead 在回复中输出、用户自行
保存）；不实现、不修复、不审查。
然后新建会话：主 Agent 仍选 `op-lead-with-us`，主模型选 Gemini 3.8 Flash，
发送 `Execute PLAN.md`，由 Flash workers 完成执行，Claude 不接触执行日志。

## 回报预算

researcher ≤40 行；implementer ≤50 行；reviewer ≤60 行。失败检查只回报原因和
至多 15 行关键输出；引用绝对路径与行号，不粘贴完整文件或日志。Lead 验收只看
审查结论、实现证据、diff 摘要与测试结论，不重读完整 diff 或仓库。
