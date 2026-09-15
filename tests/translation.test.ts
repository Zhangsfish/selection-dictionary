import test from 'node:test';
import assert from 'node:assert/strict';
import { TranslationService, type TranslatorAPI, type TranslationStatus, type LocalTranslator } from '../src/translation/translator.ts';

const controller = () => new AbortController();
const defer = <T>() => { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('unsupported and unavailable APIs are explicit, without fallback network', async () => {
  const states: TranslationStatus[] = [];
  assert.equal(await new TranslationService(() => undefined).translate('hello world', controller().signal, s => states.push(s)), null);
  assert.equal(states.at(-1)?.kind, 'unsupported');
  const api: TranslatorAPI = { availability: async () => 'unavailable', create: async () => { throw Error('must not create'); } };
  await new TranslationService(() => api).translate('hello world', controller().signal, s => states.push(s));
  assert.equal(states.at(-1)?.kind, 'unavailable');
});
test('download requires explicit action, reports progress, shares session and caches translation', async () => {
  let creates = 0, translations = 0;
  const states: TranslationStatus[] = [];
  const api: TranslatorAPI = {
    availability: async options => { assert.deepEqual(options, { sourceLanguage: 'en', targetLanguage: 'zh' }); return 'downloadable'; },
    create: async options => {
      assert.equal(options.sourceLanguage, 'en'); assert.equal(options.targetLanguage, 'zh');
      creates++;
      options.monitor?.({ addEventListener: (_, listener) => listener({ loaded: 0.5 }) });
      return { translate: async () => { translations++; return '你好世界'; }, destroy() {} };
    },
  };
  const service = new TranslationService(() => api);
  await service.translate('hello world', controller().signal, s => states.push(s));
  assert.equal(states.at(-1)?.kind, 'activation'); assert.equal(creates, 0);
  assert.equal(await service.translate('hello world', controller().signal, s => states.push(s), true), '你好世界');
  assert.ok(states.some(s => s.message.includes('50%')));
  assert.equal(await service.translate('hello world', controller().signal, () => {}), '你好世界');
  assert.equal(creates, 1); assert.equal(translations, 1);
});
test('stale translation returns no result, even if engine ignores abort', async () => {
  const response = defer<string>(); const started = defer<void>();
  const api: TranslatorAPI = { availability: async () => 'available', create: async () => ({ translate: () => { started.resolve(); return response.promise; }, destroy() {} }) };
  const service = new TranslationService(() => api); const first = controller();
  const task = service.translate('old sentence', first.signal, () => {});
  await started.promise; first.abort(); response.resolve('旧结果');
  assert.equal(await task, null);
});
test('canceled selections waiting for initialization never enter engine queue', async () => {
  const ready = defer<LocalTranslator>(); const calls: string[] = []; let creates = 0;
  const api: TranslatorAPI = { availability: async () => 'available', create: () => { creates++; return ready.promise; } };
  const service = new TranslationService(() => api); const first = controller();
  const a = service.translate('old', first.signal, () => {}, true);
  first.abort();
  const b = service.translate('new', controller().signal, () => {}, true);
  ready.resolve({ translate: async text => { calls.push(text); return '新结果'; }, destroy() {} });
  assert.equal(await a, null); assert.equal(await b, '新结果');
  assert.deepEqual(calls, ['new']); assert.equal(creates, 1);
});
test('download failure resets creation promise and allows retry', async () => {
  let creates = 0; const states: TranslationStatus[] = [];
  const api: TranslatorAPI = { availability: async () => 'available', create: async () => {
    if (++creates === 1) throw new Error('download failed');
    return { translate: async () => '已恢复', destroy() {} };
  } };
  const service = new TranslationService(() => api);
  assert.equal(await service.translate('test', controller().signal, s => states.push(s), true), null);
  assert.equal(states.at(-1)?.kind, 'error');
  assert.equal(await service.translate('test', controller().signal, () => {}, true), '已恢复');
});
test('activation failure is actionable', async () => {
  const states: TranslationStatus[] = [];
  const api: TranslatorAPI = { availability: async () => 'available', create: async () => { throw new DOMException('activation', 'NotAllowedError'); } };
  await new TranslationService(() => api).translate('test', controller().signal, s => states.push(s));
  assert.equal(states.at(-1)?.kind, 'activation'); assert.ok(states.at(-1)?.action);
});
