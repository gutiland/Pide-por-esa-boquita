import PushSubscription from "../Model/PushSubscription.js";
import {
  deliverPush,
  isPushConfigured,
  validPushSubscription,
} from "../services/push.js";

export const getPushConfig = (req, res) =>
  res.json({
    configured: isPushConfigured(),
    publicKey: isPushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
  });

export const subscribePush = async (req, res) => {
  const subscription = req.body?.subscription;
  if (!isPushConfigured())
    return res
      .status(503)
      .json({ message: "Notificaciones aún no configuradas en el servidor" });
  if (!subscription || !validPushSubscription(subscription)) {
    return res
      .status(400)
      .json({ message: "Suscripción push inválida o navegador no compatible" });
  }
  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // Un navegador tiene una suscripción por origen. Si cambia de cuenta, cambia de pub.
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: { pub: req.pub._id, keys: subscription.keys, expiresAt },
      },
      { upsert: true, runValidators: true, returnDocument: "after" },
    );
    return res.json({ expiresAt });
  } catch {
    return res
      .status(500)
      .json({ message: "No se pudo registrar este dispositivo" });
  }
};

export const unsubscribePush = async (req, res) => {
  if (typeof req.body?.endpoint !== "string")
    return res.status(400).json({ message: "Falta el dispositivo" });
  try {
    await PushSubscription.deleteOne({
      endpoint: req.body.endpoint,
      pub: req.pub._id,
    });
    return res.sendStatus(204);
  } catch {
    return res
      .status(500)
      .json({ message: "No se pudieron desactivar los avisos" });
  }
};

// La prueba se limita al dispositivo que pertenece al pub autenticado.
export const testPush = async (req, res) => {
  if (typeof req.body?.endpoint !== "string")
    return res.status(400).json({ message: "Falta el dispositivo" });
  try {
    const subscription = await PushSubscription.findOne({
      pub: req.pub._id,
      endpoint: req.body?.endpoint,
      expiresAt: { $gt: new Date() },
    });
    if (!subscription)
      return res
        .status(404)
        .json({ message: "Activa los avisos en este dispositivo primero" });
    const sent = await deliverPush(subscription, {
      title: "Avisos activados",
      body: req.pub.name + " · Este dispositivo puede recibir nuevos pedidos.",
      tag: "push-test",
      url: "/pub/orders",
    });
    if (!sent)
      return res.status(410).json({
        message: "El permiso ha caducado. Vuelve a activar los avisos",
      });
    return res.json({
      message: "Prueba enviada. Comprueba las notificaciones del teléfono.",
    });
  } catch {
    return res.status(502).json({
      message: "El servicio de notificaciones no pudo entregar la prueba",
    });
  }
};
