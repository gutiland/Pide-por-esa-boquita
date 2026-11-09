import PushSettings from "../PushSettings/PushSettings";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/authContext";
import "./Orders.css";

const statusLabels = {
  pending: "Pendiente", preparing: "En preparación",
  served: "Servido", cancelled: "Cancelado", paid: "Pagado",
};
const euros = (cents) => new Intl.NumberFormat("es-ES", {
  style: "currency", currency: "EUR",
}).format(cents / 100);
const dateLabel = (date) => new Date(date).toLocaleString("es-ES", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

const Orders = () => {
  const { account, token, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("active");
  // Guardamos los cursores visitados para poder volver a la página anterior.
  const [cursors, setCursors] = useState([""]);
  const cursor = cursors.at(-1);
  const [nextCursor, setNextCursor] = useState(null);
  const [dataKey, setDataKey] = useState("");
  const requestKey = view + ":" + filter + ":" + cursor;
  const automaticRefresh = view === "active" && cursors.length === 1;
  const [updatingIds, setUpdatingIds] = useState([]);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const pendingUpdates = useRef(new Set());
  const logoutRef = useRef(logout);
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  useEffect(() => {
    let disposed = false;
    let nextRefresh;
    let controller;

    async function loadOrders() {
      if (disposed) return;
      setRefreshing(true);
      controller = new AbortController();
      // Una petición colgada no debe bloquear las siguientes actualizaciones.
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const params = new URLSearchParams({ view, status: filter, limit: "20" });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch("/api/orders?" + params.toString(), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (disposed) return;
        if (response.status === 401) {
          logoutRef.current();
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudieron obtener los pedidos.");
        if (!Array.isArray(data.orders)) throw new Error("Formato de pedidos incorrecto.");
        if (!disposed) {
          setOrders(data.orders);
          setNextCursor(data.nextCursor);
          setDataKey(requestKey);
          setError("");
          setLastUpdated(new Date());
        }
      } catch (error) {
        if (!disposed) {
          setError(error.name === "AbortError"
            ? "El servidor tarda demasiado en responder."
            : "No se pudieron actualizar los pedidos. Comprueba la conexión.");
        }
      } finally {
        clearTimeout(timeout);
        if (!disposed) {
          setInitialLoading(false);
          setRefreshing(false);
          // Esperamos a terminar antes de programar la siguiente consulta.
          if (automaticRefresh) nextRefresh = setTimeout(loadOrders, 10000);
        }
      }
    }

    loadOrders();
    return () => {
      disposed = true;
      clearTimeout(nextRefresh);
      controller?.abort();
    };
  }, [token, refresh, view, filter, cursor, requestKey, automaticRefresh]);

  const changeStatus = async (order, status) => {
    if (pendingUpdates.current.has(order._id)) return;
    pendingUpdates.current.add(order._id);
    setUpdatingIds([...pendingUpdates.current]);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch("/api/orders/" + order._id + "/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        logoutRef.current();
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo cambiar el estado.");
      // Solo mostramos el nuevo estado tras la confirmación del servidor.
      setOrders((previous) => previous.map((item) => item._id === data._id ? data : item)
        .filter((item) => view === "history" ? ["paid", "cancelled"].includes(item.status) : ["pending", "preparing", "served"].includes(item.status)));
      setActionMessage("Mesa " + order.table + ": pedido marcado como " + (status === "paid" ? "pagado." : "servido."));
    } catch (error) {
      setActionError(error instanceof TypeError
        ? "No se pudo confirmar el cambio. Actualiza la lista antes de repetirlo."
        : error.message);
    } finally {
      pendingUpdates.current.delete(order._id);
      setUpdatingIds([...pendingUpdates.current]);
      // Cancelamos la consulta anterior y leemos el estado actual tras la escritura.
      setRefresh((previous) => previous + 1);
    }
  };
  // Nunca mostramos una página anterior debajo de un filtro o vista distintos.
  const visibleOrders = dataKey === requestKey ? orders : [];
  const pendingCount = visibleOrders.filter((order) => order.status === "pending").length;
  const waitingForPage = dataKey !== requestKey && !error;
  const changeView = (nextView) => {
    setView(nextView);
    setFilter("all");
    setCursors([""]);
    setError("");
    setActionMessage("");
    setActionError("");
  };
  return (
    <main className="orders-page">
      <header className="orders-header">
        <div>
          <p className="orders-eyebrow">PANEL DEL PERSONAL · {account.slug}</p>
          <h1>Pedidos</h1>
          <p>Hola, {account.name} · {pendingCount} pendientes en esta página</p>
        </div>
        <div className="orders-header-actions">
          <PushSettings />
          <button className="orders-button" type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>


      <nav className="orders-tabs" aria-label="Vista de pedidos">
        <button type="button" className="orders-button" aria-pressed={view === "active"}
          onClick={() => changeView("active")}>Activos</button>
        <button type="button" className="orders-button" aria-pressed={view === "history"}
          onClick={() => changeView("history")}>Historial</button>
      </nav>
      <div className="orders-toolbar">
        <label>Mostrar
          <select value={filter} onChange={(event) => { setFilter(event.target.value); setCursors([""]); setError(""); }}>
            <option value="all">{view === "active" ? "Todos los activos" : "Todo el historial"}</option>
            {Object.entries(statusLabels).filter(([value]) => view === "active" ? ["pending", "preparing", "served"].includes(value) : ["paid", "cancelled"].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="orders-button" type="button" disabled={refreshing}
          onClick={() => setRefresh((value) => value + 1)}>
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      <p className="orders-update">
        {automaticRefresh ? "Actualización automática cada 10 segundos." : "Vista por páginas. Pulsa Actualizar para obtener cambios."}
        {lastUpdated && " Última lectura: " + lastUpdated.toLocaleTimeString("es-ES")}
      </p>
      {(initialLoading || waitingForPage) && <p role="status">Cargando pedidos…</p>}
      {error && <p className="orders-error" role="alert">{error}
        {lastUpdated && " Se muestran los últimos datos recibidos; pueden estar desactualizados."}
      </p>}
      {!initialLoading && !waitingForPage && !error && visibleOrders.length === 0 && (
        <p className="orders-empty">{view === "history" ? "No hay pedidos en esta página del historial." : "No hay pedidos activos con este filtro."}</p>
      )}

      {actionError && <p className="orders-error" role="alert">{actionError}</p>}
      <p className="orders-action-message" role="status">{actionMessage}</p>
      <section className="orders-grid" aria-label="Pedidos del pub">
        {visibleOrders.map((order) => {
          const total = order.items.reduce((sum, item) =>
            sum + Math.round(item.unitPrice * 100) * item.quantity, 0);
          return (
            <article className="order-card" key={order._id}>
              <header className="order-card-header">
                <h2>Mesa {order.table}</h2>
                <span className={"order-status order-status-" + order.status}>
                  {statusLabels[order.status] || order.status}
                </span>
              </header>
              <time dateTime={order.createdAt}>{dateLabel(order.createdAt)}</time>
              <ul className="order-items">
                {order.items.map((item, index) => (
                  <li key={item._id || index}>
                    <div>
                      {/* Si se eliminó la bebida del catálogo, populate devuelve null. */}
                      <strong>{item.quantity} × {item.drink?.name || "Bebida retirada del catálogo"}</strong>
                      <small>{item.mixer ? "Con " + item.mixer.name : "Sin mezcla"}</small>
                    </div>
                    <span>{euros(Math.round(item.unitPrice * 100) * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <footer className="order-total"><span>Total</span><strong>{euros(total)}</strong></footer>
              {/* Un mismo botón avanza según el estado; pagados y cancelados no tienen acción. */}
              {["pending", "preparing", "served"].includes(order.status) && (
                <button type="button" className="order-status-button"
                  disabled={updatingIds.includes(order._id)}
                  onClick={() => changeStatus(order, order.status === "served" ? "paid" : "served")}>
                  {updatingIds.includes(order._id) ? "Guardando…" :
                    order.status === "served" ? "Marcar como pagado" : "Marcar como servido"}
                </button>
              )}
            </article>
          );
        })}
      </section>
      <nav className="orders-pagination" aria-label="Páginas de pedidos">
        <button className="orders-button" type="button"
          disabled={refreshing || cursors.length === 1}
          onClick={() => { setCursors((previous) => previous.slice(0, -1)); setError(""); }}>
          ← Anterior
        </button>
        <span>Página {cursors.length} · Hasta 20 pedidos</span>
        <button className="orders-button" type="button"
          disabled={refreshing || waitingForPage || Boolean(error) || !nextCursor}
          onClick={() => { setCursors((previous) => [...previous, nextCursor]); setError(""); }}>
          Siguiente →
        </button>
      </nav>
    </main>
  );
};

export default Orders;