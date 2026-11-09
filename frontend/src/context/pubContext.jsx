import { createContext, useContext } from "react";
import { createPubTheme } from "./pubTheme";
import "./pubTheme.css";

const PubContext = createContext(null);

export function PubProvider({ pub, children }) {
  return (
    <PubContext.Provider value={pub}>
      {/* Las variables se limitan a este pub, incluido el diálogo del carrito. */}
      <div className="pub-theme" style={createPubTheme(pub)}>
        {children}
      </div>
    </PubContext.Provider>
  );
}

export function usePub() {
  const context = useContext(PubContext);
  if (context === null) {
    throw new Error("usePub debe utilizarse dentro de un PubProvider");
  }
  return context;
}
