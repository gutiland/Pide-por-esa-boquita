// No cacheamos API, tokens ni páginas privadas. Este worker solo gestiona avisos.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {}
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(
        payload.title || "Nuevo aviso del bar",
        {
          body: payload.body || "Abre el panel de pedidos.",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge.png",
          tag: payload.tag || "pub-notification",
          data: { url: "/pub/orders" },
          vibrate: [200, 100, 200],
        },
      );
      // Con el panel visible, también señalamos el aviso mediante el borde y la campana.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      windows
        .filter((client) => new URL(client.url).pathname === "/pub/orders")
        .forEach((client) => client.postMessage({ type: "PUB_PUSH_RECEIVED" }));
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      // El destino es fijo y del mismo origen, nunca una URL arbitraria del payload.
      const url = new URL("/pub/orders", self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const panel = windows.find((client) => client.url === url);
      if (panel) return panel.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
