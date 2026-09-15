import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
// Include not-yet-staged source too: an empty initial Git index must not yield a fake clean scan.
const files = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']))].sort();
const trackedIgnored = git(['ls-files', '--cached', '--ignored', '--exclude-standard', '-z']);
const findings = trackedIgnored.map(file => ({ file, rule: 'ignored-artifact-in-index' }));
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['token-shape', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{20,})\b/],
  ['credential-assignment', /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'][^"'\s]{12,}["']/i],
  ['machine-path', /\b[A-Za-z]:[\\/][\w]|\/(?:Users|home)\/[^/\s]+\//],
  ['private-url', /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.|192\.168\.|[^/\s]+\.internal)(?:[/:]|\b)/],
  ['challenge-token', /__cf_chl_rt_tk=[A-Za-z0-9._-]{20,}|__cf_bm["']?\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/],
];
const runtimeRules = [
  ['runtime-network-api', /\bfetch\s*\(|\b(?:XMLHttpRequest|WebSocket|EventSource)\b|\bsendBeacon\s*\(/],
  ['runtime-remote-resource', /https?:\/\/|@import\s|url\s*\(/],
];
const hashes = {};
const terminology = [];
for (const file of files) {
  const data = await readFile(resolve(root, file));
  hashes[file] = createHash('sha256').update(data).digest('hex');
  if (data.includes(0)) {
    if (!/^verification\/[^/]+\.png$/.test(file)) findings.push({ file, rule: 'unexpected-binary' });
    continue;
  }
  const source = data.toString('utf8');
  for (const [rule, pattern] of rules) if (pattern.test(source)) findings.push({ file, rule });
  if (file.startsWith('src/')) for (const [rule, pattern] of runtimeRules) if (pattern.test(source)) findings.push({ file, rule });
  // Raw dictionary content is not prose authored by this project; do not alter source definitions.
  if (file !== 'data/dictionary.json' && /\bIPA\b|International Phonetic Alphabet|standard IPA|canonical IPA/.test(source)) terminology.push(file);
}
const report = {
  scope: 'Git index plus unignored source candidates; binaries manually reviewed; ignored local output not published',
  scannedFiles: files.length, indexedFiles: git(['ls-files', '-z']).length, findings,
  terminologyReview: terminology,
  runtimeNetworkFindings: findings.filter(item => item.rule.startsWith('runtime-')),
  limitations: 'Heuristic pattern scan and manual code review; not a proof that all possible secrets or platform network behavior have been detected.',
  hashes,
};
await mkdir(resolve(root, 'output'), { recursive: true });
await writeFile(resolve(root, 'output/source-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ scannedFiles: report.scannedFiles, indexedFiles: report.indexedFiles, findings, terminologyReview: terminology }, null, 2));
if (!files.length || findings.length) process.exitCode = 1;
