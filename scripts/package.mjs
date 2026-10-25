import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { projectRoot, validatePlugin } from './validate.mjs';
import { stagePlugin } from './stage-plugin.mjs';

function computeSha256(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

export function packagePlugin() {
  console.log('--- op-lead-with-us 打包流水线 ---');
  
  // 1. 静态验证
  console.log('[1/4] 运行静态规则与格式校验...');
  validatePlugin(projectRoot);
  console.log('PASS 静态校验通过');

  // 2. 运行单元测试
  console.log('[2/4] 执行回归测试套件...');
  execFileSync(process.execPath, ['--test', join(projectRoot, 'tests', 'plugin.test.mjs')], {
    stdio: 'inherit',
    cwd: projectRoot,
  });
  console.log('PASS 全部单元测试通过');

  // 3. Staging 工作区插件
  console.log('[3/4] 校验并同步 Staging 副本...');
  const stagedDir = stagePlugin(projectRoot);
  console.log(`PASS 成功同步至 ${stagedDir}`);

  // 4. 打包 ZIP 与生成 SHA256
  console.log('[4/4] 生成发行版 ZIP 与哈希校验和...');
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  const version = pkg.version || '0.1.1';
  const outputsDir = join(projectRoot, 'outputs');
  mkdirSync(outputsDir, { recursive: true });

  const zipFile = join(outputsDir, `op-lead-with-us-${version}.zip`);
  const shaFile = join(outputsDir, `op-lead-with-us-${version}.sha256.txt`);

  // Cross-platform zip creation: use zip CLI on Linux/Unix, powershell on Windows if available
  if (process.platform === 'win32') {
    const psCmd = `Compress-Archive -Path '${stagedDir}\\*' -DestinationPath '${zipFile}' -Force`;
    execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' });
  } else {
    if (existsSync(zipFile)) rmSync(zipFile, { force: true });
    execFileSync('zip', ['-q', '-r', zipFile, '.'], { stdio: 'inherit', cwd: stagedDir });
  }

  const hashValue = computeSha256(zipFile).toUpperCase();
  const shaContent = `\nAlgorithm : SHA256\nHash      : ${hashValue}\nPath      : ${zipFile}\n\n`;
  writeFileSync(shaFile, shaContent, 'utf8');

  console.log(`\n✅ 打包完成！`);
  console.log(`ZIP 文件: ${zipFile}`);
  console.log(`SHA256:   ${hashValue}`);
  console.log(`校验文件: ${shaFile}`);
  return { zipFile, shaFile, hashValue };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    packagePlugin();
  } catch (error) {
    console.error(`FAIL 打包失败: ${error.message}`);
    process.exitCode = 1;
  }
}
