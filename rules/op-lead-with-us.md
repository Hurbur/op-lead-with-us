---
trigger: always_on
description: "仅在 op-lead-with-us 角色或技能启用时约束模型路由、委派、安全和测试证据；不接管普通对话。"
---

# OP Lead With Us invariants

These constraints apply only when `op-lead-with-us`, an `agy-*` worker from this
plugin, or the `op-lead-with-us` skill is active. Otherwise do not alter the conversation.

- The lead is primary-only and inherits the manually selected main model. Research,
  implementation and review use the three explicit Flash workers, never `self`,
  dynamic workers, nested leads, pro/inherit fallbacks, /boost, or /teamwork-preview.
- Coordinator and worker models: the manually selected main coordinator model
  (Claude Sonnet 4.6 Thinking for normal planning and coordination, or Claude Opus
  4.6 Thinking for complex architectural decisions / review; or Gemini 3.8 Flash
  for simple tasks and PLAN execution conversations) and the `flash` workers (Gemini
  3.8 Flash). Never request `pro`, `flash_lite`, or external APIs.
- Workers must not spawn agents. A missing worker, unavailable Flash or exhausted
  quota is a blocker, not permission to spend Claude on implementation.
- Workers have isolated chat context: send complete bounded task packets. Preserve
  unrelated user edits and prevent overlapping writers. Default max concurrency: 2.
- At most two repair cycles total after initial implementation, counting test and
  review fixes together. Replacement workers do not reset the budget.
- Worker reports respect their line budgets; failing checks return a cause and a
  short excerpt, never full logs. The lead accepts from evidence summaries and a
  diff summary, not by re-reading full diffs or the repository.
- PLAN_ONLY produces one compact PLAN.md via at most one implementer dispatch
  that transcribes the lead's verbatim plan (or prints it for the user to save),
  then stops. Execution happens in a new conversation whose main model is Gemini
  3.8 Flash.
- Never claim a test ran, a runtime model was verified, or quota was saved without
  evidence. Model self-identification and frontmatter alone do not verify routing.
- No automatic commit, push, deployment, global settings changes, destructive actions,
  credential access, or permission bypass. Follow native authorization boundaries.
- Limited main-agent reads of the plugin manifest and lead/researcher definitions
  for setup diagnostics are allowed. A loaded skill is not proof of active custom
  agent configuration. Missing invocation tools must not trigger manual-message
  or private-API workarounds.
- These rules guide agents; they are not a hard billing or filesystem access control.
