import { useRef, useState } from "react";
import { totalCents } from "./cartUtils";
import "./Carrito.css";
import { usePub } from "../../context/pubContext";

const euros = (cents) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export default function Carrito({
  table,
  items,
  addition,
  onQuantityChange,
  onRemove,
  onClear,
}) {
  const dialog = useRef(null);
  const pub = usePub();

  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const enviarPedido = async (event) => {
    event.preventDefault();
    // El ref bloquea dobles clics incluso antes del siguiente render.
    if (sendingRef.current || items.length === 0) return;
    const tableNumber = table;
    if (!Number.isSafeInteger(tableNumber) || tableNumber < 1) {
      setError("Escanea un QR de mesa válido antes de enviar el pedido.");
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError("");
    setConfirmation(null);
    try {
      // Enviamos IDs y cantidades. El backend obtiene los precios de MongoDB.
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pub: pub.slug,
          table: tableNumber,
          items: items.map((item) => ({
            drink: item.drink._id,
            mixer: item.mixer?._id ?? null,
            quantity: item.quantity,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data === "string"
            ? data
            : data?.message || "No se pudo enviar el pedido.",
        );
      }

      // Un 201 confirma que se ha creado, aunque no podamos leer el cuerpo.
      const data = await response.json().catch(() => null);
      setConfirmation({ table: tableNumber, id: data?.order?._id });
      onClear();
    } catch (error) {
      // Si se corta la red, conservamos el carrito: no reenviamos automáticamente.
      setError(
        error instanceof TypeError
          ? "No se pudo confirmar el envío. Consulta al personal antes de repetirlo para evitar duplicados."
          : error.message,
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button
        className="carrito-bar"
        type="button"
        aria-label={
          "Abrir pedido, " + count + " bebidas, " + euros(totalCents(items))
        }
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          setConfirmation(null);
          dialog.current.showModal();
        }}
      >
        <span key={addition?.id ?? 0} className={addition ? "carrito-feedback carrito-feedback-added" : "carrito-feedback"}>
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 7H6" />
          <circle cx="10" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
        </svg>
        {count > 0 && (
          <span className="carrito-badge" aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        )}
        </span>
      </button>
      {/* El diálogo nativo gestiona el foco, Escape y bloquea el fondo. */}
      <dialog
        ref={dialog}
        className="carrito-dialog"
        aria-labelledby="carrito-title"
        onCancel={(event) => {
          if (sendingRef.current) event.preventDefault();
        }}
      >
        <header className="carrito-header">
          <h2 id="carrito-title">Tu pedido</h2>
          <button
            type="button"
            disabled={sending}
            onClick={() => dialog.current.close()}
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </header>
        {confirmation && (
          <div className="carrito-success carrito-celebration" role="status">
            <span className="carrito-success-eyebrow">{pub.name}</span>
            <svg className="carrito-success-check" width="68" height="68" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="1" />
              <circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
              <path d="m21 32 7 7 15-16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong>Todo listo.</strong>
            <span className="carrito-success-table">Mesa {confirmation.table} · Pedido enviado</span>
            <p>Tu pedido ha quedado registrado.<br />Disfruta del momento.</p>
            <small>Pagarás al personal.</small>
          </div>
        )}
        {error && (
          <p className="carrito-error" role="alert">
            {error}
          </p>
        )}
        {items.length === 0 ? (
          !confirmation && (
            <p className="carrito-empty">
              Aún no has elegido nada. ¿Qué te apetece?
            </p>
          )
        ) : (
          <>
            <ul className="carrito-list">
              {items.map((item) => (
                <li className="carrito-item" key={item.key}>
                  <div className="carrito-item-title">
                    <strong>{item.drink.name}</strong>
                    <strong>
                      {euros(Math.round(item.unitPrice * 100) * item.quantity)}
                    </strong>
                  </div>
                  {item.drink.type === "copas" && (
                    <p>{item.mixer ? item.mixer.name : "Solo"}</p>
                  )}
                  <small>
                    {euros(Math.round(item.unitPrice * 100))} / unidad
                  </small>
                  <div className="carrito-controls">
                    <div className="carrito-stepper">
                      <button
                        type="button"
                        disabled={sending || item.quantity === 1}
                        aria-label={"Reducir cantidad de " + item.drink.name}
                        onClick={() =>
                          onQuantityChange(item.key, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={sending}
                        aria-label={"Aumentar cantidad de " + item.drink.name}
                        onClick={() =>
                          onQuantityChange(item.key, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="carrito-remove"
                      disabled={sending}
                      aria-label={
                        "Eliminar " +
                        item.drink.name +
                        (item.mixer ? " con " + item.mixer.name : "")
                      }
                      onClick={() => onRemove(item.key)}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="carrito-total">
              <span>Total</span>
              <strong>{euros(totalCents(items))}</strong>
            </div>
            <p className="carrito-note">
              La mezcla está incluida. Pagarás al personal.
            </p>
            <form className="carrito-send-form" onSubmit={enviarPedido}>
              {/* La mesa procede de la URL del QR; el cliente no la introduce manualmente. */}
              {table ? (
                <p className="carrito-table">
                  Pedido para la mesa <strong>{table}</strong>
                </p>
              ) : (
                <p className="carrito-error">
                  Escanea el QR de tu mesa para poder enviar el pedido.
                </p>
              )}
              <button
                type="submit"
                className="carrito-continue"
                disabled={sending || !table}
              >
                {sending ? "Enviando…" : "Enviar pedido"}
              </button>
            </form>
            <button
              type="button"
              className="carrito-clear"
              disabled={sending}
              onClick={onClear}
            >
              Vaciar pedido
            </button>
          </>
        )}
        <button
          type="button"
          className="carrito-continue carrito-secondary"
          disabled={sending}
          onClick={() => dialog.current.close()}
        >
          Seguir eligiendo
        </button>
      </dialog>
    </>
  );
}
