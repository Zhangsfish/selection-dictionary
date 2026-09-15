import { lookup } from '../dictionary/dictionary.ts';
import { RequestIdentity } from '../shared/request.ts';
import { TranslationService } from '../translation/translator.ts';
import { SpeechPlayer } from '../speech/speech.ts';
import { DictionaryPopup } from './popup.ts';
import { readSelection, sameSelection, type SelectionSnapshot } from './selection.ts';

const requests = new RequestIdentity();
const translator = new TranslationService();
const speech = new SpeechPlayer();
let popup: DictionaryPopup | undefined;
let active: SelectionSnapshot | null = null;
let dismissed: SelectionSnapshot | null = null;
let pointerDown = false;
let frame = 0;

function close() {
  dismissed = active ?? readSelection(popup?.host);
  active = null; requests.cancel(); speech.stop(); popup?.hide();
  cancelAnimationFrame(frame); frame = 0;
}

function translate(snapshot: SelectionSnapshot, activated = false) {
  const request = requests.next();
  if (snapshot.text.length > 6000) {
    popup!.translationStatus({ kind: 'error', message: '请选择较短的段落（最多 6,000 字符）。' });
    return;
  }
  void translator.translate(snapshot.text, request.signal, status => {
    if (request.current() && popup?.visible) popup.translationStatus(status);
  }, activated).then(result => {
    if (result !== null && request.current() && popup?.visible) popup.translation(result);
  });
}

function ensurePopup(): DictionaryPopup {
  if (popup) return popup;
  popup = new DictionaryPopup();
  popup.onClose = close;
  popup.onSpeak = () => {
    const snapshot = active;
    if (snapshot) speech.speak(snapshot.original, message => { if (active === snapshot) popup!.speechNotice(message); });
  };
  popup.onAction = () => {
    if (active?.kind === 'text') {
      const kind = popup!.host.shadowRoot!.querySelector<HTMLButtonElement>('.action')!.dataset.kind;
      translate(active, kind !== 'unavailable');
    }
  };
  return popup;
}

function update() {
  if (pointerDown) return;
  const snapshot = readSelection(popup?.host);
  if (!snapshot) { close(); return; }
  if (sameSelection(snapshot, dismissed) || (popup?.visible && sameSelection(snapshot, active))) return;
  dismissed = null; active = snapshot; requests.cancel(); speech.stop();
  const panel = ensurePopup();
  panel.show(snapshot.original, snapshot.kind === 'word', snapshot.anchor);
  if (snapshot.kind === 'word') panel.definition(lookup(snapshot.text));
  else translate(snapshot);
}

document.addEventListener('pointerdown', event => {
  if (popup?.contains(event) || event.button !== 0) return;
  pointerDown = true; dismissed = null; active = null;
  requests.cancel(); speech.stop();
}, true);
document.addEventListener('pointerup', event => {
  if (event.button !== 0) return;
  const startedOutside = pointerDown;
  pointerDown = false;
  // A drag can start in the page and finish over our popup. Always release drag state.
  if (!startedOutside && popup?.contains(event)) return;
  update();
}, true);
document.addEventListener('dblclick', event => { if (!popup?.contains(event)) update(); }, true);
document.addEventListener('pointercancel', () => { pointerDown = false; close(); }, true);
document.addEventListener('selectionchange', () => {
  if (pointerDown || frame || (popup?.visible && document.activeElement === popup.host)) return;
  frame = requestAnimationFrame(() => { frame = 0; update(); });
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); }, true);
document.addEventListener('scroll', event => { if (!popup?.contains(event)) close(); }, true);
window.addEventListener('resize', close);
window.visualViewport?.addEventListener('resize', close);
window.visualViewport?.addEventListener('scroll', close);
window.addEventListener('blur', () => { pointerDown = false; close(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
