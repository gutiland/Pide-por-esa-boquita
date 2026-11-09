const deviceKey = "push-pub";

export function pushSupportMessage() {
  if (!window.isSecureContext)
    return "Los avisos requieren HTTPS. La dirección local por Wi-Fi no los permite.";
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (
    ios &&
    !window.matchMedia("(display-mode: standalone)").matches &&
    !navigator.standalone
  ) {
    return "En iPhone/iPad, añade esta web a la pantalla de inicio y ábrela desde su icono.";
  }
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "Este navegador no admite avisos push. Prueba un navegador compatible.";
  }
  return "";
}

export async function pushRegistration() {
  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  return navigator.serviceWorker.ready;
}

export const savedPushPub = () => localStorage.getItem(deviceKey);
export const savePushPub = (id) => localStorage.setItem(deviceKey, id);

export function applicationKey(value) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(
    atob(padded.replace(/-/g, "+").replace(/_/g, "/")),
    (char) => char.charCodeAt(0),
  );
}

export async function pushRequest(path, token, body, method = "POST") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/api/push/" + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok)
      throw new Error(data?.message || "No se pudo configurar el dispositivo.");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function disablePushDevice(token) {
  localStorage.removeItem(deviceKey);
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  // Primero revocamos el dispositivo: aunque falle la red, no seguirá recibiendo.
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await pushRequest("subscriptions", token, { endpoint }, "DELETE");
  }
  const notifications = await registration?.getNotifications();
  notifications?.forEach((notification) => notification.close());
}
