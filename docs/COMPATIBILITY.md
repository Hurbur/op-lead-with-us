# 兼容性与验证边界

核查日期：2026-10-25（CachyOS Linux / Antigravity 2.21.1）。

## 已核实环境与架构

- **宿主环境**：CachyOS Linux (Kernel 7.2.9-2-cachyos, x86_64, Node.js v24.22.0, npm 12.2.1, git 2.56.0, gh 2.94.0)。
- **应用版本**：独立 Google Antigravity Agent App 2.21.1（基于 Electron 34+ / ConnectRPC / LanguageServer）。
- **语言服务器**：`/opt/antigravity/resources/bin/language_server --standalone --override_ide_version 2.21.1`，健康状态正常（`{"status":"ok"}`）。
- **配额体系核实**：通过 `RetrieveUserQuotaSummary` 接口核实官方两组配额桶：
  1. `Gemini Models`（含 Gemini Flash, Gemini Pro），独立周配额与 5 小时刷新配额。
  2. `Claude and GPT models`（含 Claude Opus, Claude Sonnet, GPT-OSS），独立周配额与 5 小时刷新配额。
  3. `flash` 档位解析至 `Gemini 3.8 Flash`；`inherit` 继承主会话模型。
- **支持的主协调员模型**：
  - **Claude Sonnet 4.6 Thinking**：日常首选协调员，响应极速，推理严密，低配额消耗。
  - **Claude Opus 4.6 Thinking**：高难度复杂架构、深层次疑难排查与高风险审查。
  - **Gemini 3.8 Flash**：执行 Mode B（`Execute PLAN.md`）与纯简易任务。
- **支持的子任务 Worker 模型**：
  - **Gemini 3.8 Flash**（`model: flash`）：3 个原生子 Agent：
    - `agy-researcher`：只读调研员（`tools: view_file, grep_search`，汇报预算 ≤40 行）。
    - `agy-implementer`：代码执行员（`tools: view_file, grep_search, write_to_file, replace_file_content, run_command`，汇报预算 ≤50 行，最多 2 轮自主修复）。
    - `agy-reviewer`：独立审查员（`tools: view_file, grep_search, run_command`，汇报预算 ≤60 行，独立跑测复查 diff）。
- **原生委派机制**：
  - 依赖 Antigravity 原生 `invoke_subagent`、`manage_subagents`、`send_message`。
  - 零外部 CLI（不依赖 Claude Code CLI、Codex CLI、agy CLI、第三方反向代理或付费外部 API）。
- **安装与发现机制**：
  - 工作区级：`.agents/plugins/op-lead-with-us/`（由 `npm run stage` 自动同步）。
  - 全局配置级：`~/.gemini/config/plugins/op-lead-with-us/` 及 `~/.gemini/config/agents/`（由 `npm run install:global` 部署并自动创建带时间戳的安全备份）。

## 运行模式定义

1. **模式 A：Claude 主导全流程 (Claude-Led Orchestration)**
   - Claude (Sonnet 4.6 / Opus 4.6) 全程主导；
   - 任务拆解 -> Researcher 调研 (可选) -> Implementer 编码与测跑 -> Reviewer 独立复核 -> Implementer 修订 (≤2 轮) -> Claude 依据精简摘要验收。
   - Claude 绝不重读全部源码、大文件或冗长终端测试日志。

2. **模式 B：额度节约两阶段 (PLAN_ONLY Execution)**
   - 第一阶段：在 Claude 会话中输入 `PLAN_ONLY <任务描述>`，Claude 产出 ≤120 行的自包含 `PLAN.md`（由一次 implementer 原文写入或直接输出），随后 Claude 会话终止。
   - 第二阶段：新开 Antigravity 会话（Agent 选 `op-lead-with-us`，模型选 **Gemini 3.8 Flash**），发送 `Execute PLAN.md`。整个实现、测试与审查过程零 Claude Token 消耗。

## 行为安全与权限边界

- **无越权修改**：严禁自动 `git commit`、`git push`、生产环境部署、敏感凭证探测或破坏性文件系统操作。
- **并发控制**：默认最多 2 个并发激活的 worker；单一重叠路径仅允许单一 writer。
- **报告限额**：强制执行报告行数预算，阻止子会话大量代码日志淹没协调员上下文。
- **真实模型凭证**：模型自述不可作为底层运行凭证。若无底层会话元数据或 App 卡片官方标识，路由状态统一标记为 `UNVERIFIED`，确保诚实审计。
