---
name: op-lead-with-us
description: "在 Antigravity 内用 Claude (Sonnet 4.6 / Opus 4.6 Thinking) 规划与验收、Flash 调研/实现/审查的原生协作流程。用户要求节省 Claude 额度、委派实现或使用 op-lead-with-us 时使用。"
---

# OP Lead With Us

Keep all coordination and workers inside Antigravity. This skill orchestrates
installed custom agents; it does not provide a model API, quota extension or CLI.

## Activation

1. The user selects the session model in the main conversation: Claude Sonnet 4.6
   Thinking for everyday coordination, Claude Opus 4.6 Thinking for architectural
   complexity / deep review, or Gemini 3.8 Flash for simple tasks and PLAN execution.
   Prefer `op-lead-with-us` as the primary agent. This skill cannot switch models.
2. Confirm the installed worker definitions are available under their registered
   identifiers: `agy-researcher`, `agy-implementer`, `agy-reviewer`, all `flash`.
3. If invoked in a default main agent, apply this workflow to that main agent. Do
   NOT call `op-lead-with-us` as a subagent: it is primary-only. If invoked inside
   a worker, obey the worker's task packet instead of orchestrating more agents.
4. Missing definitions, delegation tools, or Flash access are blockers; explain
   them. Do not silently use `self`, `inherit`, `pro`, another model, or an external
   CLI/app. First use requires a small routing smoke test, not a large coding job.

## Capability preflight

For LEAD_TOOLCHECK, do not spawn a worker. Report actual availability of
invoke_subagent, manage_subagents, and send_message, plus whether a lead
instruction-revision marker was present before reading any file. A skill being
read does not prove that the custom primary agent or its tools were loaded.
This skill cannot add tools to a conversation.

Setup diagnosis may read only this plugin's manifest, lead definition, and
researcher definition using the main agent's own read tools. It is not a forbidden
Claude implementation fallback. If invocation is missing, report MISSING_INVOKE_TOOL
and stop; if the named worker is not found, report WORKER_NOT_DISCOVERED. Do not
substitute sending to a manually created chat for the requested automation.

## Workflow

- Define acceptance criteria with minimal lead exploration.
- In PLAN_ONLY mode, produce one compact PLAN.md (max 120 lines) via a single
  verbatim implementer dispatch, or print it for the user to save; execution
  happens in a new conversation with main model Gemini 3.8 Flash.
- Delegate uncertain repository questions to the read-only researcher; skip it
  for a fully specified small change.
- Produce a short plan and a self-contained task packet. Workers start without
  parent chat history: include absolute workspace, read/write scope, repository
  instructions, interfaces, pre-existing edits, exact acceptance commands, stop
  conditions, prior attempts, `repair_cycles_remaining`, and report format.
- Delegate implementation and tests to the implementer. One writer per path;
  at most two concurrent workers and four implementation packets by default.
- Have a separate reviewer inspect actual changes and evidence after writing stops.
- At most two total repair cycles after initial implementation, including test and
  review fixes. Track `repair_cycles_used` across worker resumptions/replacements.
- The lead accepts from the reviewer verdict, implementer evidence, a diff summary
  and test conclusions. It does not redo routine reading, implementation, tests,
  repairs, or re-read full diffs/logs. Enforce report budgets: researcher 40 lines,
  implementer 50, reviewer 60.

## First-use probe

Invoke only `agy-researcher` with `ROUTING_SMOKE_TEST` and the absolute path of this
plugin's manifest. Ask it to read the name and return without writing. Compare the
worker's actual app/tool model metadata to its configured `flash` tier. A worker's
textual claim is not runtime evidence. Report UNVERIFIED if metadata is unavailable
and ask the user to confirm the child session model before a larger run. Do not
claim savings or routing success based on static configuration alone.

## Safety and reporting

Use the user's language. Preserve pre-existing edits. No automatic commit, push,
deploy, global installation, secret access, permission changes or destructive actions.
Respect native approval prompts. Final reports distinguish tests run from not run,
include changed paths, risks and model-verification status. This is prompt-based
orchestration with native model-tier configuration, not a hard quota controller.
