import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSelection, lemmaCandidates, wordKey } from '../src/dictionary/normalize.ts';
import { lookup } from '../src/dictionary/dictionary.ts';
import { RequestIdentity } from '../src/shared/request.ts';
import { popupPosition } from '../src/content/position.ts';
import { chooseEnglishVoice } from '../src/speech/speech.ts';

test('normalize whitespace without losing original selection', () => {
  const original = '  The\n bottleneck\t shifts downstream.  ';
  assert.deepEqual(normalizeSelection(original), { original, text: 'The bottleneck shifts downstream.', kind: 'text' });
  assert.equal(normalizeSelection('owner\u200bship').text, 'ownership');
});
test('transparent word / phrase / ignore classification', () => {
  for (const word of ['ownership', "don't", 'company’s', 'well-known', 'API']) assert.equal(normalizeSelection(word).kind, 'word');
  for (const text of ['gross margin', 'The bottleneck shifts downstream.', 'word.', 'a_b', 'GPT-4']) assert.equal(normalizeSelection(text).kind, 'text');
  for (const text of ['', '\n\t', '中文', '1234']) assert.equal(normalizeSelection(text).kind, 'ignore');
  assert.equal(wordKey(' COMPANY’S '), "company's");
});
test('requested vocabulary has actual Chinese definitions and phonetics', () => {
  for (const word of ['ownership', 'downstream', 'bottleneck', 'marginal', 'depreciation', 'throughput']) {
    const entry = lookup(word);
    assert.ok(entry, word); assert.match(entry.meaning, /[\u3400-\u9fff]/); assert.ok(entry.phonetic, word);
  }
});
test('morphology resolves common suffixes and only returns dictionary-backed candidates', () => {
  const source = { entries: Object.fromEntries(['company', 'work', 'run', 'shift', 'make', 'stop', 'box', 'die'].map(w => [w, ['', '测试']])), aliases: {} };
  for (const [word, base] of [['companies', 'company'], ['worked', 'work'], ['running', 'run'], ['shifted', 'shift'], ['making', 'make'], ['stopped', 'stop'], ['boxes', 'box'], ['dying', 'die']]) {
    assert.equal(lookup(word, source)?.word, base, word);
    assert.equal(lookup(word, source)?.inflected, true);
  }
  assert.equal(lookup('zzzzworked', source), null);
  assert.deepEqual(lemmaCandidates('analysis'), []);
});
test('exact meanings win over stemming and prototype properties are not words', () => {
  const source = { entries: { saw: ['', '锯'], see: ['', '看'] }, aliases: { saw: 'see' } };
  assert.equal(lookup('saw', source)?.meaning, '锯');
  assert.equal(lookup('__proto__'), null); assert.equal(lookup('toString'), null);
  assert.equal(lookup('zzzznotarealword'), null);
});
test('request changes and close invalidate old callbacks and abort old work', () => {
  const identity = new RequestIdentity();
  const first = identity.next(); const second = identity.next();
  assert.equal(first.current(), false); assert.equal(first.signal.aborted, true);
  assert.equal(second.current(), true); identity.cancel();
  assert.equal(second.current(), false); assert.equal(second.signal.aborted, true);
});
test('popup positioning stays in viewport and avoids selected line', () => {
  const view = { left: 0, top: 0, width: 800, height: 600 };
  const regular = popupPosition({ left: 80, top: 50, right: 140, bottom: 70 }, 380, 150, view);
  assert.equal(regular.top, 78);
  const corner = popupPosition({ left: 760, top: 560, right: 795, bottom: 585 }, 380, 150, view);
  assert.ok(corner.left >= 8 && corner.left + 380 <= 792);
  assert.ok(corner.top + 150 <= 552);
  const huge = popupPosition({ left: 0, top: 300, right: 100, bottom: 320 }, 380, 1000, view);
  assert.ok(huge.top >= 8); assert.ok(huge.top + huge.maxHeight <= 592);
});
test('voice choice only accepts explicitly local English voices', () => {
  const voices = [{ lang: 'zh-CN', localService: true }, { lang: 'en-US', localService: false }, { lang: 'en-GB', localService: true }] as SpeechSynthesisVoice[];
  assert.equal(chooseEnglishVoice(voices), voices[2]);
  assert.equal(chooseEnglishVoice(voices.slice(0, 2)), undefined);
  assert.equal(chooseEnglishVoice([]), undefined);
  assert.equal(chooseEnglishVoice([{ lang: 'en-US' }] as SpeechSynthesisVoice[]), undefined);
  const localUS = { lang: 'en-US', localService: true } as SpeechSynthesisVoice;
  assert.equal(chooseEnglishVoice([...voices, localUS]), localUS);
});
