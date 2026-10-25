# 首次运行验收与冒烟测试指南

## 0. 安装与发现（零模型消耗）

在工作区生成 `.agents/plugins/op-lead-with-us/`（或执行 `npm run install:global` 全局安装）后，在 Antigravity 桌面端新建对话。
确认 `op-lead-with-us` 可以在主 Agent 选择器中选中。
三个 worker（`agy-researcher`, `agy-implementer`, `agy-reviewer`）作为子 Agent 注册供原生委派调用。

## 0.1 预检 Lead 工具（LEAD_TOOLCHECK）

在新建对话中，Agent 选择 `op-lead-with-us`，主模型选 **Claude Sonnet 4.6 Thinking**（或 Claude Opus 4.6 Thinking），发送以下预检提示：

```text
LEAD_TOOLCHECK。不要调用任何工具，不读文件，不创建子会话，不写代码。
仅根据当前已注入的指令与工具 schema 回答：
1. 当前指令中是否有 Lead 的 Instruction revision；有则原样返回，没有则写 absent。
2. invoke_subagent、manage_subagents、send_message 各是否真的可调用。
3. 不得用提示词里提到的工具名、文件配置或你自述的身份冒充实际可用工具。
4. 若缺 invoke_subagent，返回 MISSING_INVOKE_TOOL 并停止。
```

预期：Lead 确认 `Instruction revision: LEAD_CONFIG_V3` 存在，且 `invoke_subagent`、`manage_subagents`、`send_message` 均在可用工具声明中。

## 1. 最小只读路由测试（一次 researcher 调用）

保持主 Agent 为 `op-lead-with-us`，向 Claude 发送：

```text
ROUTING_SMOKE_TEST。请派发一名 agy-researcher 只读读取本插件的 plugin.json 文件，
返回其 name 字段的值。严禁修改任何文件，严禁执行命令。
完成后由 Lead 输出验收报告，注明子任务实际运行模型是否经元数据证实（若无则标记 UNVERIFIED）。
```

验收记录：

| 项目 | 预期 | 状态 |
| --- | --- | --- |
| 主 Agent / 主模型 | op-lead-with-us / Claude Sonnet 4.6 (或 Opus 4.6) | 待实机记录 |
| 子 Agent | agy-researcher | 待实机记录 |
| 子任务实际模型 | Gemini 3.8 Flash (`model: flash`) | 待实机记录 |
| 子任务数量 | 1 | 待实机记录 |
| 文件改动 | 0 (无任何改动) | 待实机记录 |
| 状态 | COMPLETE (无挂起、无异常 fallback) | 待实机记录 |

*注：模型文本自述不能算作底层运行凭证。若无底层会话元数据，一律标为 UNVERIFIED。*

## 1.5 PLAN_ONLY 两阶段冒烟测试（模式 B）

在 Claude 会话中发送：
`PLAN_ONLY: 为一个简单的数学工具库设计加减乘除函数与单元测试结构`。

预期：
- 仅产出一份紧凑的 `PLAN.md`（≤120 行），通过至多一次 `agy-implementer` 原文写入或直接输出；
- Claude 不派发 researcher/reviewer，不写实现代码，不跑测试。
- 用户新建对话：Agent 选 `op-lead-with-us`，模型选 **Gemini 3.8 Flash**，发送 `Execute PLAN.md`，全程零 Claude 消耗。

## 2. 端到端小型任务测试

在只读测试通过后，进入小型编码实机验证（建议使用新目录，如 `work/op-lead-smoke/`）：

```text
使用 op-lead-with-us。在“/绝对路径/work/op-lead-smoke”实现一个零依赖 Node ESM 工具模块。
目录必须是新目录，存在则停止询问；禁止修改该目录外的文件。
创建 clamp.mjs，导出 clamp(value, min, max)。三个参数必须是有限数字；
非数字、NaN、Infinity、-Infinity 抛 TypeError；min > max 抛 RangeError；
否则把 value 限制在闭区间 [min,max]，min === max 合法。
创建 clamp.test.mjs，使用 node:test 和 node:assert/strict，覆盖全部上述条件和正常范围值。
验收命令：在该目录执行 node --test clamp.test.mjs。
需求已完整，不必先调研。请由一个 agy-implementer 实现和运行测试，
再由独立 agy-reviewer 读取实际文件、独立跑测试，最后由 Lead 验收。
总共最多两轮修复，不运行 npm install、不使用外部服务、不提交 Git。
附实际执行命令、工作目录、退出码及两个子会话的实际模型证据；拿不到则标记 UNVERIFIED。
```

预期：
- Claude 仅做任务拆解、派发 implementer 与 reviewer，并在最后依据精简证据验收；
- Implementer 完成 `clamp.mjs` 和 `clamp.test.mjs` 编写并运行测试；
- Reviewer 独立复核 diff 并独立运行 `node --test clamp.test.mjs`；
- 所有改动均严格限制在测试目录内，无外部文件污染。

## 完成标准

静态校验通过（`npm run validate`）+ 单元回归测试全通（`npm test`）+ 原生委派工具验证 + 真实子会话执行证据。
