import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePub } from "../../context/pubContext";
import Carrito from "../Carrito/Carrito";
import {
  addItem,
  changeQuantity,
  isSavedItem,
  readTable,
} from "../Carrito/cartUtils";
import "./Carta.css";

export const Carta = () => {
  const [params] = useSearchParams();
  const pub = usePub();
  const table = readTable(params.toString());
  // Al cambiar de mesa se monta otra instancia: nunca guarda el carrito anterior en la nueva mesa.
  return <CartaMesa key={pub.id + ":" + (table ?? "sin-mesa")} table={table} />;
};

const CartaMesa = ({ table }) => {
  const pub = usePub();
  const [bebidas, setBebidas] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  // Conservamos el objeto completo para tener ID, nombre y precio.
  const [bebidaSeleccionada, setBebidaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // Cada pub y mesa tienen su propio carrito persistido.
  const storageKey = "Order:" + pub.id + ":mesa:" + (table ?? "sin-mesa");
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved.filter(isSavedItem) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      setMessage("No se pudo guardar el carrito en este dispositivo.");
    }
  }, [cart, storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    async function cargarCarta() {
      try {
        const response = await fetch(
          "/api/drinks?pub=" + encodeURIComponent(pub.slug),
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("No se pudo cargar la carta");
        const data = await response.json();
        if (!Array.isArray(data))
          throw new Error("La carta tiene un formato incorrecto");
        if (!controller.signal.aborted) setBebidas(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    cargarCarta();
    return () => controller.abort();
  }, [pub.slug]);

  const agregar = (drink, mixer = null) => {
    setCart((previous) => addItem(previous, drink, mixer));
    setMessage(
      drink.name + (mixer ? " con " + mixer.name : "") + " añadido al pedido",
    );
  };

  const elegirMezcla = (mixer = null) => {
    agregar(bebidaSeleccionada, mixer);
    setBebidaSeleccionada(null);
  };

  const imagenesPorTipo = {
    copas: "/images/drinks/copa.jpg",
    refrescos: "/images/drinks/refrescos.jpg",
    cervezas: "/images/drinks/cervezas.jpg",
    cafés: "/images/drinks/cafes.jpg",
    infusiones: "/images/drinks/infusiones.jpg",
  };

  const imagenesPorBebida = {
    Bacardí: "/images/drinks/bacardi-70cl.jpg",
    Brugal: "/images/drinks/brugal.jpg",
    Barceló: "/images/drinks/barcelo.jpg",
    "Johnnie Walker": "/images/drinks/red-label.jpg",
    Jameson: "/images/drinks/Jameson.jpg",
    Beefeater: "/images/drinks/Beefeater.jpg",
    Tanqueray: "/images/drinks/Tanqueray.webp",
    Absolut: "/images/drinks/absolut.jpg",
    "Coca-Cola": "/images/drinks/Coca-Cola.jpg",
    "Coca-Cola Zero": "/images/drinks/Coca-Cola-Zero.jpg",
    "Fanta de naranja": "/images/drinks/fanta-naranja.jpg",
    "Fanta de limón": "/images/drinks/fanta-limon.jpg",
    "Schweppes Tónica": "/images/drinks/Schweppes Tónica.jpg",
    "Estrella Galicia": "/images/drinks/estrella-galicia.jpg",
    "Mahou 0,0 Tostada": "/images/drinks/mahou-00-tostada.jpg",
    "Café solo": "/images/drinks/cafe-solo.jpg",
    "Café con leche": "/images/drinks/cafe-con-leche.jpg",
    "Café cortado": "/images/drinks/cafe-cortado.jpg",
    "Té verde": "/images/drinks/te-verde.jpg",
    Manzanilla: "/images/drinks/Manzanilla.jpg",
  };
  const imagenesPorCategoria = {
    ron: "/images/drinks/bacardi-70cl.jpg",
    whisky: "/images/drinks/red-label.jpg",
    ginebra: "/images/drinks/Beefeater.jpg",
    vodka: "/images/drinks/absolut.jpg",

    cola: "/images/drinks/Coca-Cola.jpg",
    naranja: "/images/drinks/fanta-naranja.jpg",
    limón: "/images/drinks/fanta-limon.jpg",
    tónica: "/images/drinks/Schweppes Tónica.jpg",

    lager: "/images/drinks/estrella-galicia.jpg",
    "sin alcohol": "/images/drinks/mahou-00-tostada.jpg",

    "sin leche": "/images/drinks/cafe-solo.jpg",
    "con leche": "/images/drinks/cafe-con-leche.jpg",

    té: "/images/drinks/te-verde.jpg",
    hierbas: "/images/drinks/Manzanilla.jpg",
  };

  const disponibles = bebidas.filter((drink) => drink.available);
  let title = "CARTA";
  let options = [];
  let goBack = null;
  let solo = false;

  // Una sola vista mantiene el carrito accesible en todos los niveles.
  if (bebidaSeleccionada) {
    title = "¿Con qué quieres tu " + bebidaSeleccionada.name + "?";
    solo = true;
    goBack = () => setBebidaSeleccionada(null);
    options = disponibles
      .filter((drink) => drink.type === "refrescos")
      .map((drink) => ({
        key: drink._id,
        name: drink.name,
        image: imagenesPorBebida[drink.name],
        select: () => elegirMezcla(drink),
      }));
  } else if (categoriaSeleccionada) {
    title = categoriaSeleccionada;
    goBack = () => {
      setCategoriaSeleccionada(null);
      setBebidaSeleccionada(null);
    };
    options = disponibles
      .filter(
        (drink) =>
          drink.type === tipoSeleccionado &&
          drink.category === categoriaSeleccionada,
      )
      .map((drink) => ({
        key: drink._id,
        name: drink.name,
        image: imagenesPorBebida[drink.name],
        select: () =>
          drink.type === "copas"
            ? setBebidaSeleccionada(drink)
            : agregar(drink),
      }));
  } else if (tipoSeleccionado) {
    title = tipoSeleccionado;
    goBack = () => {
      setTipoSeleccionado(null);
      setCategoriaSeleccionada(null);
      setBebidaSeleccionada(null);
    };
    options = [
      ...new Set(
        disponibles
          .filter((drink) => drink.type === tipoSeleccionado)
          .map((drink) => drink.category),
      ),
    ].map((category) => ({
      key: category,
      name: category,
      image: imagenesPorCategoria[category],
      select: () => {
        setCategoriaSeleccionada(category);
        setBebidaSeleccionada(null);
      },
    }));
  } else {
    options = [...new Set(disponibles.map((drink) => drink.type))].map(
      (type) => ({
        key: type,
        name: type,
        image: imagenesPorTipo[type],
        select: () => {
          setTipoSeleccionado(type);
          setCategoriaSeleccionada(null);
          setBebidaSeleccionada(null);
        },
      }),
    );
  }

  return (
    <div id="carta">
      {goBack && (
        <button type="button" className="carta-back" onClick={goBack}>
          ← Volver
        </button>
      )}
      <p className="carta-table">
        {table
          ? "Mesa " + table
          : "Escanea el QR de tu mesa para enviar un pedido."}
      </p>
      <div className="carta-heading">
        <h2 className="carta-titulo">{title}</h2>
        <Carrito
          table={table}
          items={cart}
          onQuantityChange={(key, quantity) =>
            setCart((previous) => changeQuantity(previous, key, quantity))
          }
          onRemove={(key) =>
            setCart((previous) => previous.filter((item) => item.key !== key))
          }
          onClear={() => setCart([])}
        />
      </div>
      <p className="carta-message" role="status">
        {message}
      </p>
      {loading && <p>Cargando carta…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && options.length === 0 && (
        <p>No hay bebidas disponibles.</p>
      )}
      <section className="carta-container" aria-label={title}>
        {solo && (
          <button
            type="button"
            className="mezcla-solo"
            onClick={() => elegirMezcla()}
          >
            Solo
          </button>
        )}
        {options.map((option) => (
          <button
            type="button"
            className="categoria-card"
            key={option.key}
            onClick={option.select}
          >
            {option.image && <img src={option.image} alt="" />}
            <h3>{option.name}</h3>
          </button>
        ))}
      </section>
    </div>
  );
};
