import { disablePushDevice } from "../services/push";
import { useContext, createContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  // La pestaña conserva el token al recargar; la cuenta del pub se recupera desde /me.
  const [token, setToken] = useState(() => sessionStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Estas funciones viven dentro del provider para acceder a sus estados.
  const login = (pubData, pubToken) => {
    setAccount(pubData);
    setToken(pubToken);
    setLoading(false);
  };

  const logout = () => {
    void disablePushDevice(token).catch(() => {});
    // Lo eliminamos inmediatamente; el efecto también sincroniza el almacenamiento.
    sessionStorage.removeItem("token");
    setAccount(null);
    setToken(null);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      sessionStorage.setItem("token", token);
    } else {
      sessionStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAccount(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function recuperarUsuario() {
      setLoading(true);
      try {
        const response = await fetch("/api/pubs/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        // Una respuesta antigua no debe modificar una sesión nueva o cerrada.
        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setAccount(null);
          setToken(null);
          return;
        }
        if (!response.ok) {
          throw new Error("No se pudo comprobar la sesión");
        }

        const pubData = await response.json();
        if (!controller.signal.aborted) setAccount(pubData);
      } catch (error) {
        if (!controller.signal.aborted) {
          setAccount(null);
          console.error(error.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    recuperarUsuario();
    // Si cambia el token o se desmonta el provider, cancelamos la consulta anterior.
    return () => controller.abort();
  }, [token]);

  return (
    <AuthContext.Provider value={{ account, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return context;
}
