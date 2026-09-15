import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// npm ci supplies the pinned test library. Chrome must already be installed.
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'output/playwright');
await mkdir(output, { recursive: true });
const fixture = await readFile(resolve(root, 'tests/fixture.html'), 'utf8');
const context = await chromium.launchPersistentContext(resolve(root, 'output/tmp', `chrome-test-${Date.now()}`), {
  channel: process.env.CHROME_CHANNEL || 'chrome', headless: process.env.HEADED !== '1',
  args: ['--enable-unsafe-extension-debugging'], ignoreDefaultArgs: ['--disable-extensions'],
  viewport: { width: 1100, height: 850 },
});
const browser = context.browser();
context.setDefaultTimeout(10000);
context.setDefaultNavigationTimeout(30000);
const report = { browser: browser.version(), realExtension: true, date: new Date().toISOString(), checks: [], latency: {}, websiteFixtures: [], liveSites: [], limitations: [] };
report.contentSha256 = createHash('sha256').update(await readFile(resolve(root, 'dist/content.js'))).digest('hex');
report.platform = process.platform;
report.node = process.version;
const errors = [];
context.on('page', p => p.on('pageerror', error => errors.push(error.message)));
const check = name => { report.checks.push(name); console.log('PASS', name); };
const host = '#selection-dictionary-popup';

async function select(page, id) {
  await page.locator(`#${id}`).evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
  });
}
async function waitMeaning(page) {
  await page.waitForFunction(() => /[\u3400-\u9fff]/.test(document.querySelector('#selection-dictionary-popup')?.shadowRoot?.querySelector('.meaning')?.textContent ?? ''), null, { timeout: 5000 });
}
async function extensionWorld(page) {
  const cdp = await context.newCDPSession(page);
  const contexts = [];
  cdp.on('Runtime.executionContextCreated', event => contexts.push(event.context));
  await cdp.send('Runtime.enable');
  const world = contexts.find(c => c.origin.startsWith('chrome-extension://'));
  assert.ok(world, 'actual extension isolated world must exist');
  return { cdp, id: world.id };
}
async function evalWorld(world, expression) {
  const result = await world.cdp.send('Runtime.evaluate', { contextId: world.id, expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

try {
  const browserCDP = await browser.newBrowserCDPSession();
  const loaded = await browserCDP.send('Extensions.loadUnpacked', { path: resolve(root, 'dist') });
  report.extensionId = loaded.id;
  check('load unpacked through Chrome Extensions domain');
  // Fixtures use supported HTTPS origins; page documents are intercepted locally.
  for (const origin of ['https://chatgpt.com', 'https://claude.ai', 'https://gemini.google.com']) {
    await context.route(`${origin}/__selection_dictionary_test__`, route => route.fulfill({ contentType: 'text/html', body: fixture }));
    const page = await context.newPage();
    await page.goto(`${origin}/__selection_dictionary_test__`);
    const world = await extensionWorld(page);
    await page.evaluate(() => {
      window.__realInputSamples = [];
      let start = 0;
      window.addEventListener('pointerup', event => {
        if (event.isTrusted) start = performance.now();
      }, true);
      window.addEventListener('pointerup', event => {
        if (!event.isTrusted) return;
        const popup = document.querySelector('#selection-dictionary-popup');
        const meaning = popup?.shadowRoot?.querySelector('.meaning')?.textContent;
        const source = popup?.shadowRoot?.querySelector('.source')?.textContent;
        if (popup && !popup.hidden && meaning && source === getSelection()?.toString()) window.__realInputSamples.push(performance.now() - start);
      });
    });
    report.websiteFixtures.push({ origin, translator: await evalWorld(world, 'typeof globalThis.Translator'), source: 'local fixture, not live website UI' });
    await page.locator('#ownership').dblclick();
    await waitMeaning(page);
    assert.equal(await page.locator(`${host} .source`).textContent(), 'ownership');
    assert.ok(await page.locator(`${host} .phonetic`).textContent());
    check(`${origin}: real double-click selection, Chinese + phonetic`);
    if (origin !== 'https://chatgpt.com') { await page.close(); continue; }

    for (const id of ['downstream', 'bottleneck', 'marginal', 'depreciation', 'throughput', 'ownership']) {
      await page.locator(`#${id}`).dblclick(); await waitMeaning(page);
    }
    const trustedSamples = await page.evaluate(() => window.__realInputSamples);

    await page.evaluate(() => { window.__originalPopup = document.querySelector('#selection-dictionary-popup'); });
    const requests = [];
    page.on('request', req => { if (/^https?:/.test(req.url())) requests.push(req.url()); });
    for (const id of ['downstream', 'bottleneck', 'marginal', 'depreciation', 'throughput', 'companies', 'worked', 'running', 'shifted', 'margin', 'revenue', 'inventory', 'link', 'bold', 'code', 'list']) {
      await select(page, id); await waitMeaning(page);
      assert.equal(await page.locator(`${host} .source`).textContent(), await page.locator(`#${id}`).textContent());
    }
    assert.equal(await page.evaluate(() => window.__originalPopup === document.querySelector('#selection-dictionary-popup')), true);
    assert.deepEqual(requests, []);
    check('16 selections including inflections/link/bold/code/list; same DOM host; zero HTTP requests');

    // Timing: event dispatch through DOM result, plus next animation-frame boundary.
    // rAF is a frame opportunity, not proof of displayed pixels; report separately.
    const samples = await page.evaluate(async () => {
      const samples = [];
      const ids = ['ownership', 'margin', 'revenue', 'inventory', 'depreciation', 'throughput', 'companies', 'worked', 'running', 'shifted'];
      for (let i = 0; i < 100; i++) {
        const element = document.getElementById(ids[i % ids.length]);
        const range = document.createRange(); range.selectNodeContents(element);
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        const start = performance.now();
        element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
        const popup = document.querySelector('#selection-dictionary-popup');
        if (popup.hidden || !popup.shadowRoot.querySelector('.meaning').textContent) throw Error('word result not synchronous');
        const domMs = performance.now() - start;
        const frameMs = await new Promise(done => requestAnimationFrame(() => done(performance.now() - start)));
        samples.push({ domMs, nextFrameMs: frameMs });
      }
      return samples;
    });
    const stats = values => { const sorted = [...values].sort((a, b) => a - b); return { p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1) }; };
    report.latency = { samples: samples.length, eventToDefinitionDOMMs: stats(samples.map(s => s.domMs)), eventToNextAnimationFrameMs: stats(samples.map(s => s.nextFrameMs)), trustedPointerupToDefinitionDOMMs: { ...stats(trustedSamples), raw: trustedSamples, firstPopupMs: trustedSamples[0] }, raw: samples, method: 'synthetic pointerup loop and separate trusted mouse double-click sample; actual MV3 isolated script, preloaded dictionary, headless Chrome; rAF is not paint' };
    check('100 rapid word lookups: synchronous result, no queued dictionary work');

    await page.keyboard.press('Escape'); assert.equal(await page.locator(host).isVisible(), false);
    await select(page, 'ownership'); await waitMeaning(page);
    await page.locator('h1').click(); assert.equal(await page.locator(host).isVisible(), false);
    await select(page, 'ownership'); await waitMeaning(page);
    await page.locator(`${host} .meaning`).click(); assert.equal(await page.locator(host).isVisible(), true);
    check('Escape/outside close; popup interior stays open');

    await page.keyboard.press('Escape');
    await page.locator('#ownership').evaluate(element => {
      const range = document.createRange(); range.setStart(element.firstChild, 0); range.setEnd(element.firstChild, 4);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    await page.waitForFunction(() => document.querySelector('#selection-dictionary-popup').shadowRoot.querySelector('.source').textContent === 'owne');
    await page.locator('#ownership').evaluate(element => getSelection().extend(element.firstChild, 9));
    await page.waitForFunction(() => { const popup = document.querySelector('#selection-dictionary-popup'); return popup && !popup.hidden && popup.shadowRoot.querySelector('.source').textContent === 'ownership'; });
    check('selectionchange-only updates without mouse events');

    await page.evaluate(() => {
      document.querySelector('#ownership').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      document.querySelector('#selection-dictionary-popup').shadowRoot.querySelector('.meaning').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, button: 0 }));
      const range = document.createRange(); range.selectNodeContents(document.querySelector('#throughput'));
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    await page.waitForFunction(() => document.querySelector('#selection-dictionary-popup').shadowRoot.querySelector('.source').textContent === 'throughput');
    check('drag released over popup does not leave selection handling stuck');

    await page.keyboard.press('Escape');
    const phraseRect = await page.locator('#phrase').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element); const r = range.getBoundingClientRect();
      return { left: r.left, right: r.right, y: (r.top + r.bottom) / 2 };
    });
    await page.mouse.move(phraseRect.left - 1, phraseRect.y); await page.mouse.down();
    await page.mouse.move(phraseRect.right + 1, phraseRect.y, { steps: 5 }); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('#selection-dictionary-popup').shadowRoot.querySelector('.source').textContent.trim() === 'gross margin');
    check('native mouse drag selects phrase and opens translation path');

    await select(page, 'edge'); await waitMeaning(page);
    const box = await page.locator(`${host} .card`).boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 1100 && box.y + box.height <= 850);
    await page.screenshot({ path: resolve(output, 'edge-light.png') });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: resolve(output, 'edge-dark.png') });
    check('bottom-right viewport positioning; light/dark screenshots');
    await page.setViewportSize({ width: 280, height: 400 });
    await select(page, 'edge'); await waitMeaning(page);
    const narrow = await page.locator(`${host} .card`).boundingBox();
    assert.ok(narrow.x >= 0 && narrow.y >= 0 && narrow.x + narrow.width <= 280 && narrow.y + narrow.height <= 400);
    check('narrow viewport keeps complete popup within bounds');
    await page.setViewportSize({ width: 1100, height: 850 });
    await select(page, 'edge'); await waitMeaning(page);
    await page.mouse.wheel(0, 250);
    await page.waitForFunction(() => document.querySelector('#selection-dictionary-popup').hidden);
    await page.evaluate(() => window.scrollTo(0, 0));
    check('scroll closes popup and invalidates work');

    await page.locator('textarea').click(); await page.keyboard.press('ControlOrMeta+A');
    assert.equal(await page.locator(host).isVisible(), false);
    check('editable text does not trigger lookup');
    await page.locator('h1').click();
    await page.locator('#stream').evaluate(element => { const span = document.createElement('span'); span.id = 'streamed-word'; span.textContent = ' ownership'; element.append(span); });
    await select(page, 'streamed-word'); await waitMeaning(page);
    check('newly streamed DOM text works without site-specific selectors');

    // Native API availability, without initiating a model download.
    report.nativeTranslation = await evalWorld(world, `(async()=>{try{return {type:typeof Translator,availability:typeof Translator==='undefined'?'unsupported':await Translator.availability({sourceLanguage:'en',targetLanguage:'zh'})}}catch(e){return {error:e.name+': '+e.message}}})()`);
    await select(page, 'sentence');
    await page.waitForFunction(() => document.querySelector('#selection-dictionary-popup').shadowRoot.querySelector('.status').textContent !== '正在检查本地翻译…');
    report.nativeTranslation.ui = await page.locator(`${host} .status`).textContent();
    await page.screenshot({ path: resolve(output, 'native-translation-state.png') });
    check('native Translator API availability and honest UI state');

    // Isolated-world mock: exercise races/download/TTS wiring without claiming real model/audio output.
    await evalWorld(world, `globalThis.Translator = {availability:async()=> 'downloadable', create: async(options)=>{globalThis.__creates=(globalThis.__creates||0)+1; options.monitor?.({addEventListener:(_,fn)=>fn({loaded:1})}); return {destroy(){},translate:(text,{signal}={})=>new Promise(resolve=>{globalThis.__pending??=[];globalThis.__pending.push({text,signal,resolve})})}}}`);
    await select(page, 'phrase');
    await page.locator(`${host} .action`).waitFor({ state: 'visible' });
    await page.locator(`${host} .action`).click();
    await page.waitForFunction(() => document.querySelector('#selection-dictionary-popup').shadowRoot.querySelector('.status').textContent === '正在本地翻译…');
    await select(page, 'sentence');
    await evalWorld(world, `new Promise(resolve=>{const check=()=>globalThis.__pending?.length===2?resolve(true):requestAnimationFrame(check);check()})`);
    assert.equal(await evalWorld(world, '__pending[0].signal.aborted'), true);
    await evalWorld(world, `__pending[1].resolve('瓶颈向下游转移。'); true`);
    await waitMeaning(page);
    await evalWorld(world, `__pending[0].resolve('旧短语结果'); true`);
    assert.equal(await page.locator(`${host} .meaning`).textContent(), '瓶颈向下游转移。');
    check('mock model: explicit activation, cancel old request, late result cannot overwrite new selection');

    await select(page, 'paragraph');
    await evalWorld(world, `new Promise(resolve=>{const check=()=>globalThis.__pending?.length===3?resolve(true):requestAnimationFrame(check);check()})`);
    await page.keyboard.press('Escape');
    await evalWorld(world, `__pending[2].resolve('迟来的段落'); true`);
    assert.equal(await page.locator(host).isVisible(), false);
    check('paragraph translation completion after Escape cannot reopen popup');

    await evalWorld(world, `globalThis.SpeechSynthesisUtterance=class { constructor(text){this.text=text} }; globalThis.__speechCalls=[]; globalThis.__voices=[]; speechSynthesis.cancel=()=>__speechCalls.push('cancel'); speechSynthesis.getVoices=()=>__voices; speechSynthesis.speak=u=>__speechCalls.push({text:u.text,lang:u.lang,local:u.voice?.localService})`);
    await select(page, 'ownership'); await waitMeaning(page);
    assert.deepEqual(await evalWorld(world, '__speechCalls'), []);
    await page.locator(`${host} .speak`).click();
    assert.deepEqual(await evalWorld(world, '__speechCalls'), ['cancel']);
    assert.match(await page.locator(`${host} .notice`).textContent(), /本地英文语音/);
    await evalWorld(world, `__voices=[{lang:'en-US',localService:false}]; true`);
    await page.locator(`${host} .speak`).click();
    assert.deepEqual(await evalWorld(world, '__speechCalls'), ['cancel', 'cancel']);
    check('local-only TTS refuses empty and remote-only voice lists');
    await evalWorld(world, `__voices=[{lang:'en-US',localService:true}]; true`);
    assert.deepEqual(await evalWorld(world, '__speechCalls'), ['cancel', 'cancel']);
    await page.locator(`${host} .speak`).click();
    assert.deepEqual(await evalWorld(world, '__speechCalls'), ['cancel', 'cancel', 'cancel', { text: 'ownership', lang: 'en-US', local: true }]);
    assert.equal(await page.locator(`${host} .notice`).isVisible(), false);
    assert.equal(await page.locator(host).isVisible(), true);
    check('mock speech: no autoplay, explicit local voice, cancel before speak, original English');
    await world.cdp.detach(); await page.close();
  }
  assert.deepEqual(errors, []);
  check('no browser JavaScript errors');
  report.limitations.push('Fixture origins validate matching/injection only, not authenticated live site layouts.', 'Mock translation race and TTS wiring tests do not prove model quality, model latency, or audible voice output.');
} catch (error) {
  const lastPage = context.pages().at(-1);
  if (lastPage) {
    report.failureState = await lastPage.evaluate(() => ({ selection: getSelection()?.toString(), active: document.activeElement?.outerHTML.slice(0, 120), popup: document.querySelector('#selection-dictionary-popup')?.shadowRoot?.textContent, hidden: document.querySelector('#selection-dictionary-popup')?.hidden })).catch(() => null);
    await lastPage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  }
  report.failure = error.stack; throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
