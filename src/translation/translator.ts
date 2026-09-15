export type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
export type TranslationStatus = {
  kind: 'unsupported' | 'unavailable' | 'activation' | 'downloading' | 'translating' | 'error';
  message: string;
  action?: string;
};
export interface LocalTranslator {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
export interface TranslatorAPI {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(options: {
    sourceLanguage: string; targetLanguage: string;
    monitor?: (monitor: { addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void }) => void;
  }): Promise<LocalTranslator>;
}
type Report = (status: TranslationStatus) => void;
const languages = { sourceLanguage: 'en', targetLanguage: 'zh' };

export class TranslationService {
  private instance: LocalTranslator | null = null;
  private creating: Promise<LocalTranslator> | null = null;
  private reporters = new Set<Report>();
  private progress: TranslationStatus = { kind: 'downloading', message: '正在准备本地翻译模型…' };
  private cache = new Map<string, string>();
  private getAPI: () => TranslatorAPI | undefined;

  constructor(getAPI: () => TranslatorAPI | undefined = () => (globalThis as typeof globalThis & { Translator?: TranslatorAPI }).Translator) {
    this.getAPI = getAPI;
  }

  private create(api: TranslatorAPI): Promise<LocalTranslator> {
    this.progress = { kind: 'downloading', message: '正在准备本地翻译模型…首次可能需要下载。' };
    // Called synchronously from the enable/retry button to retain user activation.
    const creating = api.create({ ...languages, monitor: monitor => {
      monitor.addEventListener('downloadprogress', event => {
        const percent = Math.round(Math.max(0, Math.min(1, event.loaded)) * 100);
        this.progress = { kind: 'downloading', message: `正在准备本地翻译模型…${percent}%` };
        this.reporters.forEach(report => report(this.progress));
      });
    } }).then(instance => { this.instance = instance; return instance; });
    this.creating = creating;
    void creating.finally(() => { if (this.creating === creating) this.creating = null; }).catch(() => {});
    return creating;
  }

  async translate(text: string, signal: AbortSignal, report: Report, activated = false): Promise<string | null> {
    const safeReport: Report = status => { if (!signal.aborted) report(status); };
    const remove = () => this.reporters.delete(safeReport);
    this.reporters.add(safeReport);
    signal.addEventListener('abort', remove, { once: true });
    try {
      signal.throwIfAborted();
      if (this.cache.has(text)) {
        const cached = this.cache.get(text)!;
        this.cache.delete(text); this.cache.set(text, cached);
        return cached;
      }
      const api = this.getAPI();
      if (!api) {
        safeReport({ kind: 'unsupported', message: '此浏览器或页面未提供本地翻译 API。请使用支持该功能的桌面版 Chrome；单词查词仍可使用。' });
        return null;
      }
      if (!this.instance && !this.creating) {
        if (activated) {
          this.create(api);
        } else {
          const availability = await api.availability(languages);
          signal.throwIfAborted();
          // Another selection may have initialized the shared session meanwhile.
          if (!this.instance && !this.creating) {
            if (availability === 'unavailable') {
              safeReport({ kind: 'unavailable', message: '当前设备或页面无法使用英→简中本地翻译。单词查词仍可使用。', action: '重新检查' });
              return null;
            }
            if (availability !== 'available') {
              safeReport({ kind: 'activation', message: availability === 'downloading' ? '本地翻译模型正在准备，点击继续。' : '首次使用需启用本地翻译，Chrome 可能下载语言模型。', action: '启用本地翻译' });
              return null;
            }
            this.create(api);
          }
        }
      }
      if (this.creating) safeReport(this.progress);
      const instance = this.instance ?? await this.creating!;
      signal.throwIfAborted();
      safeReport({ kind: 'translating', message: '正在本地翻译…' });
      const result = await instance.translate(text, { signal });
      signal.throwIfAborted();
      if (!result.trim()) throw new Error('Empty translation');
      this.cache.set(text, result);
      if (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
      return result;
    } catch (error) {
      if (signal.aborted) return null;
      const name = error instanceof Error ? error.name : '';
      if (name === 'NotAllowedError') {
        safeReport({ kind: 'activation', message: 'Chrome 需要一次点击以启用翻译；页面策略也可能限制此功能。', action: '启用本地翻译' });
      } else {
        if (name === 'InvalidStateError') { this.instance?.destroy(); this.instance = null; }
        safeReport({ kind: 'error', message: name === 'QuotaExceededError' ? '所选内容超出本地模型限制，请选择更短的段落。' : '本地翻译未完成。可能是模型下载失败或设备暂不可用。', action: '重试' });
      }
      return null;
    } finally {
      remove(); signal.removeEventListener('abort', remove);
    }
  }
}
