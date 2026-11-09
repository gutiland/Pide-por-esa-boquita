import "./Login.css";
import { useState } from "react";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);

    try {
      // Primero comprobamos las credenciales y recibimos el JWT.
      const response = await fetch("/api/pubs/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data === "string" ? data : data.message || "Error en el login");
      }

      // El backend identifica al pub usando el token, sin recibir su contraseña otra vez.
      const pubResponse = await fetch("/api/pubs/me", {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const account = await pubResponse.json();
      if (!pubResponse.ok) {
        throw new Error(typeof account === "string" ? account : account.message || "No se pudo obtener el pub");
      }

      // El contexto guarda la autenticación; el formulario decide adónde navegar.
      login(account, data.token);
      navigate("/pub/orders", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="login-eyebrow">PIDE POR ESA BOQUITA</p>
        <h1 id="login-title">Acceso del pub</h1>
        <p className="login-description">Entra para gestionar los pedidos de tu bar.</p>
        <form className="login-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          type="email" id="email" value={email} required
          autoComplete="username" placeholder="Introduce tu email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          type="password" id="password" value={password} required
          autoComplete="current-password" placeholder="Introduce tu contraseña"
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {/* Mostramos el error en pantalla y evitamos envíos repetidos. */}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={sending}>
        {sending ? "Entrando…" : "Iniciar sesión"}
      </button>
        </form>
      </section>
    </main>
  );
};

export default Login;