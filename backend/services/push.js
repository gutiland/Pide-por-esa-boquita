import * as webpush from "web-push";
import PushSubscription from "../Model/PushSubscription.js";

export const isPushConfigured = () =>
  Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );

// Limita los destinos aceptados a servicios push, evitando peticiones a redes internas.
export function validPushSubscription(value) {
  try {
    const endpoint = new URL(value.endpoint);
    const host = endpoint.hostname;
    const knownHost =
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com");
    const validKey = (key, length) =>
      typeof key === "string" &&
      /^[-_A-Za-z0-9]+=*$/.test(key) &&
      Buffer.from(key, "base64url").length === length;
    return (
      knownHost &&
      endpoint.protocol === "https:" &&
      !endpoint.username &&
      !endpoint.password &&
      (!endpoint.port || endpoint.port === "443") &&
      value.endpoint.length <= 2048 &&
      validKey(value.keys?.p256dh, 65) &&
      validKey(value.keys?.auth, 16)
    );
  } catch {
    return false;
  }
}

export async function deliverPush(subscription, payload) {
  if (!isPushConfigured()) throw new Error("Push no configurado");
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT,
          publicKey: process.env.VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
        },
        TTL: 300,
        urgency: "high",
        timeout: 5000,
      },
    );
    return true;
  } catch (error) {
    // Los navegadores invalidan suscripciones cuando se desinstala o se revoca el permiso.
    if ([404, 410].includes(error.statusCode)) {
      await PushSubscription.deleteOne({ _id: subscription._id });
      return false;
    }
    throw error;
  }
}

export async function notifyNewOrder(pub, order) {
  if (!isPushConfigured()) return;
  const subscriptions = await PushSubscription.find({
    pub: pub._id,
    expiresAt: { $gt: new Date() },
  }).lean();
  const payload = {
    title: "Nuevo pedido · Mesa " + order.table,
    body: pub.name + " · Abre el panel para atenderlo.",
    tag: "order-" + order._id.toString(),
    url: "/pub/orders",
  };
  // Los móviles de otro pub no aparecen en esta consulta.
  for (let index = 0; index < subscriptions.length; index += 10) {
    await Promise.all(
      subscriptions.slice(index, index + 10).map(async (subscription) => {
        try {
          await deliverPush(subscription, payload);
        } catch (error) {
          console.error(
            "No se pudo entregar un aviso push:",
            error.statusCode || error.name,
          );
        }
      }),
    );
  }
}
