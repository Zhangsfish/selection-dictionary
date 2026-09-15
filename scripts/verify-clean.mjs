import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const npmCLI = process.env.npm_execpath;
if (!npmCLI) throw Error('Run via npm run verify:clean so the installed npm CLI is available.');
const destination = resolve(root, 'output/tmp', `clean-source-${Date.now()}`);
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
if (!files.includes('package-lock.json') || !files.includes('data/dictionary.json')) throw Error('Stage the reviewed source/data first (git add .).');
await mkdir(destination, { recursive: true });
execFileSync('git', ['checkout-index', '--all', `--prefix=${destination.replaceAll('\\', '/')}/`], { cwd: root });
// Give the clean snapshot its own index; never accidentally audit the parent repository.
execFileSync('git', ['init', '-q'], { cwd: destination });
execFileSync('git', ['add', '.'], { cwd: destination });
const report = { node: process.version, platform: process.platform, exportedFiles: files.length, commands: [], success: false };
const hash = async (dir, file) => createHash('sha256').update(await readFile(resolve(dir, file))).digest('hex');
const environment = { ...process.env };
delete environment.PLAYWRIGHT_MODULE_PATH;
delete environment.NODE_PATH;
delete environment.NODE_OPTIONS;
delete environment.CHROME_CHANNEL;
delete environment.HEADED;
// Deliberately empty cache inside the new snapshot; no copied dependencies/build/raw inputs.
async function run(program, args, label) {
  console.log(`\n$ ${label}`);
  await new Promise((yes, no) => {
    const child = spawn(program, args, { cwd: destination, env: environment, stdio: 'inherit', windowsHide: true });
    child.on('error', no);
    child.on('exit', code => code === 0 ? yes() : no(Error(`${label} exited ${code}`)));
  });
  report.commands.push({ command: label, exitCode: 0 });
}
const npm = async (args, label = `npm ${args.join(' ')}`) => run(process.execPath, [npmCLI, ...args], label);
try {
  await npm(['ci', '--cache=output/npm-cache', '--no-audit', '--no-fund', '--fetch-timeout=60000', '--fetch-retries=1']);
  await npm(['run', 'check']);
  await npm(['run', 'package']);
  const release = JSON.parse(await readFile(resolve(destination, 'output/release.json'), 'utf8'));
  await npm(['run', 'package']);
  const repeated = JSON.parse(await readFile(resolve(destination, 'output/release.json'), 'utf8'));
  if (release.zipSha256 !== repeated.zipSha256) throw Error('Repeated ZIP output differs');
  report.repeatPackageIdentical = true;
  await npm(['run', 'test:browser']);
  await run(process.env.PYTHON || 'python', ['scripts/prepare-dictionary.py', '--download', '--check'], 'python scripts/prepare-dictionary.py --download --check');
  await npm(['run', 'audit']);
  for (const file of ['dist/content.js', 'dist/content.js.map', 'data/dictionary.json', 'data/ECDICT-LICENSE.txt']) {
    const actual = await hash(destination, file);
    if (actual !== await hash(root, file)) throw Error(`Clean/source artifact differs: ${file}`);
    (report.identicalArtifacts ??= {})[file] = actual;
  }
  const browser = JSON.parse(await readFile(resolve(destination, 'output/playwright/report.json'), 'utf8'));
  report.browser = browser.browser;
  report.browserChecks = browser.checks.length;
  report.browserFailure = browser.failure ?? null;
  report.latency = browser.latency;
  report.zip = release;
  report.success = true;
} catch (error) {
  report.failure = error.message;
  throw error;
} finally {
  await writeFile(resolve(root, 'output/clean-reproduction.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Clean source verification: ${report.success ? 'PASS' : 'FAIL'} (output/clean-reproduction.json)`);
}
