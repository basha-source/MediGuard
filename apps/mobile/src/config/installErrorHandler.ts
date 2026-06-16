// Side-effect module. MUST be imported before anything else (see index.js) so that
// any uncaught JS error during startup is captured instead of silently killing the
// app to a black screen. The captured message is stashed on globalThis and rendered
// by ErrorBoundary so we can actually SEE what crashed in a release APK.

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

const g = globalThis as unknown as {
  __STARTUP_ERROR__?: string | null;
  ErrorUtils?: {
    getGlobalHandler?: () => GlobalHandler;
    setGlobalHandler?: (handler: GlobalHandler) => void;
  };
};

export function recordStartupError(label: string, error: unknown): void {
  const detail =
    (error as { stack?: string; message?: string })?.stack ||
    (error as { message?: string })?.message ||
    String(error);
  const msg = `${label}: ${detail}`;
  g.__STARTUP_ERROR__ = g.__STARTUP_ERROR__ ? `${g.__STARTUP_ERROR__}\n\n${msg}` : msg;
  if (typeof console !== "undefined") console.error(msg);
}

try {
  const EU = g.ErrorUtils;
  if (EU && typeof EU.setGlobalHandler === "function") {
    const prev = typeof EU.getGlobalHandler === "function" ? EU.getGlobalHandler() : null;
    EU.setGlobalHandler((error, isFatal) => {
      recordStartupError(isFatal ? "Fatal error" : "Error", error);
      // For non-fatal errors, preserve default behavior. For fatal errors we
      // intentionally do NOT re-invoke the default handler so the process is not
      // force-killed — keeping it alive gives ErrorBoundary a chance to display
      // the captured error instead of a black screen.
      if (!isFatal && typeof prev === "function") prev(error, isFatal);
    });
  }
} catch {
  // If ErrorUtils isn't available we simply fall back to default behavior.
}
