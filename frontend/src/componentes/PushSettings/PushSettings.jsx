import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/authContext";
import {
  applicationKey, disablePushDevice, pushRegistration, pushRequest,
  pushSupportMessage, savedPushPub, savePushPub,
} from "../../services/push";
import "./PushSettings.css";

export default function PushSettings() {
  const { token, account } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const supportMessage = pushSupportMessage();
  const dialog = useRef(null);
  const [alerting, setAlerting] = useState(false);

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    let timeout;
    const receive = (event) => {
      if (event.data?.type !== "PUB_PUSH_RECEIVED" || savedPushPub() !== account.id) return;
      setAlerting(true);
      // Es un efecto visual de la pantalla, no controla el flash físico del teléfono.
      if (document.visibilityState === "visible") {
        navigator.vibrate?.([200, 100, 200]);
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => setAlerting(false), 6000);
    };
    navigator.serviceWorker.addEventListener("message", receive);
    return () => {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("message", receive);
    };
  }, [enabled, account.id]);

  useEffect(() => {
    let disposed = false;
    async function restore() {
      if (supportMessage) { setBusy(false); return; }
      try {
        if (Notification.permission === "granted" && savedPushPub() === account.id) {
          const registration = await pushRegistration();
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            // Renueva los 30 días al entrar al panel, sin volver a pedir permiso.
            await pushRequest("subscriptions", token, { subscription: subscription.toJSON() });
            if (!disposed) setEnabled(true);
          }
        }
      } catch (error) {
        if (!disposed) setProblem(error.message);
      } finally { if (!disposed) setBusy(false); }
    }
    restore();
    return () => { disposed = true; };
  }, [token, account.id, supportMessage]);

  const enable = async () => {
    setBusy(true); setProblem(""); setMessage("");
    try {
      // Debe solicitarse directamente al pulsar, antes de otras peticiones asíncronas.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permiso no concedido. Puedes cambiarlo en los ajustes del navegador.");
      const config = await pushRequest("config", token, null, "GET");
      if (!config.configured) throw new Error("Falta configurar el servicio push en el servidor.");
      const registration = await pushRegistration();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && savedPushPub() !== account.id) {
        await subscription.unsubscribe();
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: applicationKey(config.publicKey),
      });
      await pushRequest("subscriptions", token, { subscription: subscription.toJSON() });
      savePushPub(account.id);
      setEnabled(true);
      setMessage("Avisos activados en este dispositivo.");
    } catch (error) { setProblem(error.message); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setProblem(""); setMessage("");
    try {
      await disablePushDevice(token);
      setMessage("Avisos desactivados en este dispositivo.");
    } catch (error) { setProblem("Se ha solicitado desactivar los avisos: " + error.message); }
    finally { setEnabled(false); setBusy(false); }
  };

  const test = async () => {
    setBusy(true); setProblem(""); setMessage("");
    try {
      const registration = await pushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("Vuelve a activar los avisos.");
      const data = await pushRequest("test", token, { endpoint: subscription.endpoint });
      setMessage(data.message);
    } catch (error) { setProblem(error.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button type="button"
        className={"push-icon" + (enabled ? " push-icon--enabled" : "") + (alerting ? " push-icon--alert" : "")}
        aria-label={enabled ? "Avisos activados: configurar" : "Avisos desactivados: configurar"}
        aria-haspopup="dialog"
        title={enabled ? "Avisos activados" : "Configurar avisos"}
        onClick={() => dialog.current.showModal()}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4M12 2V1" />
          {!enabled && <path d="M3 3l18 18" />}
        </svg>
        {enabled && <span className="push-icon-dot" aria-hidden="true" />}
      </button>
      {alerting && <div className="push-screen-alert" aria-hidden="true" />}
      <dialog ref={dialog} className="push-dialog" aria-labelledby="push-title">
        <header className="push-dialog-header">
          <h2 id="push-title">Avisos del móvil</h2>
          <button type="button" aria-label="Cerrar configuración de avisos" onClick={() => dialog.current.close()}>✕</button>
        </header>
        <p>{enabled ? "Avisos activados en este dispositivo." : "Activa los avisos para recibir nuevos pedidos."}</p>
        {supportMessage ? <p className="push-help">{supportMessage}</p> : (
          <div className="push-actions">
            <button type="button" className="orders-button" disabled={busy} onClick={enabled ? disable : enable}>
              {busy ? "Configurando…" : enabled ? "Desactivar avisos" : "Activar avisos"}
            </button>
            {enabled && <button type="button" className="orders-button" disabled={busy} onClick={test}>
              Probar aviso
            </button>}
          </div>
        )}
        <p className="push-help">Sonido y vibración dependen del teléfono. Para avisos con flash, activa esa opción en los ajustes de accesibilidad del móvil.</p>
        {message && <p role="status">{message}</p>}
        {problem && <p role="alert">{problem}</p>}
      </dialog>
    </>
  );
}