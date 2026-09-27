/**
 * Runs `fn` once the browser is idle after page load (or after `timeout` ms at
 * the latest). Returns a function that cancels it. Used to defer work that is
 * not needed for the first view, such as opening the live-updates connection.
 */
export function whenIdle(fn: () => void | Promise<void>, timeout = 3000): () => void {
  let cancelled = false;
  let handle: number | ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (!cancelled) void Promise.resolve(fn()).catch(() => undefined);
  };
  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") handle = window.requestIdleCallback(run, { timeout });
    else handle = setTimeout(run, 1200);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (handle === undefined) return;
    if (typeof window.cancelIdleCallback === "function" && typeof handle === "number") window.cancelIdleCallback(handle);
    else clearTimeout(handle as ReturnType<typeof setTimeout>);
  };
}
