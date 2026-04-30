declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

function getClientInfo() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua);
  const isWindows = /Windows/.test(ua);
  const device = isIOS ? "ios" : isAndroid ? "android" : isMac ? "mac" : isWindows ? "windows" : "other";
  const browsers = [["Chrome", /Chrome\/[\d.]+/], ["Safari", /Safari\/[\d.]+/], ["Firefox", /Firefox\/[\d.]+/], ["Edge", /Edg\/[\d.]+/]];
  const browser = (browsers.find(([, rx]) => (rx as RegExp).test(ua))?.[0] as string) ?? "unknown";
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}x${window.screen.height}`,
    device,
    browser,
    os: device,
    page: window.location.pathname,
  };
}

export function track(type: string, data: Record<string, unknown> = {}) {
  const payload = { type, ...data, ...getClientInfo() };

  // Fire Umami custom event
  window.umami?.track(type, data);

  // Fire our own server-side capture (fire-and-forget)
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
