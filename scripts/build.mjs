import { build } from 'esbuild';
import { mkdir, copyFile, writeFile, stat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) throw Error('manifest/package version mismatch');
const metadata = JSON.parse(await readFile(resolve(root, 'data/metadata.json'), 'utf8'));
const pin = JSON.parse(await readFile(resolve(root, 'data/source.json'), 'utf8'));
for (const [file, expected] of [['data/dictionary.json', metadata.outputSha256], ['data/ECDICT-LICENSE.txt', pin.licenseSha256]]) {
  if (createHash('sha256').update(await readFile(resolve(root, file))).digest('hex') !== expected) throw Error(`Integrity mismatch: ${file}`);
}
await mkdir(resolve(root, 'dist'), { recursive: true });
const result = await build({
  absWorkingDir: root, entryPoints: ['src/content/content.ts'],
  outfile: 'dist/content.js', bundle: true, format: 'iife', platform: 'browser',
  target: `chrome${manifest.minimum_chrome_version}`, minify: true, sourcemap: true, metafile: true,
  legalComments: 'eof', charset: 'utf8',
  banner: { js: `/* Selection Dictionary v${pkg.version}: MIT, see LICENSE. ECDICT data: see ECDICT-LICENSE.txt and THIRD_PARTY_NOTICES.md. */` },
});
for (const [from, to] of [['manifest.json', 'manifest.json'], ['LICENSE', 'LICENSE'], ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'], ['data/ECDICT-LICENSE.txt', 'ECDICT-LICENSE.txt'], ['data/metadata.json', 'dictionary-metadata.json']]) {
  await copyFile(resolve(root, from), resolve(root, 'dist', to));
}
await mkdir(resolve(root, 'output'), { recursive: true });
await writeFile(resolve(root, 'output/build-meta.json'), JSON.stringify(result.metafile, null, 2));
await writeFile(resolve(root, 'dist/INSTALL.txt'), `Selection Dictionary v${pkg.version}\nChrome desktop 138+\n\n1. 打开 Chrome 的 chrome://extensions/\n2. 开启开发者模式，点击“加载已解压的扩展程序”。\n3. 选择包含 manifest.json 的本文件夹。\n4. 刷新 ChatGPT / Claude / Gemini 页面，然后双击英文单词。\n\n划选句子时，首次可能需要点击“启用本地翻译”并等待 Chrome 准备语言模型。\n单词查词离线；句子翻译取决于浏览器、模型和设备支持。点击喇叭使用本地英文语音朗读；无本地语音时显示不可用，不使用远程语音。\n\n词典数据来源 ECDICT，MIT 许可，原文见 ECDICT-LICENSE.txt。\n`);
console.log(`Built dist/content.js: ${(await stat(resolve(root, 'dist/content.js'))).size} bytes`);
