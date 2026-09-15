import { popupPosition, type Rect } from './position.ts';
import type { DictionaryEntry } from '../dictionary/dictionary.ts';
import type { TranslationStatus } from '../translation/translator.ts';

const styles = `
:host { all: initial; position: fixed; inset: auto; margin: 0; padding: 0; border: 0; background: transparent; z-index: 2147483647; color-scheme: light dark; }
:host([hidden]) { display: none !important; }
* { box-sizing: border-box; }
.card { --bg:#fff; --fg:#202124; --muted:#666d75; --line:#e1e4e8; --hover:#f1f3f5; margin:0; padding:13px 15px; width:100%; overflow:auto; overscroll-behavior:contain; background:var(--bg); color:var(--fg); border:1px solid var(--line); border-radius:9px; box-shadow:0 5px 22px #0002; font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif; text-align:left; }
@media (prefers-color-scheme: dark) { .card { --bg:#25272b; --fg:#eeeff1; --muted:#b6bcc5; --line:#45494f; --hover:#363a40; box-shadow:0 5px 22px #0005; } }
.top { display:flex; gap:10px; align-items:start; }
.source { flex:1; min-width:0; font-size:15px; font-weight:600; overflow-wrap:anywhere; white-space:pre-wrap; margin:0; }
.source.sentence { font-size:13px; font-weight:400; color:var(--muted); max-height:116px; overflow:auto; }
.tools { display:flex; gap:2px; }
button { font:inherit; cursor:pointer; color:var(--muted); background:transparent; border:0; border-radius:5px; padding:4px; line-height:1; }
button:hover { background:var(--hover); color:var(--fg); }
button:focus-visible { outline:2px solid #6b93d3; outline-offset:2px; }
svg { display:block; width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.phonetic { color:var(--muted); font-size:13px; margin-top:2px; overflow-wrap:anywhere; }
.meaning { margin-top:7px; white-space:pre-wrap; overflow-wrap:anywhere; }
.status,.notice { color:var(--muted); font-size:12px; margin-top:7px; }
.action { margin-top:9px; padding:7px 9px; border:1px solid var(--line); line-height:1.2; }
[hidden] { display:none !important; }
`;

export class DictionaryPopup {
  readonly host = document.createElement('div');
  private root = this.host.attachShadow({ mode: 'open' });
  private card: HTMLElement;
  private source: HTMLElement;
  private phonetic: HTMLElement;
  private meaning: HTMLElement;
  private status: HTMLElement;
  private notice: HTMLElement;
  private action: HTMLButtonElement;
  private anchor: Rect | null = null;
  onSpeak = () => {};
  onAction = () => {};
  onClose = () => {};

  constructor() {
    this.host.id = 'selection-dictionary-popup';
    this.host.setAttribute('popover', 'manual');
    this.host.hidden = true;
    // This is static UI markup only. All selected/data text is assigned via textContent.
    this.root.innerHTML = `<style>${styles}</style><section class="card" role="dialog" aria-label="划词词典" lang="zh-CN">
      <div class="top"><div class="source" lang="en"></div><div class="tools">
      <button class="speak" aria-label="朗读英文" title="朗读英文"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14"/></svg></button>
      <button class="close" aria-label="关闭" title="关闭 (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12 M18 6 6 18"/></svg></button>
      </div></div><div class="phonetic" lang="en"></div><div class="meaning" aria-live="polite"></div>
      <div class="status" role="status"></div><button class="action" hidden></button><div class="notice" role="status" hidden></div></section>`;
    const get = <T extends HTMLElement>(selector: string) => this.root.querySelector<T>(selector)!;
    this.card = get('.card'); this.source = get('.source'); this.phonetic = get('.phonetic');
    this.meaning = get('.meaning'); this.status = get('.status'); this.notice = get('.notice'); this.action = get('.action');
    get('.speak').addEventListener('click', () => this.onSpeak());
    get('.close').addEventListener('click', () => this.onClose());
    this.action.addEventListener('click', () => this.onAction());
    // Preserve source selection while still allowing keyboard focus on controls.
    this.host.addEventListener('mousedown', event => event.preventDefault());
    document.documentElement.append(this.host);
  }
  contains(event: Event): boolean { return event.composedPath().includes(this.host); }
  get visible(): boolean { return !this.host.hidden; }
  show(text: string, word: boolean, anchor: Rect) {
    this.anchor = anchor;
    this.source.textContent = text;
    this.source.classList.toggle('sentence', !word);
    this.phonetic.textContent = ''; this.phonetic.hidden = true;
    this.meaning.textContent = ''; this.status.textContent = word ? '' : '正在检查本地翻译…';
    this.action.hidden = true; this.notice.hidden = true;
    this.host.hidden = false;
    if (!this.host.matches(':popover-open')) this.host.showPopover();
    this.position();
  }
  definition(entry: DictionaryEntry | null) {
    if (!entry) { this.meaning.textContent = '本地词典未收录此词。'; this.position(); return; }
    this.phonetic.textContent = [entry.inflected ? `原形 ${entry.word}` : '', entry.phonetic.trim() ? `音标 ${entry.phonetic}` : '音标暂缺'].filter(Boolean).join(' · ');
    this.phonetic.hidden = false; this.meaning.textContent = entry.meaning;
    this.position();
  }
  translation(text: string) {
    this.meaning.textContent = text; this.status.textContent = ''; this.action.hidden = true; this.position();
  }
  translationStatus(status: TranslationStatus) {
    this.status.textContent = status.message;
    this.action.hidden = !status.action; this.action.textContent = status.action ?? '';
    this.action.dataset.kind = status.kind;
    this.position();
  }
  speechNotice(message: string) { this.notice.textContent = message; this.notice.hidden = !message; this.position(); }
  hide() {
    if (this.host.matches(':popover-open')) this.host.hidePopover();
    this.host.hidden = true;
  }
  position() {
    if (!this.anchor || !this.visible) return;
    const visual = window.visualViewport;
    const view = { left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0, width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight };
    this.host.style.width = `${Math.min(380, Math.max(0, view.width - 16))}px`;
    this.card.style.maxHeight = `${Math.max(0, view.height - 16)}px`;
    const box = this.card.getBoundingClientRect();
    const position = popupPosition(this.anchor, box.width, box.height, view);
    this.host.style.left = `${position.left}px`; this.host.style.top = `${position.top}px`;
    this.card.style.maxHeight = `${position.maxHeight}px`;
  }
}
