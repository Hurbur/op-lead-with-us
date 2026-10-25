import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, copyFileSync, cpSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { projectRoot, packageFiles, validatePlugin, agentNames } from './validate.mjs';

const hash = data => createHash('sha256').update(data).digest('hex');
const marker = '.op-lead-with-us-installed.json';

const globalConfigDir = join(homedir(), '.gemini', 'config');
const globalPluginDir = join(globalConfigDir, 'plugins', 'op-lead-with-us');
const globalAgentsDir = join(globalConfigDir, 'agents');

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupExistingInstallation() {
  const timestamp = createTimestamp();
  let backedUp = false;

  // 1. Back up existing plugin directory if present
  if (existsSync(globalPluginDir)) {
    const pluginBackupDir = join(globalConfigDir, 'plugins', `op-lead-with-us.backup-${timestamp}`);
    cpSync(globalPluginDir, pluginBackupDir, { recursive: true });
    console.log(`📦 已备份现有插件目录至: ${pluginBackupDir}`);
    backedUp = true;
  }

  // 2. Back up existing agent files if present
  if (existsSync(globalAgentsDir)) {
    const existingAgents = agentNames.filter(name => existsSync(join(globalAgentsDir, `${name}.md`)));
    if (existingAgents.length > 0) {
      const agentsBackupDir = join(globalAgentsDir, `.backup-${timestamp}`);
      mkdirSync(agentsBackupDir, { recursive: true });
      for (const name of existingAgents) {
        copyFileSync(join(globalAgentsDir, `${name}.md`), join(agentsBackupDir, `${name}.md`));
      }
      console.log(`📦 已备份现有 Agent 文件至: ${agentsBackupDir}`);
      backedUp = true;
    }
  }

  return backedUp;
}

function uninstall() {
  console.log('--- op-lead-with-us 全局卸载 ---');
  let removedAny = false;

  if (existsSync(globalPluginDir)) {
    console.log(`正在移除全局插件目录: ${globalPluginDir}`);
    rmSync(globalPluginDir, { recursive: true, force: true });
    removedAny = true;
  }

  // 清理全局 agents 中的 lead 与 worker
  if (existsSync(globalAgentsDir)) {
    for (const name of agentNames) {
      const agentFile = join(globalAgentsDir, `${name}.md`);
      if (existsSync(agentFile)) {
        console.log(`正在移除全局 Agent: ${agentFile}`);
        rmSync(agentFile, { force: true });
        removedAny = true;
      }
    }
  }

  // 检查是否有历史备份并告知用户
  if (existsSync(join(globalConfigDir, 'plugins'))) {
    const backups = readdirSync(join(globalConfigDir, 'plugins')).filter(d => d.startsWith('op-lead-with-us.backup-'));
    if (backups.length > 0) {
      console.log(`ℹ️ 提示: 检测到历史备份目录共 ${backups.length} 个（未自动删除，可手动清理）:`);
      for (const b of backups) console.log(`   - ${join(globalConfigDir, 'plugins', b)}`);
    }
  }

  if (removedAny) {
    console.log('✅ 全局卸载完成。未触碰任何其他无关配置或凭据。');
  } else {
    console.log('未检测到已安装的全局组件，无需操作。');
  }
}

function install(options = {}) {
  console.log('--- op-lead-with-us 全局安装 ---');
  validatePlugin(projectRoot);
  console.log('PASS 静态配置校验通过');

  // 安全检查与备份
  backupExistingInstallation();

  // 1. 部署到 ~/.gemini/config/plugins/op-lead-with-us
  mkdirSync(globalPluginDir, { recursive: true });
  const fileHashes = {};

  for (const file of packageFiles) {
    const src = join(projectRoot, file);
    const dest = join(globalPluginDir, file);
    mkdirSync(dirname(dest), { recursive: true });
    const content = readFileSync(src);
    writeFileSync(dest, content);
    fileHashes[file] = hash(content);
  }

  // 写入安装清单标记
  writeFileSync(
    join(globalPluginDir, marker),
    JSON.stringify({ format: 1, installedAt: new Date().toISOString(), files: fileHashes }, null, 2) + '\n'
  );
  console.log(`✅ 插件核心已安装至: ${globalPluginDir}`);

  // 2. 将所有 4 个 agent (lead + 3 workers) 注册至 ~/.gemini/config/agents/，确保 Antigravity 主下拉框与子代理发现均可见
  mkdirSync(globalAgentsDir, { recursive: true });
  for (const name of agentNames) {
    const src = join(projectRoot, 'agents', `${name}.md`);
    const dest = join(globalAgentsDir, `${name}.md`);
    copyFileSync(src, dest);
    console.log(`✅ 已注册全局 Agent: ${name} -> ${dest}`);
  }

  // 验证全局安装副本
  validatePlugin(globalPluginDir);
  console.log('PASS 全局副本静态校验通过');

  console.log('\n=========================================');
  console.log('🎉 op-lead-with-us 全局安装成功！');
  console.log('使用方法：');
  console.log('1. 重启或在 Antigravity 桌面端新建对话 (Ctrl+N)');
  console.log('2. Agent 选择器选择: op-lead-with-us');
  console.log('3. 模型选择器按会话模式选择:');
  console.log('   - 模式 A（Claude 协调）: Claude Sonnet 4.6 Thinking（日常首选）或 Claude Opus 4.6 Thinking（复杂架构/高阶审查）');
  console.log('   - 模式 B（省额度执行）: 在 Claude 会话 PLAN_ONLY 生成 PLAN.md，然后新建 Gemini 3.8 Flash 会话执行 Execute PLAN.md');
  console.log('4. 所有实质代码检索、实现、测试与独立审查均由 Gemini 3.8 Flash 子 Agent 原生并发执行');
  console.log('=========================================\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const isUninstall = process.argv.includes('--uninstall') || process.argv.includes('-u');
  try {
    if (isUninstall) {
      uninstall();
    } else {
      install();
    }
  } catch (error) {
    console.error(`FAIL 安装操作失败: ${error.message}`);
    process.exitCode = 1;
  }
}

export { install, uninstall, backupExistingInstallation };
