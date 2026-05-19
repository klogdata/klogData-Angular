type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type IdleOptions = {
  fallbackDelay: number;
  preferTimeout?: boolean;
  timeout: number;
};

export function scheduleIdleWork(callback: () => void, options: IdleOptions) {
  const idleWindow = window as IdleWindow;
  let timeoutId = 0;
  let idleId: number | null = null;

  if (!options.preferTimeout && idleWindow.requestIdleCallback) {
    idleId = idleWindow.requestIdleCallback(callback, { timeout: options.timeout });
  } else {
    timeoutId = window.setTimeout(callback, options.fallbackDelay);
  }

  return () => {
    if (idleId !== null && idleWindow.cancelIdleCallback) {
      idleWindow.cancelIdleCallback(idleId);
    }

    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  };
}