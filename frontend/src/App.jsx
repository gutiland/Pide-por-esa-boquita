import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { PubProvider } from "./context/pubContext";
import { useAuth } from "./context/authContext";
import { Header } from "./componentes/Header/Header";
import { Carta } from "./componentes/Carta/Carta";
import Login from "./componentes/Login/Login";
import RutaPrivada from "./componentes/RutaPrivada/RoutaPrivada";
import Orders from "./componentes/Orders/Orders";
import "./App.css";

function PubCarta() {
  const { slug } = useParams();
  const [pub, setPub] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setPub(null);
    setError("");
    async function loadPub() {
      try {
        const response = await fetch("/api/pubs/" + encodeURIComponent(slug), { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "Bar no encontrado" : "No se pudo cargar el bar");
        const data = await response.json();
        if (!controller.signal.aborted) setPub(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }
    loadPub();
    return () => controller.abort();
  }, [slug]);

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!pub) return <p role="status">Cargando bar…</p>;
  return (
    <PubProvider pub={pub}>
      <Header />
      <Carta />
    </PubProvider>
  );
}

function PubPanel() {
  const { account } = useAuth();
  return <PubProvider pub={account}><Header /><Orders /></PubProvider>;
}

function LegacyHome() {
  const { search } = useLocation();
  // Conserva los enlaces de prueba actuales. Los QR nuevos siempre incluyen el bar.
  return <Navigate to={"/bar/bar-central" + search} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LegacyHome />} />
      <Route path="/bar/:slug" element={<PubCarta />} />
      <Route path="/pub/login" element={<Login />} />
      <Route path="/pub/orders" element={<RutaPrivada><PubPanel /></RutaPrivada>} />
      <Route path="*" element={<p>Página no encontrada</p>} />
    </Routes>
  );
}