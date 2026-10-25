import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { projectRoot, packageFiles, parseFrontmatter, validatePlugin } from '../scripts/validate.mjs';
import { stagePlugin } from '../scripts/stage-plugin.mjs';

// Intentionally no recursive deletion. Small, unique test fixtures are left in OS temp.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'op-lead-test-'));
  for (const file of packageFiles) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(projectRoot, file), join(root, file));
  }
  return root;
}
function rewrite(root, file, fn) {
  const path = join(root, file);
  writeFileSync(path, fn(readFileSync(path, 'utf8')));
}

test('source plugin validates', () => assert.equal(validatePlugin().checks.length, 9));
test('CRLF frontmatter is supported', () => {
  const source = readFileSync(join(projectRoot, 'agents/agy-researcher.md'), 'utf8').replace(/\r?\n/g, '\r\n');
  assert.equal(parseFrontmatter(source).metadata.model, 'flash');
});
test('duplicate YAML fields are rejected', () => {
  assert.throws(() => parseFrontmatter(`---\nname: one\nname: two\n---\n${'body '.repeat(30)}`), /duplicate key/);
});
test('unknown manifest properties are rejected', () => {
  const root = fixture();
  rewrite(root, 'plugin.json', s => JSON.stringify({ ...JSON.parse(s), version: '0.1.0' }));
  assert.throws(() => validatePlugin(root), /unsupported or missing keys/);
});
test('worker must not inherit expensive main model', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-implementer.md', s => s.replace('model: flash', 'model: inherit'));
  assert.throws(() => validatePlugin(root), /unexpected model routing/);
});
test('lead must not be callable as a subagent', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('subagent: false', 'subagent: true'));
  assert.throws(() => validatePlugin(root), /wrong delegation flag/);
});
test('unknown tool names are rejected', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-reviewer.md', s => s.replace('  - run_command', '  - made_up_tool'));
  assert.throws(() => validatePlugin(root), /unverified tool/);
});
test('researcher cannot acquire shell access', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-researcher.md', s => s.replace('  - grep_search', '  - grep_search\n  - run_command'));
  assert.throws(() => validatePlugin(root), /tool capabilities changed/);
});
test('invalid rule trigger is rejected', () => {
  const root = fixture();
  rewrite(root, 'rules/op-lead-with-us.md', s => s.replace('trigger: always_on', 'trigger: alwaysOn'));
  assert.throws(() => validatePlugin(root));
});
test('rule without frontmatter is rejected', () => {
  const root = fixture();
  rewrite(root, 'rules/op-lead-with-us.md', s => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''));
  assert.throws(() => validatePlugin(root), /missing frontmatter/);
});
test('unsafe shell auto-execution policy is rejected', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-implementer.md', s => s.replace('commandExecutionPolicy: sandbox', 'commandExecutionPolicy: eager'));
  assert.throws(() => validatePlugin(root), /unsafe command policy/);
});
test('stage creates a byte-identical workspace install and is idempotent', () => {
  const root = fixture();
  const target = stagePlugin(root);
  for (const file of packageFiles) assert.deepEqual(readFileSync(join(target, file)), readFileSync(join(root, file)));
  assert.equal(validatePlugin(target).checks.length, 9);
  assert.equal(stagePlugin(root), target);
  assert(!existsSync(join(root, '.gemini')));
});
test('stage refuses to overwrite local edits before writing anything', () => {
  const root = fixture();
  const target = stagePlugin(root);
  const path = join(target, 'agents/agy-researcher.md');
  writeFileSync(path, `${readFileSync(path, 'utf8')}\nLocal user edit.\n`);
  rewrite(root, 'plugin.json', s => JSON.stringify({ ...JSON.parse(s), description: 'new description' }));
  const manifestBefore = readFileSync(join(target, 'plugin.json'));
  assert.throws(() => stagePlugin(root), /locally changed staged file/);
  assert.deepEqual(readFileSync(join(target, 'plugin.json')), manifestBefore);
  assert.match(readFileSync(path, 'utf8'), /Local user edit/);
});
test('stage updates managed files after source edits', () => {
  const root = fixture();
  const target = stagePlugin(root);
  rewrite(root, 'README.md', s => `${s}\nSource update.\n`);
  stagePlugin(root);
  assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /Source update/);
});
test('stage rejects unexpected assets without deleting them', () => {
  const root = fixture();
  const target = stagePlugin(root);
  writeFileSync(join(target, 'hooks.json'), '{}');
  assert.throws(() => stagePlugin(root), /Unexpected staged file/);
  assert(existsSync(join(target, 'hooks.json')));
});

test('lead has explicit native delegation and lifecycle tools', () => {
  const { metadata } = parseFrontmatter(readFileSync(join(projectRoot, 'agents/op-lead-with-us.md'), 'utf8'));
  assert.deepEqual(metadata.tools, ['view_file', 'grep_search', 'invoke_subagent', 'manage_subagents', 'send_message']);
});
test('lead missing invoke_subagent is rejected', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('  - invoke_subagent\n', ''));
  assert.throws(() => validatePlugin(root), /Lead must explicitly request/);
});
test('lead missing lifecycle management is rejected', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('  - manage_subagents\n', ''));
  assert.throws(() => validatePlugin(root), /Lead must explicitly request/);
});
test('lead cannot regress to implicit default tools', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace(/tools:\n(?:  - [a-z_]+\n)+/, ''));
  assert.throws(() => validatePlugin(root), /unsupported or missing keys/);
});
test('worker cannot gain native delegation tools', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-implementer.md', s => s.replace('  - run_command', '  - run_command\n  - invoke_subagent'));
  assert.throws(() => validatePlugin(root), /tool capabilities changed/);
});
test('lead cannot gain shell tools as implementation fallback', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('  - send_message', '  - send_message\n  - run_command'));
  assert.throws(() => validatePlugin(root), /Lead must explicitly request/);
});
test('lead must define PLAN_ONLY two-phase planning', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.split('PLAN_ONLY').join('TWO_PHASE'));
  assert.throws(() => validatePlugin(root), /PLAN_ONLY two-phase planning/);
});
test('worker report budgets are required', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-researcher.md', s => s.replace('Report budget: 40 lines maximum.', ''));
  assert.throws(() => validatePlugin(root), /missing report budget/);
});
test('model policy is pinned in rules', () => {
  const root = fixture();
  rewrite(root, 'rules/op-lead-with-us.md', s => s.replace('Coordinator and worker models', 'Arbitrary models'));
  assert.throws(() => validatePlugin(root), /model policy/);
});
test('coordinator must inherit main model and not allow direct flash assignment', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('model: inherit', 'model: flash'));
  assert.throws(() => validatePlugin(root), /unexpected model routing/);
});
test('workers must strictly route to flash only', () => {
  for (const model of ['pro', 'flash_lite']) {
    const root = fixture();
    rewrite(root, 'agents/agy-researcher.md', s => s.replace('model: flash', `model: ${model}`));
    assert.throws(() => validatePlugin(root), /unexpected model routing/);
  }
});
test('lead requires LEAD_CONFIG_V3 marker and LEAD_TOOLCHECK preflight', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('LEAD_CONFIG_V3', 'LEAD_CONFIG_V1'));
  assert.throws(() => validatePlugin(root), /capability preflight/);
});
test('lead requires MISSING_INVOKE_TOOL and WORKER_NOT_DISCOVERED error markers', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('MISSING_INVOKE_TOOL', 'SOME_ERROR'));
  assert.throws(() => validatePlugin(root), /distinguish capability from discovery failure/);
});
test('lead enforces repair cycles budget', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('repair_cycles_remaining', 'retry_attempts'));
  assert.throws(() => validatePlugin(root), /track repairs across invocations/);
});
test('lead enforces worker report budgets', () => {
  const root = fixture();
  rewrite(root, 'agents/op-lead-with-us.md', s => s.replace('report budgets', 'unlimited reports'));
  assert.throws(() => validatePlugin(root), /enforce worker report budgets/);
});
test('implementer tools must include write_to_file', () => {
  const root = fixture();
  rewrite(root, 'agents/agy-implementer.md', s => s.replace('  - write_to_file\n', ''));
  assert.throws(() => validatePlugin(root), /tool capabilities changed/);
});
