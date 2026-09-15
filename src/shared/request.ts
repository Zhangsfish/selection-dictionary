export class RequestIdentity {
  private version = 0;
  private controller = new AbortController();
  next() {
    this.controller.abort();
    this.controller = new AbortController();
    const version = ++this.version;
    return { version, signal: this.controller.signal, current: () => this.version === version };
  }
  cancel() { this.next(); }
}
