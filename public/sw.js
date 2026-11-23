self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function safeAppUrl(value) {
  if (typeof value !== "string") return "/notifications";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/notifications";
  }
  return value;
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim().slice(0, 80)
    : "KIRAKITAH";
  const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 180) : "";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/brand/logo-mark.png",
      badge: "/brand/logo-mark.png",
      data: { url: safeAppUrl(payload.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeAppUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const windowClient of windows) {
        if ("focus" in windowClient) {
          if ("navigate" in windowClient) windowClient.navigate(url);
          return windowClient.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
