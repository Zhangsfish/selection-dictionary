export type Rect = { left: number; top: number; right: number; bottom: number };
export type Viewport = { left: number; top: number; width: number; height: number };
export function popupPosition(anchor: Rect, width: number, height: number, view: Viewport) {
  const margin = 8;
  const leftEdge = view.left + margin;
  const topEdge = view.top + margin;
  const rightEdge = view.left + view.width - margin;
  const bottomEdge = view.top + view.height - margin;
  const below = bottomEdge - anchor.bottom - margin;
  const above = anchor.top - margin - topEdge;
  const side = below >= height || below >= above ? 'below' : 'above';
  const maxHeight = Math.max(0, side === 'below' ? below : above);
  const actualHeight = Math.min(height, maxHeight);
  return {
    left: Math.max(leftEdge, Math.min(anchor.left, rightEdge - width)),
    top: Math.max(topEdge, Math.min(side === 'below' ? anchor.bottom + margin : anchor.top - margin - actualHeight, bottomEdge - actualHeight)),
    maxHeight,
  };
}
