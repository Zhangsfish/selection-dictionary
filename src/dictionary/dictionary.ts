import data from '../../data/dictionary.json' with { type: 'json' };
import { lemmaCandidates, wordKey } from './normalize.ts';

export type DictionaryEntry = { word: string; phonetic: string; meaning: string; inflected: boolean };
export type DictionaryData = { entries: Record<string, string[]>; aliases: Record<string, string> };
const dictionary: DictionaryData = data;

export function lookup(text: string, source: DictionaryData = dictionary): DictionaryEntry | null {
  const key = wordKey(text);
  const alias = Object.hasOwn(source.aliases, key) ? source.aliases[key] : '';
  for (const candidate of [key, alias, ...lemmaCandidates(key)]) {
    if (!Object.hasOwn(source.entries, candidate)) continue;
    const [phonetic, meaning] = source.entries[candidate];
    return { word: candidate, phonetic, meaning, inflected: candidate !== key };
  }
  return null;
}
