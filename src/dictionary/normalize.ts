export type SelectionText = { original: string; text: string; kind: 'word' | 'text' | 'ignore' };

export function normalizeSelection(original: string): SelectionText {
  const text = original.replace(/[\u200b\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  if (!text || !/[a-z]/i.test(text)) return { original, text, kind: 'ignore' };
  const word = /^[a-z]+(?:['’\-][a-z]+)*$/i.test(text) && text.length <= 80;
  return { original, text, kind: word ? 'word' : 'text' };
}

export function wordKey(text: string): string {
  return text.trim().replace(/’/g, "'").toLowerCase();
}

// Conservative candidates, validated against the dictionary. Exact entries always win.
export function lemmaCandidates(word: string): string[] {
  const candidates: string[] = [];
  const add = (...values: string[]) => candidates.push(...values.filter(v => v.length >= 2));
  if (word.endsWith("'s")) add(word.slice(0, -2));
  if (word.endsWith('ies') || word.endsWith('ied')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('ing') && word.length > 4) {
    const stem = word.slice(0, -3);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1));
    if (stem.endsWith('y')) add(stem.slice(0, -1) + 'ie');
    add(stem, stem + 'e');
  }
  if (word.endsWith('ed') && word.length > 3) {
    const stem = word.slice(0, -2);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1));
    add(word.slice(0, -1), stem);
  }
  if (/(?:ches|shes|xes|zes|sses|oes)$/.test(word)) add(word.slice(0, -2));
  if (word.endsWith('s') && !/(?:ss|us|is)$/.test(word)) add(word.slice(0, -1));
  return [...new Set(candidates)];
}
