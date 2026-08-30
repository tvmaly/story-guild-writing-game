export class ActionQueue {
  private pending: Promise<unknown> = Promise.resolve();

  enqueue<T>(action: () => Promise<T>): Promise<T> {
    const next = this.pending.then(action, action);
    this.pending = next.then(() => undefined, () => undefined);
    return next;
  }
}
