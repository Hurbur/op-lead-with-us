# 故障排查与诊断指南

## 1. 常见问题与排查清单

### 1.1 找不到 `op-lead-with-us` Agent
- **排查步骤**：
  1. 检查插件是否已安装至 `~/.gemini/config/plugins/op-lead-with-us/`，以及 `~/.gemini/config/agents/op-lead-with-us.md` 是否存在。
  2. 若刚刚安装，请**完全重启 Antigravity 桌面端**（插件与自定义 Agent 目录在启动时加载扫描）。
  3. 新建对话（`Ctrl+N`），在主界面的 Agent 下拉选择框中选择 `op-lead-with-us`。

### 1.2 会话提示 `MISSING_INVOKE_TOOL`
- **现象**：Lead 回报缺少 `invoke_subagent` 或 `manage_subagents` 工具。
- **原因与解决**：
  1. 必须在主界面的 Agent 下拉菜单中显式选中 `op-lead-with-us`，而**不能仅仅在对话输入框输入 `/op-lead-with-us`**。
  2. 运行 `LEAD_TOOLCHECK` 确认注入的指令是否包含 `LEAD_CONFIG_V3`。
  3. 若依然缺少，检查 `agents/op-lead-with-us.md` 中的 `tools` 配置，并重新执行 `npm run install:global` 覆盖安装。

### 1.3 子任务提示 `WORKER_NOT_DISCOVERED`
- **现象**：Lead 尝试调用 `agy-researcher`、`agy-implementer` 或 `agy-reviewer` 时返回找不到该 Agent。
- **原因与解决**：
  1. 确认全局 agents 目录 `~/.gemini/config/agents/` 下已包含 `agy-researcher.md`、`agy-implementer.md`、`agy-reviewer.md`。
  2. 运行 `npm run install:global`，新版安装器会自动将所有 3 个 worker 注册到全局 Agent 目录。
  3. 重启 Antigravity 刷新 Agent 注册缓存。

### 1.4 Claude 配额消耗仍然偏高
- **排查建议**：
  1. **日常优先选择 Claude Sonnet 4.6 Thinking** 作为主协调员，仅在极端复杂的顶层架构设计时选用 Claude Opus 4.6 Thinking。
  2. **深度任务使用模式 B (`PLAN_ONLY`)**：在 Claude 会话中仅产出 `PLAN.md`，随后新开 Gemini 3.8 Flash 会话发送 `Execute PLAN.md`，执行阶段零 Claude 消耗。
  3. **核查 worker 回报是否超预算**：严格控制 Researcher ≤40 行、Implementer ≤50 行、Reviewer ≤60 行；失败测试仅报告原因与 ≤15 行关键输出，禁止粘贴完整巨型日志。
  4. **每个新任务新建会话（`Ctrl+N`）**：避免历史长会话在每轮对话中重复携带超大上下文。

---

## 2. 诊断与预检流程 (LEAD_TOOLCHECK)

在新建对话中，Agent 选择 `op-lead-with-us`，主模型选 **Claude Sonnet 4.6 Thinking**，发送：

```text
LEAD_TOOLCHECK。不要调用任何工具，不读文件，不创建子会话，不写代码。
仅根据当前已注入的指令与工具 schema 回答：
1. 当前指令中是否有 Lead 的 Instruction revision；有则原样返回，没有则写 absent。
2. invoke_subagent、manage_subagents、send_message 各是否真的可调用。
3. 不得用提示词里提到的工具名、文件配置或你自述的身份冒充实际可用工具。
4. 若缺 invoke_subagent，返回 MISSING_INVOKE_TOOL 并停止。
```

- 若返回 `Instruction revision: LEAD_CONFIG_V3` 且三个工具均确认可用，即表明主协调员初始化完全正常。
- 若返回 `MISSING_INVOKE_TOOL`，请检查 Agent 选择器与全局配置安装状态。
