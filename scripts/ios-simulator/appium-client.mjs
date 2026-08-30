const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

export class AppiumClient {
  constructor(serverUrl, sessionId) {
    this.serverUrl = serverUrl.replace(/\/$/u, '');
    this.sessionId = sessionId;
  }

  static async create(serverUrl, capabilities) {
    const response = await request(serverUrl, 'POST', '/session', {
      capabilities: { alwaysMatch: capabilities, firstMatch: [{}] },
    });
    if (!response?.sessionId) throw new Error('Appium did not return a session id.');
    return new AppiumClient(serverUrl, response.sessionId);
  }

  async command(method, path, body) {
    return request(this.serverUrl, method, `/session/${this.sessionId}${path}`, body);
  }

  async navigate(url) { await this.command('POST', '/url', { url }); }
  async refresh() { await this.command('POST', '/refresh', {}); }
  async execute(script, args = []) { return this.command('POST', '/execute/sync', { script, args }); }
  async executeAsync(script, args = []) { return this.command('POST', '/execute/async', { script, args }); }
  async getContexts() { return this.command('GET', '/contexts'); }
  async setContext(name) { await this.command('POST', '/context', { name }); }
  async getSource() { return this.command('GET', '/source'); }
  async setOrientation(orientation) { await this.command('POST', '/orientation', { orientation }); }
  async background(seconds) { await this.command('POST', '/appium/app/background', { seconds }); }

  async find(using, value) {
    const result = await this.command('POST', '/element', { using, value });
    const id = result?.[ELEMENT_KEY];
    if (!id) throw new Error(`Appium did not return an element for ${using}=${value}.`);
    return id;
  }

  async click(elementId) { await this.command('POST', `/element/${elementId}/click`, {}); }
  async clear(elementId) { await this.command('POST', `/element/${elementId}/clear`, {}); }
  async type(elementId, text) { await this.command('POST', `/element/${elementId}/value`, { text, value: [...text] }); }
  async getText(elementId) { return this.command('GET', `/element/${elementId}/text`); }
  async getAttribute(elementId, name) { return this.command('GET', `/element/${elementId}/attribute/${encodeURIComponent(name)}`); }

  async clickTestId(testId) {
    const element = await this.find('css selector', `[data-testid="${testId}"]`);
    await this.click(element);
  }

  async typeTestId(testId, text) {
    const element = await this.find('css selector', `[data-testid="${testId}"]`);
    await this.click(element);
    await this.clear(element);
    await this.type(element, text);
    return element;
  }

  async holdTestId(testId, durationMs) {
    const result = await this.execute(`
      const element = document.querySelector(arguments[0]);
      if (!(element instanceof HTMLElement)) {
        return { ok: false, message: 'Hold target was not found.' };
      }
      const eventOptions = { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true };
      window.__storyGuildHoldTarget = element;
      element.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
      return { ok: true };
    `, [`[data-testid="${testId}"]`]);
    if (!result?.ok) throw new Error(result?.message || `Could not hold ${testId}.`);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    await this.execute(`
      const element = window.__storyGuildHoldTarget;
      if (element instanceof HTMLElement) {
        element.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerType: 'touch',
          isPrimary: true,
        }));
      }
      delete window.__storyGuildHoldTarget;
    `);
  }

  async screenshot() { return this.command('GET', '/screenshot'); }

  async close() {
    if (!this.sessionId) return;
    try { await request(this.serverUrl, 'DELETE', `/session/${this.sessionId}`); }
    finally { this.sessionId = '';
    }
  }
}

async function request(serverUrl, method, path, body) {
  const response = await fetch(`${serverUrl.replace(/\/$/u, '')}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`Appium returned HTTP ${response.status} without JSON for ${method} ${path}.`); }
  if (!response.ok || payload?.value?.error) {
    const detail = payload?.value?.message || payload?.value?.error || `HTTP ${response.status}`;
    throw new Error(`Appium ${method} ${path} failed: ${detail}`);
  }
  return payload?.value;
}
