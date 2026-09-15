import test from 'node:test';
import assert from 'node:assert/strict';
import { SpeechPlayer } from '../src/speech/speech.ts';

function withSpeech(voices: object[], run: (state: any) => void) {
  const scope = globalThis as any;
  const originalWindow = Object.getOwnPropertyDescriptor(scope, 'window');
  const originalUtterance = Object.getOwnPropertyDescriptor(scope, 'SpeechSynthesisUtterance');
  const state = { voices, calls: [] as any[], spoken: [] as any[] };
  class Utterance { text: string; constructor(text: string) { this.text = text; } }
  Object.defineProperty(scope, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance });
  Object.defineProperty(scope, 'window', { configurable: true, value: { speechSynthesis: {
    getVoices: () => state.voices,
    cancel: () => state.calls.push('cancel'),
    speak: (utterance: any) => { state.calls.push('speak'); state.spoken.push(utterance); },
  } } });
  try { run(state); } finally {
    if (originalWindow) Object.defineProperty(scope, 'window', originalWindow); else delete scope.window;
    if (originalUtterance) Object.defineProperty(scope, 'SpeechSynthesisUtterance', originalUtterance); else delete scope.SpeechSynthesisUtterance;
  }
}

test('empty, remote-only, non-English and unmarked voice lists never speak', () => {
  for (const voices of [[], [{ lang: 'en-US', localService: false }], [{ lang: 'zh-CN', localService: true }], [{ lang: 'en-US' }]]) {
    withSpeech(voices, state => {
      let message = '';
      new SpeechPlayer().speak('ownership', text => { message = text; });
      assert.equal(state.spoken.length, 0);
      assert.match(message, /本地英文语音/);
    });
  }
});
test('explicit local voice and original source text are passed after cancellation', () => {
  const local = { lang: 'en-GB', localService: true };
  withSpeech([{ lang: 'en-US', localService: false }, local], state => {
    const player = new SpeechPlayer();
    player.speak('The bottleneck\nshifts downstream.', () => {});
    assert.deepEqual(state.calls, ['cancel', 'speak']);
    assert.equal(state.spoken[0].voice, local);
    assert.equal(state.spoken[0].lang, 'en-GB');
    assert.equal(state.spoken[0].text, 'The bottleneck\nshifts downstream.');
    player.stop();
    assert.deepEqual(state.calls, ['cancel', 'speak', 'cancel']);
  });
});
test('a late local voice requires another explicit click; success clears unavailable notice', () => {
  withSpeech([], state => {
    const player = new SpeechPlayer(); const messages: string[] = [];
    player.speak('ownership', text => messages.push(text));
    state.voices = [{ lang: 'en-US', localService: true }];
    assert.equal(state.spoken.length, 0);
    player.speak('ownership', text => messages.push(text));
    assert.equal(state.spoken.length, 1); assert.equal(messages.at(-1), '');
  });
});
