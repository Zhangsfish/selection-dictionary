import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const entries = JSON.parse(await readFile(resolve(root, 'data/dictionary.json'), 'utf8')).entries;
const context = await chromium.launchPersistentContext(resolve(root, 'output/tmp', `chrome-live-${Date.now()}`), {
  channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-extensions'],
  args: ['--enable-unsafe-extension-debugging'], viewport: { width: 1280, height: 900 },
});
const results = { browser: context.browser().version(), date: new Date().toISOString(), sites: [], authenticated: false };
try {
  const browserCDP = await context.browser().newBrowserCDPSession();
  await browserCDP.send('Extensions.loadUnpacked', { path: resolve(root, 'dist') });
  const urls = process.argv.slice(2);
  for (const url of urls.length ? urls : ['https://chatgpt.com/', 'https://claude.ai/', 'https://gemini.google.com/']) {
    const page = await context.newPage();
    const record = { url }; results.sites.push(record);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForFunction(() => document.body?.innerText.trim().length > 30, null, { timeout: 12000 }).catch(() => {});
      record.finalUrl = page.url(); record.title = await page.title();
      record.preview = (await page.locator('body').innerText()).slice(0, 600);
      record.securityChallenge = /Just a moment|请稍候|安全验证|verify you are human/i.test(record.title + record.preview);
      const cdp = await context.newCDPSession(page);
      const worlds = [];
      cdp.on('Runtime.executionContextCreated', e => worlds.push(e.context));
      await cdp.send('Runtime.enable');
      record.extensionInjected = worlds.some(c => c.origin.startsWith('chrome-extension://'));
      record.word = await page.evaluate(knownWords => {
        const known = new Set(knownWords);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const parent = node.parentElement;
          if (!parent || parent.closest('script,style,textarea,input,button,[contenteditable="true"],#selection-dictionary-popup')) continue;
          const bounds = parent.getBoundingClientRect();
          if (!bounds.width || !bounds.height || bounds.top < 0 || bounds.bottom > innerHeight) continue;
          const matches = [...node.textContent.matchAll(/\b[a-zA-Z]{4,}\b/g)];
          const match = matches.find(m => known.has(m[0].toLowerCase()));
          if (!match) continue;
          const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
          parent.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
          parent.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
          return match[0];
        }
        return null;
      }, Object.keys(entries));
      if (record.word) {
        await page.waitForFunction(() => /[\u3400-\u9fff]/.test(document.querySelector('#selection-dictionary-popup')?.shadowRoot?.querySelector('.meaning')?.textContent ?? ''), null, { timeout: 8000 });
        record.meaning = await page.locator('#selection-dictionary-popup .meaning').textContent();
        record.phonetic = await page.locator('#selection-dictionary-popup .phonetic').textContent();
        record.popupVisible = await page.locator('#selection-dictionary-popup').isVisible();
      }
      await page.screenshot({ path: resolve(root, 'output/playwright', `live-${new URL(url).hostname}.png`) });
    } catch (error) { record.error = error.message; }
    console.log(JSON.stringify(record));
    await page.close();
  }
} finally {
  await mkdir(resolve(root, 'output/playwright'), { recursive: true });
  await writeFile(resolve(root, 'output/playwright', process.argv.length > 2 ? 'live-sites-targeted.json' : 'live-sites.json'), JSON.stringify(results, null, 2));
  await context.close();
}
