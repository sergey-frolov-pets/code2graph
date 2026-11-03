let renderQueue: Promise<void> = Promise.resolve();

export function enqueueRender<T>(task: () => Promise<T>): Promise<T> {
  const next = renderQueue.then(task, task);
  renderQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
