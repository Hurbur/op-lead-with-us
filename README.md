<p align="center">
  <img src="assets/banner.svg" width="100%" alt="op-lead-with-us">
</p>

<p align="center">
  <a href="#english">English</a> | <a href="#-简体中文">简体中文</a>
</p>

<p align="center">
  <a href="https://antigravity.google"><img src="https://img.shields.io/badge/platform-Google%20Antigravity-4285F4?style=flat-square&logo=google" alt="Antigravity"></a>
  <img src="https://img.shields.io/badge/lead-Claude%20Sonnet%204.6%20%2F%20Opus%204.6%20Thinking-D97706?style=flat-square&logo=anthropic" alt="Claude Lead">
  <img src="https://img.shields.io/badge/workers-Gemini%203.8%20Flash-34A853?style=flat-square&logo=google" alt="Gemini Flash">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/dependencies-zero%20external-7C3AED?style=flat-square" alt="Zero Dependencies">
</p>

<p align="center">
  <b>Hire Gemini 3.8 Flash as staff for Claude (Sonnet 4.6 / Opus 4.6 Thinking) — natively inside Google Antigravity.</b><br>
  Claude plans, guides, and accepts. Gemini Flash explores, writes, and tests. Zero external CLI or third-party proxies required.
</p>

<p align="center">
  <b><a href="#quick-start">Quick Start</a> · <a href="#two-operating-modes">Operating Modes</a> · <a href="#roles">Roles</a> · <a href="#architecture">Architecture</a> · <a href="#license">License</a></b>
</p>

<p align="center">
  <img src="assets/1.png" width="50%" alt="op-lead-with-us">
</p>
---

<a name="english"></a>
## What & Why

**`op-lead-with-us`** is an Antigravity-native multi-model orchestration plugin.

Claude (Sonnet 4.6 Thinking and Opus 4.6 Thinking) provides industry-leading reasoning, system architecture, and review capabilities. However, consuming Claude quota on routine codebase exploration, repetitive line-by-line editing, and running unit tests rapidly depletes subscription allowances.

This plugin establishes an automated division of labor directly inside Antigravity:
* **Claude Coordinators (`model: inherit`)**:
  - **Claude Sonnet 4.6 Thinking**: Recommended for standard daily coordination, task breakdown, delegation, and final acceptance. Fast, capable, and quota-efficient.
  - **Claude Opus 4.6 Thinking**: Recommended for difficult architectural design, high-stakes system reviews, or complex multi-component refactors.
* **Gemini 3.8 Flash Workers (`model: flash`)**:
  - Three dedicated subagents handle all high-token workloads: codebase reconnaissance, editing files, running local test suites, and conducting independent verification.

**Core Benefits:**
* **Preserve Claude Quota**: Heavy token operations (reading entire files, executing tests, debugging loops) are offloaded to Gemini 3.8 Flash.
* **Zero External Dependencies**: Pure Antigravity native (`invoke_subagent`). No paid third-party API keys, no Claude Code CLI, no Codex CLI, no network proxies.
* **Clean Context Window**: Routine test logs, terminal outputs, and file dumps remain isolated in worker subagent conversations.
* **Deterministic Bounds**: Bounded concurrency (max 2 active workers), bounded repair budget (max 2 repair cycles), and strict report line limits (researcher ≤40, implementer ≤50, reviewer ≤60 lines).

---

<a name="two-operating-modes"></a>
## Two Operating Modes

### Mode A — Claude-Led Orchestration
Claude remains the primary coordinator throughout the task.
1. Claude receives the user prompt and establishes acceptance criteria.
2. `agy-researcher` (Gemini Flash) surveys relevant interfaces and tests (read-only, ≤40 lines report).
3. Claude drafts a compact plan and task packets.
4. `agy-implementer` (Gemini Flash) writes/edits files using `write_to_file` / `replace_file_content` and runs tests via `run_command` (≤50 lines report).
5. `agy-reviewer` (Gemini Flash) independently inspects git diffs and verifies tests (≤60 lines report).
6. `agy-implementer` fixes confirmed defects within a strict budget of at most 2 repair cycles.
7. Claude evaluates compact evidence summaries and makes the final acceptance decision.

### Mode B — Quota-Saving Execution (`PLAN_ONLY`)
Maximizes Claude quota conservation by separating planning from execution.
1. In a Claude conversation, user requests `PLAN_ONLY <task description>`.
2. Claude surveys minimally and generates a self-contained, durable implementation plan `PLAN.md` (≤120 lines).
3. A single `agy-implementer` dispatch transcribes the verbatim plan into `PLAN.md` (or Claude prints it in chat). Claude does not implement or run tests.
4. User opens a **fresh conversation** in Antigravity:
   - Agent: `op-lead-with-us`
   - Model: **Gemini 3.8 Flash**
   - Prompt: `Execute PLAN.md`
5. The Gemini Flash coordinator executes the plan using Gemini Flash subagents. Zero Claude tokens are spent during execution, debugging, or test verification.

---

## Roles

| Persona | Identifier | Model Setting | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Lead Architect** | `op-lead-with-us` | `inherit` (Claude Sonnet 4.6 / Opus 4.6) | High-level planning, task breakdown, evidence evaluation, acceptance. No direct file edits or test execution. |
| **Researcher** | `agy-researcher` | `flash` (Gemini 3.8 Flash) | Read-only codebase reconnaissance, dependency mapping, finding interfaces. No code edits or shell execution. |
| **Implementer** | `agy-implementer` | `flash` (Gemini 3.8 Flash) | Code creation (`write_to_file`), editing (`replace_file_content`), test execution (`run_command`). Max 2 repair cycles. |
| **Reviewer** | `agy-reviewer` | `flash` (Gemini 3.8 Flash) | Independent audit of diffs, untracked files, and test reproduction against acceptance criteria. No code modifications. |

---

## Architecture

```
                       [ User Prompt ]
                              │
                              ▼
           ┌─────────────────────────────────────┐
           │      Claude 4.6 Coordinator         │
           │         op-lead-with-us             │
           │  Architecture, Plan, Task Packet    │
           └──────────────────┬──────────────────┘
                              │ invoke_subagent
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  [ agy-researcher ]   [ agy-implementer ]   [ agy-reviewer ]
   (Gemini 3.8 Flash)   (Gemini 3.8 Flash)   (Gemini 3.8 Flash)
   Read-only survey     Code edits & tests   Independent audit
```

---

<a name="quick-start"></a>
## Quick Start

### 1. Install Globally (Machine-Wide)

Clone your fork and run the safe global installer:

```bash
git clone https://github.com/Hurbur/op-lead-with-us.git
cd op-lead-with-us
npm run install:global
```

*The installer automatically creates a timestamped backup before modifying any existing installation in `~/.gemini/config/plugins/` or `~/.gemini/config/agents/`.*

To uninstall cleanly at any time:
```bash
npm run uninstall:global
```

### 2. Workspace-Local Staging (Alternative)

If you prefer testing without modifying global settings:
```bash
npm run stage
```
This stages the plugin into `.agents/plugins/op-lead-with-us/` within your workspace.

### 3. Run in Antigravity Desktop App

1. Open or restart **Google Antigravity**.
2. Start a **New Conversation** (`Ctrl+N`).
3. In the **Agent selector**, choose **`op-lead-with-us`**.
4. In the **Model selector**, choose your desired coordinator:
   - **Claude Sonnet 4.6 Thinking**: Recommended for standard tasks, planning, and delegation.
   - **Claude Opus 4.6 Thinking**: Recommended for complex architecture or deep review.
   - **Gemini 3.8 Flash**: For Mode B (`Execute PLAN.md`) or simple tasks.
5. Send your prompt and watch native subagent delegation in action!

---

## Verification & Tests

The plugin includes an offline test suite validating schemas, model routing constraints, and staging safeguards:

```bash
npm run validate   # Check manifest, frontmatter, and agent declarations
npm test           # Run 31 automated regression tests
npm run package    # Generate release ZIP and SHA256 checksum
```

---

## FAQ

* **Why Sonnet 4.6 Thinking vs Opus 4.6 Thinking?**
  Claude Sonnet 4.6 Thinking provides outstanding speed, nuanced reasoning, and lower quota burn, making it ideal for daily coordination. Claude Opus 4.6 Thinking is suited for rare, high-difficulty architectural dilemmas.

* **What should I do if `MISSING_INVOKE_TOOL` is reported?**
  Start a new conversation (`Ctrl+N`) and explicitly pick `op-lead-with-us` from the Agent selector dropdown rather than typing `/op-lead-with-us`. If `invoke_subagent` is still missing from the schema, restart Antigravity or verify your global installation.

* **How do I confirm workers really run on Gemini Flash?**
  Worker configurations explicitly specify `model: flash`. While the model self-reporting in prose is unverified, Antigravity's quota tracking and session card metadata verify that `flash` resolves to Gemini 3.8 Flash. If authoritative runtime metadata is unavailable in a child session, the report marks the model as `UNVERIFIED`.

* **Does the plugin commit, push, or modify Git history automatically?**
  No. All roles operate under strict boundaries with no automatic `git commit`, `git push`, deployment, or destructive operations. Version control actions remain under explicit operator control.

---

<a name="-简体中文"></a>
## 🇨🇳 简体中文

### 概述

**`op-lead-with-us`** 是专为 **Google Antigravity** 设计的原生多模型协作插件。

让 **Claude (Sonnet 4.6 / Opus 4.6 Thinking)** 负责顶层系统架构、需求拆解与最终验收，将高 Token 消耗的繁重操作（代码检索、文件编辑、测试运行与纠错）全面交由极速、低成本的 **Gemini 3.8 Flash** 子 Agent 原生并发执行。

### 为什么选择它？

* **精准模型分工**：
  - **Claude Sonnet 4.6 Thinking**：日常首选主协调员，推理敏捷、拆解精准、额度消耗亲民。
  - **Claude Opus 4.6 Thinking**：高难度架构决策与高阶代码审查。
  - **Gemini 3.8 Flash**：子任务执行员，负责实质调研、写代码、跑测试与独立复查。
* **两种运行模式**：
  - **模式 A（Claude 主导全流程）**：Claude 全程协调，仅通过精简任务包委派，不读大文件、不亲自跑测试。
  - **模式 B（极省额度两阶段 `PLAN_ONLY`）**：Claude 产出 `PLAN.md`（≤120 行）后会话终止；新开 Gemini 3.8 Flash 会话执行 `Execute PLAN.md`，执行期零 Claude 消耗。
* **原生免配**：不依赖外部 Claude Code CLI、Codex CLI、第三方代理或付费 API，完全基于 Antigravity 官方原生子 Agent（`invoke_subagent`）与生命周期管理机制。
* **严格安全界限**：默认最多 2 个并发 worker、单路径单一 writer、最多 2 轮自主修复上限、精简汇报行数预算（40/50/60 行）。

### 快速上手

```bash
# 1. 全局安装（含自动备份现有配置）
git clone https://github.com/Hurbur/op-lead-with-us.git
cd op-lead-with-us
npm run install:global

# 2. 在 Antigravity 桌面端
# - 新建会话 (Ctrl+N)
# - Agent 选择器选择: op-lead-with-us
# - 模型选择器按需选择: Claude Sonnet 4.6 Thinking 或 Claude Opus 4.6 Thinking
# - 开始对话！
```

---

## 🤝 社区与友链

本项目首发并活跃于 **[LINUX DO](https://linux.do)** 技术社区：
- **论坛交流**：[LINUX DO (https://linux.do)](https://linux.do)
- **社区精神**：*真诚、友善、团结、专业*，共建高品质技术社区。

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
