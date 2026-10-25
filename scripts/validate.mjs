import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const agentNames = ['op-lead-with-us', 'agy-researcher', 'agy-implementer', 'agy-reviewer'];
export const runtimeFiles = [
  'plugin.json',
  ...agentNames.map(name => `agents/${name}.md`),
  'skills/op-lead-with-us/SKILL.md',
  'rules/op-lead-with-us.md',
];
export const packageFiles = [...runtimeFiles, 'README.md', 'docs/SMOKE-TEST.md', 'docs/TASK-PACKET.md', 'docs/COMPATIBILITY.md', 'docs/TROUBLESHOOTING.md'];
const verifiedTools = new Set(['view_file', 'grep_search', 'write_to_file', 'replace_file_content', 'run_command', 'invoke_subagent', 'manage_subagents', 'send_message']);
export const leadToolNames = ['view_file', 'grep_search', 'invoke_subagent', 'manage_subagents', 'send_message'];

// Deliberately supports only this project's simple YAML subset, not arbitrary YAML.
// Reject unsupported syntax instead of pretending to validate the whole YAML standard.
export function parseFrontmatter(source, label = 'Markdown') {
  assert(!source.startsWith('\uFEFF'), `${label}: UTF-8 BOM is not allowed`);
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/.exec(source);
  assert(match, `${label}: missing frontmatter delimiters or Markdown body`);
  const metadata = {};
  let listKey;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = /^  - ([a-zA-Z0-9_/-]+)$/.exec(line);
    if (item) {
      assert(listKey, `${label}: list item without a list property`);
      metadata[listKey].push(item[1]);
      continue;
    }
    const pair = /^([a-zA-Z][a-zA-Z0-9]*):(?: (.*))?$/.exec(line);
    assert(pair, `${label}: unsupported YAML line: ${line}`);
    const [, key, raw] = pair;
    assert(!Object.hasOwn(metadata, key), `${label}: duplicate key ${key}`);
    listKey = undefined;
    if (raw === undefined || raw === '') {
      metadata[key] = [];
      listKey = key;
    } else if (raw === 'true' || raw === 'false') {
      metadata[key] = raw === 'true';
    } else if (raw === 'startsWith') {
      metadata[key] = raw;
    } else if (raw.startsWith('"')) {
      const value = JSON.parse(raw);
      assert.equal(typeof value, 'string', `${label}: expected quoted string`);
      metadata[key] = value;
    } else {
      assert(/^[a-zA-Z0-9_./-]+$/.test(raw), `${label}: unsupported unquoted scalar`);
      metadata[key] = raw;
    }
  }
  assert(match[2].trim().length >= 100, `${label}: instruction body is too short`);
  return { metadata, body: match[2] };
}

function sameKeys(actual, expected, label) {
  assert.deepEqual(Object.keys(actual).sort(), [...expected].sort(), `${label}: unsupported or missing keys`);
}
function markdownNames(path) {
  return readdirSync(path).filter(name => name.endsWith('.md')).sort();
}

export function validatePlugin(root = projectRoot) {
  root = resolve(root);
  const checks = [];
  for (const file of runtimeFiles) {
    assert(existsSync(join(root, file)), `Missing runtime file: ${file}`);
    assert(!readFileSync(join(root, file), 'utf8').startsWith('\uFEFF'), `${file}: UTF-8 BOM`);
  }
  const manifest = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8'));
  // Strict profile from the official docs: no speculative version/entrypoint fields.
  sameKeys(manifest, ['name', 'description'], 'plugin.json');
  assert.equal(manifest.name, 'op-lead-with-us');
  assert.match(manifest.name, /^[a-zA-Z0-9_-]+$/);
  assert.equal(typeof manifest.description, 'string');
  assert(manifest.description.length > 0);
  checks.push('manifest: required fields and no unsupported keys');
  assert.deepEqual(markdownNames(join(root, 'agents')), agentNames.map(n => `${n}.md`).sort());

  for (const name of agentNames) {
    const { metadata: m, body } = parseFrontmatter(readFileSync(join(root, 'agents', `${name}.md`), 'utf8'), name);
    const lead = name === 'op-lead-with-us';
    sameKeys(m, ['name', 'description', 'mainAgent', 'subagent', 'model', 'commandExecutionPolicy', 'tools'], name);
    assert.equal(m.name, name);
    assert.equal(typeof m.description, 'string');
    assert(m.description.length > 10);
    assert.equal(m.model, lead ? 'inherit' : 'flash', `${name}: unexpected model routing`);
    assert.equal(m.mainAgent, lead, `${name}: wrong primary-agent flag`);
    assert.equal(m.subagent, !lead, `${name}: wrong delegation flag`);
    assert.equal(m.commandExecutionPolicy, 'sandbox', `${name}: unsafe command policy`);
    assert(Array.isArray(m.tools) && m.tools.length > 0, `${name}: explicit tools required`);
    assert.equal(new Set(m.tools).size, m.tools.length, `${name}: duplicate tools`);
    for (const tool of m.tools) assert(verifiedTools.has(tool), `${name}: unverified tool ${tool}`);
    if (!lead) {
      const expected = name === 'agy-researcher' ? ['view_file', 'grep_search']
        : name === 'agy-implementer' ? ['view_file', 'grep_search', 'write_to_file', 'replace_file_content', 'run_command']
        : ['view_file', 'grep_search', 'run_command'];
      assert.deepEqual(m.tools, expected, `${name}: tool capabilities changed`);
      assert(body.includes('UNVERIFIED'), `${name}: missing runtime model caveat`);
      const budget = name === 'agy-researcher' ? 40 : name === 'agy-implementer' ? 50 : 60;
      assert(body.includes(`Report budget: ${budget} lines maximum`), `${name}: missing report budget`);
    } else {
      assert.deepEqual(m.tools, leadToolNames, 'Lead must explicitly request delegation, lifecycle and read tools');
      assert(body.includes('LEAD_CONFIG_V3') && body.includes('LEAD_TOOLCHECK'), 'Lead must expose a capability preflight');
      assert(body.includes('MISSING_INVOKE_TOOL') && body.includes('WORKER_NOT_DISCOVERED'), 'Lead must distinguish capability from discovery failure');
      for (const worker of agentNames.filter(n => n !== name)) assert(body.includes(worker), `Lead does not refer to ${worker}`);
      assert(body.includes('repair_cycles_remaining') && body.includes('repair_cycles_used'), 'Lead must track repairs across invocations');
      assert(body.includes('PLAN_ONLY') && body.includes('Execute PLAN.md') && body.includes('verbatim'), 'Lead must define PLAN_ONLY two-phase planning with verbatim transcription');
      assert(body.includes('report budgets'), 'Lead must enforce worker report budgets');
    }
    checks.push(`agent: ${name} (${m.model}; main=${m.mainAgent}; subagent=${m.subagent})`);
  }

  const skill = parseFrontmatter(readFileSync(join(root, 'skills/op-lead-with-us/SKILL.md'), 'utf8'), 'skill');
  sameKeys(skill.metadata, ['name', 'description'], 'skill');
  assert.equal(skill.metadata.name, 'op-lead-with-us');
  assert.equal(typeof skill.metadata.description, 'string');
  for (const name of agentNames) assert(skill.body.includes(name), `Skill missing ${name}`);
  checks.push('skill: metadata and all role references');

  assert.deepEqual(markdownNames(join(root, 'rules')), ['op-lead-with-us.md']);
  const rulePath = join(root, 'rules/op-lead-with-us.md');
  const rule = parseFrontmatter(readFileSync(rulePath, 'utf8'), 'rule');
  sameKeys(rule.metadata, ['trigger', 'description'], 'rule');
  assert.equal(rule.metadata.trigger, 'always_on');
  assert.equal(typeof rule.metadata.description, 'string');
  assert(readFileSync(rulePath).byteLength < 24000, 'Rule exceeds documented per-file size limit');
  assert(rule.body.includes('Otherwise do not alter'), 'Rule must not hijack unrelated conversations');
  assert(rule.body.includes('Coordinator and worker models') && rule.body.includes('PLAN_ONLY'), 'Rule must pin the model policy and PLAN_ONLY');
  checks.push('rule: valid activation and limited scope');
  checks.push('cost controls: model policy, PLAN_ONLY and report budgets');

  for (const forbidden of ['hooks.json', 'mcp_config.json']) assert(!existsSync(join(root, forbidden)), `MVP must not silently introduce ${forbidden}`);
  checks.push('no hooks, external MCP or automatic model API');
  return { root, checks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = validatePlugin(process.argv[2] || projectRoot);
    for (const check of result.checks) console.log(`PASS ${check}`);
    console.log(`Validated ${result.checks.length} checks at ${result.root}`);
    console.log('Static checks only: live Antigravity loading, routing and quota usage remain unverified.');
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    process.exitCode = 1;
  }
}
