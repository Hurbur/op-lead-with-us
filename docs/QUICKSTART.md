# op-lead-with-us — 快速上手指南

欢迎使用 **op-lead-with-us**！这是一个专为 Google Antigravity 设计的原生多模型协作插件。

其核心目标是：**在 Antigravity 桌面端内，用 Claude (Sonnet 4.6 / Opus 4.6 Thinking) 做主协调员负责顶层思考与验收，将耗费大量 Token 的繁重实现、调研与测试全面委派给极速、低成本的 Gemini 3.8 Flash，从而成倍节省 Claude 配额。**

---

## ⚡ 核心架构分工

| 角色 | 对应 Agent 文件 | 运行模型 | 核心职责 |
| :--- | :--- | :--- | :--- |
| **主架构师 (Lead)** | `op-lead-with-us` | **Claude 4.6** (`inherit`) | 需求理解、任务拆解、制定任务包、最终验收与交付。不亲自写琐碎代码。 |
| **调研员 (Researcher)** | `agy-researcher` | **Gemini 3.8 Flash** (`flash`) | 快速检索代码库、定位关键接口与依赖约束。纯只读权限，不修改代码。 |
| **执行员 (Implementer)** | `agy-implementer` | **Gemini 3.8 Flash** (`flash`) | 依据任务包进行代码编写、文件替换、执行本地测试，最多 2 轮自主纠错。 |
| **审查员 (Reviewer)** | `agy-reviewer` | **Gemini 3.8 Flash** (`flash`) | 独立审查 Git 变更与实现证据，核对逻辑漏洞与安全风险，提出最小修复建议。 |

### 会话级模型选择

| 会话类型 | 主模型推荐选择 | 说明 |
| :--- | :--- | :--- |
| **日常协调与标准开发 (模式 A)** | **Claude Sonnet 4.6 Thinking** | 敏捷、精准、低配额消耗，日常首选 |
| **复杂架构规划与深度排查 (模式 A)** | **Claude Opus 4.6 Thinking** | 深度推理、疑难故障排查、高风险系统审查 |
| **简易任务 / PLAN 执行 (模式 B)** | **Gemini 3.8 Flash** | Lead 与 workers 全部走 Flash，Claude 消耗为 0 |

### 两阶段极省额度规划 (模式 B: PLAN_ONLY)

1. 在 Claude 会话发送 `PLAN_ONLY + 任务描述`：Lead 产出 `PLAN.md`（≤120 行，由一次 implementer 按原文转写）后停止。
2. 新建会话：Agent 仍选 `op-lead-with-us`，主模型选 **Gemini 3.8 Flash**。
3. 发送 `Execute PLAN.md`：Flash workers 按计划调研/实现/审查，Flash Lead 依据摘要验收。全过程零 Claude Token 消耗。

---

## 🚀 安装部署（两种方式任选）

### 方式 A：当前项目内即用（推荐快速体验）
本项目已通过 Staging 机制在当前工作区生成了插件镜像：
```text
.agents/plugins/op-lead-with-us/
```
只需在 Antigravity 桌面端中，**“打开文件夹”选择当前项目目录**，即可直接在本项目中生效。

### 方式 B：一键全局安装（所有项目随处可用）
在本项目根目录下打开终端，执行：
```bash
npm run install:global
```
该命令会自动在修改前对任何现有配置创建带时间戳的安全备份，将插件同步至全局插件目录 `~/.gemini/config/plugins/op-lead-with-us`，并将全部 4 个 Agent（1 个 Lead + 3 个 workers）注册到 `~/.gemini/config/agents/`。之后你在 Antigravity 打开**任何项目或新建任何对话**，都能直接选用！

*(若需卸载全局安装，只需运行 `npm run uninstall:global`)*

---

## 🎯 桌面端实操三步法

1. **新建对话**：
   在 Antigravity 左侧侧边栏点击 **New Conversation**（或快捷键 `Ctrl+N`）。

2. **选择角色与模型**：
   - 在主 Agent 下拉框中，选择 **`op-lead-with-us`**。
   - 在模型下拉框中，选择你偏好的主协调员（**Claude Sonnet 4.6 Thinking** 或 **Claude Opus 4.6 Thinking**）。

3. **发送任务**：
   直接像平常一样向 AI 提出你的需求，例如：
   > “帮我给这个项目添加一个用于统计代码行数的命令行脚本，并编写完整的单元测试验证其正确性。”

---

## 🔍 工作流程与实操观察

发送任务后，你将看到以下原生协作流程自动运转：

```text
[用户输入需求]
       ↓
[Claude 4.6 Lead 思考与任务拆包]
       ↓
[调用 agy-researcher (Flash)]  → 快速定位文件与现有测试架构 (≤40 行)
       ↓
[调用 agy-implementer (Flash)] → 编写代码 + 运行测试命令 (≤50 行)
       ↓
[调用 agy-reviewer (Flash)]    → 独立复查变更 Diff 与边界用例 (≤60 行)
       ↓
[Claude 4.6 Lead 验收把关]     → 输出精简总结报告，交付最终成果
```

### 如何验证 Flash 正在干重活？
- 在 Antigravity 对话界面的右侧或子任务栏中，会弹出并发子会话卡片。
- 点击进入子会话，可看到其运行模型标识为 `Flash`。
- 主会话中，Claude 仅在委派前与验收后发言，中间上千行的代码生成与测试日志全部在 Flash 子会话中完成，有效保护你的 Claude 上下文与配额。

---

## 🛠 本地开发与测试指令

```bash
# 1. 运行静态规则与格式校验
npm run validate

# 2. 运行自动化回归测试套件（31 项全部通过）
npm test

# 3. 将源码改动同步更新到工作区插件目录
npm run stage

# 4. 生成发行版 ZIP 与 SHA256 校验和
npm run package
```
