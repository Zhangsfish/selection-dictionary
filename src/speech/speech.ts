export function chooseEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find(v => v.localService === true && /^en[-_]US$/i.test(v.lang))
    ?? voices.find(v => v.localService === true && /^en(?:[-_]|$)/i.test(v.lang));
}

export class SpeechPlayer {
  private current: SpeechSynthesisUtterance | null = null;
  stop() {
    if (this.current) { this.current = null; window.speechSynthesis?.cancel(); }
  }
  speak(original: string, report: (message: string) => void) {
    if (!('speechSynthesis' in window)) { report('当前浏览器不支持朗读。'); return; }
    this.current = null;
    window.speechSynthesis.cancel();
    const voice = chooseEnglishVoice(window.speechSynthesis.getVoices());
    if (!voice) {
      report('没有可用的本地英文语音，请在系统中启用后重试。');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(original);
    // Never leave voice unset: the browser default could be a remote service.
    utterance.voice = voice;
    utterance.lang = voice.lang;
    report('');
    utterance.onend = () => { if (this.current === utterance) { this.current = null; report(''); } };
    utterance.onerror = event => {
      if (this.current !== utterance) return;
      this.current = null;
      if (event.error !== 'canceled' && event.error !== 'interrupted') report('朗读失败，请检查系统英文语音后重试。');
    };
    this.current = utterance;
    try { window.speechSynthesis.speak(utterance); }
    catch { this.current = null; report('朗读暂不可用，请重试。'); }
  }
}
