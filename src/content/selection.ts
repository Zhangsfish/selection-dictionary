import { normalizeSelection, type SelectionText } from '../dictionary/normalize.ts';
import type { Rect } from './position.ts';
export type SelectionSnapshot = SelectionText & { anchor: Rect; range: Range };

function elementFor(node: Node | null): Element | null {
  return node instanceof Element ? node : node?.parentElement ?? null;
}
function isEditor(node: Node | null): boolean {
  const element = elementFor(node);
  return !!element?.closest('input, textarea, select, [role="textbox"]') || (element instanceof HTMLElement && element.isContentEditable);
}

export function readSelection(host: HTMLElement | undefined): SelectionSnapshot | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  if (isEditor(selection.anchorNode) || isEditor(selection.focusNode)) return null;
  if (selection.anchorNode?.getRootNode() === host?.shadowRoot || selection.focusNode?.getRootNode() === host?.shadowRoot) return null;
  const normalized = normalizeSelection(selection.toString());
  if (normalized.kind === 'ignore') return null;
  const range = selection.getRangeAt(0).cloneRange();
  const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
  if (!rects.length) return null;
  const backwards = selection.focusNode === range.startContainer && selection.focusOffset === range.startOffset;
  const rect = backwards ? rects[0] : rects[rects.length - 1];
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return null;
  return { ...normalized, range, anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } };
}

export function sameSelection(a: SelectionSnapshot | null, b: SelectionSnapshot | null): boolean {
  return !!a && !!b && a.text === b.text && a.range.startContainer === b.range.startContainer
    && a.range.startOffset === b.range.startOffset && a.range.endContainer === b.range.endContainer
    && a.range.endOffset === b.range.endOffset;
}
